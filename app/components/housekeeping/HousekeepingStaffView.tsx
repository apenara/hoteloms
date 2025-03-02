import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Home,
  Loader2,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { Room, Staff } from "@/lib/types";

interface HousekeepingStaffViewProps {
  hotelId: string;
  staffId: string;
}

const HousekeepingStaffView = ({
  hotelId,
  staffId,
}: HousekeepingStaffViewProps) => {
  const { staff } = useAuth();
  const [assignedRooms, setAssignedRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [completedRooms, setCompletedRooms] = useState<Room[]>([]);
  const [staffData, setStaffData] = useState<Staff | null>(null);

  // Obtener los datos del personal y habitaciones asignadas
  useEffect(() => {
    if (!hotelId || !staffId) return;

    // Obtener los datos del personal
    const fetchStaff = async () => {
      try {
        const staffDoc = await getDoc(
          doc(db, "hotels", hotelId, "staff", staffId)
        );
        if (staffDoc.exists()) {
          setStaffData({ id: staffDoc.id, ...staffDoc.data() } as Staff);
        }
      } catch (error) {
        console.error("Error al obtener datos del personal:", error);
      }
    };

    fetchStaff();

    // Obtener las habitaciones asignadas (en tiempo real)
    const roomsRef = collection(db, "hotels", hotelId, "rooms");
    const q = query(
      roomsRef,
      where("assignedTo", "==", staffId),
      orderBy("lastStatusChange", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      // Filtrar habitaciones pendientes y completadas
      const pending = rooms.filter((room) =>
        [
          "need_cleaning",
          "cleaning_checkout",
          "cleaning_occupied",
          "cleaning_touch",
        ].includes(room.status)
      );

      const completed = rooms.filter((room) =>
        [
          "clean_checkout",
          "clean_occupied",
          "clean_touch",
          "ready_for_inspection",
          "inspection",
          "available",
        ].includes(room.status)
      );

      setAssignedRooms(pending);
      setCompletedRooms(completed);
    });

    return () => unsubscribe();
  }, [hotelId, staffId]);

  // Iniciar la limpieza de una habitación
  const handleStartCleaning = async (room: Room) => {
    try {
      setLoading(true);

      // Determinar el nuevo estado basado en el estado actual
      let newStatus = "cleaning_occupied";
      if (room.status === "need_cleaning" && room.lastState === "checkout") {
        newStatus = "cleaning_checkout";
      } else if (
        room.status === "need_cleaning" &&
        room.lastState === "touch"
      ) {
        newStatus = "cleaning_touch";
      }

      // Actualizar estado en Firestore
      const roomRef = doc(db, "hotels", hotelId, "rooms", room.id);
      await updateDoc(roomRef, {
        status: newStatus,
        lastStatusChange: Timestamp.now(),
        currentCleaning: {
          startedAt: Timestamp.now(),
          staffId: staffId,
          staffName: staff?.name || staffData?.name,
        },
      });

      // Registrar inicio de limpieza en historial
      const historyRef = collection(
        db,
        "hotels",
        hotelId,
        "rooms",
        room.id,
        "history"
      );
      await addDoc(historyRef, {
        type: "cleaning_started",
        timestamp: Timestamp.now(),
        staffId: staffId,
        staffName: staff?.name || staffData?.name,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error al iniciar limpieza:", error);
      setError("Error al iniciar el proceso de limpieza");
    } finally {
      setLoading(false);
    }
  };

  // Completar la limpieza de una habitación
  const handleCompleteCleaning = async () => {
    if (!selectedRoom || !completionNotes.trim()) return;

    setLoading(true);
    setError("");

    try {
      const timestamp = Timestamp.now();

      // Determinar el estado final basado en el estado actual
      let finalStatus = "clean_occupied";
      if (selectedRoom.status === "cleaning_checkout") {
        finalStatus = "clean_checkout";
      } else if (selectedRoom.status === "cleaning_touch") {
        finalStatus = "clean_touch";
      }

      // Calcular el tiempo de limpieza en minutos
      const startTime =
        selectedRoom.currentCleaning?.startedAt.toDate() || new Date();
      const endTime = new Date();
      const cleaningTimeMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

      // Actualizar estado de la habitación
      const roomRef = doc(db, "hotels", hotelId, "rooms", selectedRoom.id);
      await updateDoc(roomRef, {
        status: finalStatus,
        lastStatusChange: timestamp,
        lastCleaned: timestamp,
        currentCleaning: {
          ...selectedRoom.currentCleaning,
          endedAt: timestamp,
          notes: completionNotes,
          tiempoLimpieza: cleaningTimeMinutes,
        },
      });

      // Registrar en historial
      const historyRef = collection(
        db,
        "hotels",
        hotelId,
        "rooms",
        selectedRoom.id,
        "history"
      );
      await addDoc(historyRef, {
        type: "cleaning_completed",
        timestamp,
        staffId: staffId,
        staffName: staff?.name || staffData?.name,
        notes: completionNotes,
        status: finalStatus,
        tiempoLimpieza: cleaningTimeMinutes,
      });

      // Registrar en cleaning_records para estadísticas
      const cleaningRecordsRef = collection(
        db,
        "hotels",
        hotelId,
        "cleaning_records"
      );
      await addDoc(cleaningRecordsRef, {
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.number,
        staffId: staffId,
        staffName: staff?.name || staffData?.name,
        startTime: selectedRoom.currentCleaning?.startedAt || timestamp,
        endTime: timestamp,
        tiempoTotal: cleaningTimeMinutes,
        tipoLimpieza: selectedRoom.status,
        status: "completed",
        notas: completionNotes,
      });

      // Limpiar selección y notas
      setShowDialog(false);
      setCompletionNotes("");
      setSelectedRoom(null);
    } catch (error) {
      console.error("Error al completar limpieza:", error);
      setError("Error al completar la limpieza");
    } finally {
      setLoading(false);
    }
  };

  // Obtener el color de badge según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "need_cleaning":
        return "bg-yellow-100 text-yellow-800";
      case "cleaning_checkout":
      case "cleaning_occupied":
      case "cleaning_touch":
        return "bg-blue-100 text-blue-800";
      case "clean_checkout":
      case "clean_occupied":
      case "clean_touch":
        return "bg-green-100 text-green-800";
      case "ready_for_inspection":
        return "bg-purple-100 text-purple-800";
      case "inspection":
        return "bg-indigo-100 text-indigo-800";
      case "available":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Obtener etiqueta legible del estado
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "need_cleaning":
        return "Pendiente de limpieza";
      case "cleaning_checkout":
        return "Limpiando (checkout)";
      case "cleaning_occupied":
        return "Limpiando (ocupada)";
      case "cleaning_touch":
        return "Limpiando (retoque)";
      case "clean_checkout":
        return "Limpia (checkout)";
      case "clean_occupied":
        return "Limpia (ocupada)";
      case "clean_touch":
        return "Limpia (retoque)";
      case "ready_for_inspection":
        return "Lista para inspección";
      case "inspection":
        return "En inspección";
      case "available":
        return "Disponible";
      default:
        return status;
    }
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return "No especificada";
    return new Date(timestamp.seconds * 1000).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Calcular progreso de limpieza
  const calculateProgress = (room: Room) => {
    if (!room.currentCleaning?.startedAt) return 0;

    const startTime = room.currentCleaning.startedAt.toDate();
    const now = new Date();
    const elapsedMinutes = Math.floor(
      (now.getTime() - startTime.getTime()) / (1000 * 60)
    );

    // Tiempos esperados según tipo de limpieza
    let expectedTime = 30; // minutos
    if (room.status === "cleaning_checkout") expectedTime = 45;
    if (room.status === "cleaning_occupied") expectedTime = 30;
    if (room.status === "cleaning_touch") expectedTime = 15;

    return Math.min(100, (elapsedMinutes / expectedTime) * 100);
  };

  // Obtener el tiempo transcurrido en formato legible
  const getElapsedTime = (timestamp) => {
    if (!timestamp) return "";

    const start = timestamp.toDate();
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60)
    );

    return `${diffMinutes} min`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pending" className="text-base">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Pendientes ({assignedRooms.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-base">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completadas ({completedRooms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Habitaciones Asignadas Pendientes
              </CardTitle>
              <CardDescription>
                Habitaciones que requieren limpieza asignadas a ti
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {assignedRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tienes habitaciones pendientes asignadas
                  </div>
                ) : (
                  assignedRooms.map((room) => (
                    <div
                      key={room.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-gray-500" />
                              <h3 className="font-medium">
                                Habitación {room.number}{" "}
                                {room.floor && `- Piso ${room.floor}`}
                              </h3>
                              <Badge className={getStatusColor(room.status)}>
                                {getStatusLabel(room.status)}
                              </Badge>
                            </div>
                            {room.type && (
                              <Badge variant="outline">{room.type}</Badge>
                            )}
                          </div>

                          {[
                            "cleaning_checkout",
                            "cleaning_occupied",
                            "cleaning_touch",
                          ].includes(room.status) && (
                            <div className="mt-2">
                              <div className="flex justify-between items-center mb-1 text-sm">
                                <span>Progreso</span>
                                {room.currentCleaning?.startedAt && (
                                  <Badge variant="outline">
                                    {getElapsedTime(
                                      room.currentCleaning.startedAt
                                    )}
                                  </Badge>
                                )}
                              </div>
                              <Progress
                                value={calculateProgress(room)}
                                className="h-2"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Actualización: {formatDate(room.lastStatusChange)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {["need_cleaning"].includes(room.status) ? (
                            <Button
                              size="sm"
                              onClick={() => handleStartCleaning(room)}
                              disabled={loading}
                              className="flex items-center gap-1"
                            >
                              <Clock className="h-4 w-4" />
                              Iniciar Limpieza
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRoom(room);
                                setShowDialog(true);
                              }}
                              disabled={loading}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Completar Limpieza
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                Habitaciones Completadas
              </CardTitle>
              <CardDescription>
                Habitaciones que has terminado de limpiar hoy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No has completado habitaciones todavía
                  </div>
                ) : (
                  completedRooms.map((room) => (
                    <div
                      key={room.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-green-500" />
                            <h3 className="font-medium">
                              Habitación {room.number}{" "}
                              {room.floor && `- Piso ${room.floor}`}
                            </h3>
                          </div>
                          <Badge className={getStatusColor(room.status)}>
                            {getStatusLabel(room.status)}
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-500 flex items-center justify-between mt-1">
                          <span>
                            Completada:{" "}
                            {formatDate(
                              room.lastCleaned || room.lastStatusChange
                            )}
                          </span>
                          {room.currentCleaning?.tiempoLimpieza && (
                            <Badge variant="outline" className="bg-blue-50">
                              {room.currentCleaning.tiempoLimpieza} minutos
                            </Badge>
                          )}
                        </div>

                        {room.currentCleaning?.notes && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                            <p className="text-gray-600">
                              {room.currentCleaning.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-center border-t pt-4">
              <div className="text-center text-sm text-gray-500">
                Has completado {completedRooms.length} habitaciones hoy.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para completar limpieza */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Limpieza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRoom && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-medium flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Habitación {selectedRoom.number}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedRoom.status === "cleaning_checkout"
                    ? "Limpieza de checkout"
                    : selectedRoom.status === "cleaning_occupied"
                    ? "Limpieza de habitación ocupada"
                    : selectedRoom.status === "cleaning_touch"
                    ? "Retoque de habitación"
                    : "Limpieza general"}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">
                Notas de limpieza (opcional)
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe cualquier detalle importante sobre la limpieza realizada..."
                className="mt-1"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setCompletionNotes("");
                  setSelectedRoom(null);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCompleteCleaning}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completando...
                  </>
                ) : (
                  "Marcar como Completada"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HousekeepingStaffView;
