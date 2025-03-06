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
  getDoc,
  limit,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Home,
  CheckSquare,
} from "lucide-react";
import { Room, Staff } from "@/lib/types";
// Importar solo las funciones de cálculo necesarias
import { calcularProgresoLimpieza } from "@/app/lib/utils/housekeeping";

interface HousekeepingStaffViewProps {
  hotelId: string;
  staffId: string;
}

interface AssignmentRoom {
  floor: number;
  roomId: string;
  roomNumber: string;
  status: string;
}

interface Assignment {
  id: string;
  staffId: string;
  rooms: AssignmentRoom[];
}

const HousekeepingStaffView = ({
  hotelId,
  staffId,
}: HousekeepingStaffViewProps) => {
  const { staff } = useAuth();
  const [assignedRooms, setAssignedRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [completedRooms, setCompletedRooms] = useState<Room[]>([]);
  const [staffData, setStaffData] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    // Obtener la asignacion mas reciente (en tiempo real)
    const assignmentsRef = collection(db, "hotels", hotelId, "assignments");
    const q = query(
      assignmentsRef,
      where("staffId", "==", staffId),
      orderBy("date", "desc"),
      limit(1) // Limit to 1 assignment document
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const assignments: Assignment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Assignment[];
      console.log("assignments", assignments);
      // If no assignment found, clear the rooms
      if (assignments.length === 0) {
        setAssignedRooms([]);
        setCompletedRooms([]);
        return;
      }

      const mostRecentAssignment = assignments[0]; // Get the most recent assignment

      // Get the room Ids
      const allAssignedRoomIds: string[] = mostRecentAssignment.rooms.map(
        (room) => room.roomId
      );
      console.log("allAssignedRoomIds", allAssignedRoomIds);

      // Fetch all the rooms at once
      const roomsPromises = allAssignedRoomIds.map((roomId) =>
        getDoc(doc(db, "hotels", hotelId, "rooms", roomId))
      );

      const roomsSnapshots = await Promise.all(roomsPromises);
      const allRooms = roomsSnapshots
        .filter((snap) => snap.exists())
        .map((snap) => ({
          id: snap.id,
          ...snap.data(),
        })) as Room[];

      console.log("allRooms", allRooms);

      // Separate rooms into pending and completed
      const pending: Room[] = allRooms.filter((foundRoom) =>
        [
          "need_cleaning",
          "cleaning_checkout",
          "cleaning_occupied",
          "cleaning_touch",
          "checkout_today",
          "occupied",
          "dirty_occupied",
        ].includes(foundRoom.status)
      );

      const completed: Room[] = allRooms.filter((foundRoom) =>
        [
          "clean_checkout",
          "clean_occupied",
          "clean_touch",
          "ready_for_inspection",
          "inspection",
          "available",
        ].includes(foundRoom.status)
      );

      console.log("pending", pending);
      console.log("completed", completed);

      setAssignedRooms(pending);
      setCompletedRooms(completed);
    });

    return () => unsubscribe();
  }, [hotelId, staffId]);
  // ... (rest of the code remains the same)
  // Obtener el color de badge según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "need_cleaning":
        return "bg-yellow-100 text-yellow-800";
      case "cleaning_checkout":
      case "cleaning_occupied":
      case "dirty_occupied":
      case "cleaning_touch":
      case "checkout_today":
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
      case "occupied":
        return "bg-gray-100 text-gray-800";
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
      case "occupied":
        return "Ocupada";
      case "checkout_today":
        return "Checkout hoy";
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

  // Calcular progreso de limpieza usando la función especializada
  const calculateProgress = (room: Room) => {
    // Usar la función calcularProgresoLimpieza importada
    return calcularProgresoLimpieza(room);
  };

  // Esta vista solo muestra las habitaciones asignadas y sus estados actuales
  // No realiza cambios de estado directamente desde aquí, ya que las camareras
  // lo hacen físicamente cuando visitan cada habitación

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

                          {/* Estado de la limpieza */}
                          <div className="flex items-center gap-2 mt-4">
                            <Badge
                              className={
                                [
                                  "cleaning_checkout",
                                  "cleaning_occupied",
                                  "cleaning_touch",
                                ].includes(room.status)
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : [
                                      "need_cleaning",
                                      "checkout_today",
                                      "occupied",
                                    ].includes(room.status)
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-green-100 text-green-800 border-green-200"
                              }
                            >
                              {[
                                "cleaning_checkout",
                                "cleaning_occupied",
                                "cleaning_touch",
                              ].includes(room.status)
                                ? "En proceso de limpieza"
                                : [
                                    "need_cleaning",
                                    "checkout_today",
                                    "occupied",
                                  ].includes(room.status)
                                ? "Pendiente de limpieza"
                                : "Limpieza completada"}
                            </Badge>
                          </div>
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ya no es necesario el diálogo de completar limpieza */}
    </div>
  );
};

export default HousekeepingStaffView;
