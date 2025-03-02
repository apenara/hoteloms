"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
import {
  updateDoc,
  doc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  ROOM_STATES,
  ROLE_STATE_FLOWS,
  MAINTENANCE_REQUEST_TYPES,
} from "@/app/lib/constants/room-states";
import { Timer, Clock, Bell, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { RoomProgressTimer } from "../hotels/RoomProgressTimer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { RoomHistory } from "./RoomHistory";
import RoomNotificationBadge from "./roomNotificationBadge";
import { RoomHistoryTabs } from "../history/RoomHistoryTabs";

interface ReceptionRoomCardProps {
  room: {
    id: string;
    number: string;
    status: string;
    type: string;
    floor: number;
    lastCleaned?: Date;
    cleaningStartTime?: Date;
    estimatedCompletionTime?: Date;
  };
  hotelId: string;
  currentUser: any;
}

export function ReceptionRoomCard({
  room,
  hotelId,
  currentUser,
}: ReceptionRoomCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isNewRequest, setIsNewRequest] = useState(false);
  const [roomUnreadNotifications, setRoomUnreadNotifications] =
    useState<number>(0);

  const statusInfo = ROOM_STATES[room.status] || ROOM_STATES.available;
  const allowedTransitions = ROLE_STATE_FLOWS.reception[room.status] || [];

  // Suscripción a las solicitudes de la habitación
  useEffect(() => {
    const requestsRef = collection(db, "hotels", hotelId, "requests");
    const requestsQuery = query(
      requestsRef,
      where("roomId", "==", room.id),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      setPendingRequests(requests);

      // Verificar si hay nuevas solicitudes
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          setIsNewRequest(true);
          setTimeout(() => setIsNewRequest(false), 5000);
        }
      });
    });

    return () => unsubscribe();
  }, [hotelId, room.id]);

  // Suscripción a las notificaciones de la habitación
  useEffect(() => {
    const notificationsRef = collection(db, "hotels", hotelId, "notifications");
    const notificationsQuery = query(
      notificationsRef,
      where("roomId", "==", room.id),
      where("status", "==", "unread"),
      where("targetStaffId", "==", currentUser.id)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const unreadNotifications = snapshot.size;
      setRoomUnreadNotifications(unreadNotifications);
    });

    return () => unsubscribe();
  }, [hotelId, room.id, currentUser.id]);

  // Usaremos un modal sencillo y personalizado que evite los problemas de foco
  const [newStatus, setNewStatus] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modifyingCheckout, setModifyingCheckout] = useState(false);
  const [modifyReason, setModifyReason] = useState("");

  // Referencias para manejar el modal de forma más controlada
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Estado para el motivo de checkout anticipado
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("");

  const handleStateChange = async (status: string) => {
    if (isLoading) return;

    // Si el nuevo estado es "occupied", mostrar el modal personalizado
    if (status === "occupied") {
      setNewStatus(status);
      // Inicializar con mañana como fecha mínima
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCheckoutDate(tomorrow.toISOString().split("T")[0]);
      setShowModal(true);
      return;
    }

    // Si es checkout y la habitación tiene fecha de checkout futura, preguntar motivo
    if (status === "checkout" && room.checkoutDate) {
      const checkoutDate = convertFirestoreTimestamp(room.checkoutDate);
      const today = new Date();

      // Resetear horas para comparar solo las fechas
      checkoutDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      // Si el checkout es antes de la fecha programada
      if (checkoutDate.getTime() > today.getTime()) {
        setNewStatus(status);
        setShowEarlyCheckoutModal(true);
        return;
      }
    }

    // Para otros estados, proceder normalmente
    await updateRoomState(status);
  };

  // Función para confirmar la selección de fecha
  const confirmDateSelection = () => {
    let checkoutDateValue = null;

    if (checkoutDate) {
      try {
        checkoutDateValue = new Date(checkoutDate);
        if (isNaN(checkoutDateValue.getTime())) {
          alert("Por favor seleccione una fecha válida");
          return;
        }
      } catch (e) {
        alert("Error al procesar la fecha");
        return;
      }
    }

    // Cerrar modal y actualizar estado
    setShowModal(false);

    if (modifyingCheckout) {
      // Si estamos modificando una fecha de checkout existente
      updateCheckoutDate(checkoutDateValue, modifyReason);
      setModifyingCheckout(false);
      setModifyReason("");
    } else {
      // Si estamos configurando una fecha inicial al ocupar la habitación
      updateRoomState(newStatus, checkoutDateValue);
    }
  };

  // Función para cancelar la selección
  const cancelDateSelection = () => {
    setShowModal(false);
    setModifyingCheckout(false);
    setModifyReason("");
  };

  // Función específica para actualizar la fecha de checkout
  const updateCheckoutDate = async (newDate: Date, reason: string) => {
    if (!newDate) return;

    setIsLoading(true);
    try {
      const timestamp = new Date();
      const roomRef = doc(db, "hotels", hotelId, "rooms", room.id);

      // Guardar la fecha antigua para el historial
      const oldDate = room.checkoutDate
        ? convertFirestoreTimestamp(room.checkoutDate)
        : null;

      // Actualizar datos
      await updateDoc(roomRef, {
        checkoutDate: newDate,
        lastModified: timestamp,
      });

      // Actualizar localmente para reflejar cambios inmediatamente
      room.checkoutDate = newDate;

      // Registrar en historial la modificación de fecha
      await addDoc(
        collection(db, "hotels", hotelId, "rooms", room.id, "history"),
        {
          action: "checkout_date_modified",
          previousDate: oldDate,
          newDate: newDate,
          reason: reason || "Sin motivo especificado",
          timestamp,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: "reception",
        }
      );
    } catch (error) {
      console.error("Error updating checkout date:", error);
      alert("Error al actualizar la fecha de checkout");
    } finally {
      setIsLoading(false);
    }
  };

  // Effect para manejar el foco cuando el modal está abierto
  useEffect(() => {
    if (showModal && inputRef.current) {
      // Pequeño delay para asegurar que el DOM está listo
      setTimeout(() => {
        inputRef.current.focus();
      }, 50);
    }
  }, [showModal]);

  const updateRoomState = async (
    status: string,
    checkoutDateValue: Date | null = null,
    earlyCheckoutReason: string = null
  ) => {
    setIsLoading(true);
    try {
      const timestamp = new Date();
      const roomRef = doc(db, "hotels", hotelId, "rooms", room.id);

      const updateData: any = {
        status: status,
        lastStatusChange: timestamp,
      };

      // Si cambiamos a occupado y tenemos fecha de checkout
      if (status === "occupied" && checkoutDateValue) {
        // Guardar como timestamp de Firestore para consistencia
        updateData.checkoutDate = checkoutDateValue;

        // Guardar información de check-in para cálculo de noches
        updateData.checkInDate = timestamp;

        // Actualizar localmente también para evitar espera
        room.checkoutDate = checkoutDateValue;
        room.checkInDate = timestamp;
      }

      // Si cambiamos a checkout, registrar tiempo de checkout
      if (status === "checkout") {
        updateData.checkoutTime = timestamp;

        // Guardar motivo de checkout anticipado si existe
        if (earlyCheckoutReason) {
          updateData.earlyCheckoutReason = earlyCheckoutReason;
        }

        // Eliminar la fecha programada de checkout si existe
        updateData.checkoutDate = null;

        // Actualizar localmente
        room.checkoutDate = null;

        setTimeout(async () => {
          await updateDoc(roomRef, {
            lastStatusChange: new Date(),
          });
        }, 1000);
      }

      // Si cambiamos a checkout_today, también registrar tiempo
      if (status === "checkout_today") {
        updateData.checkoutTime = timestamp;
      }

      await updateDoc(roomRef, updateData);

      // Añadir registro en historial
      const historyData: any = {
        previousStatus: room.status,
        newStatus: status,
        timestamp,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: "reception",
        checkoutDate: checkoutDateValue || null,
      };

      // Añadir motivo de checkout anticipado al historial si existe
      if (earlyCheckoutReason) {
        historyData.earlyCheckoutReason = earlyCheckoutReason;
      }

      await addDoc(
        collection(db, "hotels", hotelId, "rooms", room.id, "history"),
        historyData
      );

      // Actualizar estado local para reflejar cambios inmediatamente
      room.status = status;
    } catch (error) {
      console.error("Error updating room status:", error);
    } finally {
      setIsLoading(false);
      // No necesitamos cerrar el diálogo aquí, ya lo cerramos antes de llamar a esta función
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, "hotels", hotelId, "requests", requestId);
      await updateDoc(requestRef, {
        status: "completed",
        completedAt: new Date(),
        completedBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
      });
    } catch (error) {
      console.error("Error completing request:", error);
    }
  };

  const getEstimatedTime = () => {
    if (!room.cleaningStartTime) return null;
    const startTime = new Date(room.cleaningStartTime);
    const estimatedTime = room.estimatedCompletionTime
      ? new Date(room.estimatedCompletionTime)
      : new Date(startTime.getTime() + 30 * 60000);

    const now = new Date();
    const remainingTime = Math.max(0, estimatedTime.getTime() - now.getTime());
    const remainingMinutes = Math.ceil(remainingTime / 60000);

    return remainingMinutes;
  };

  // Función para convertir Timestamp de Firestore a Date
  const convertFirestoreTimestamp = (timestamp) => {
    // Si es un objeto Timestamp de Firestore con seconds
    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }

    // Si es una fecha JS o string de fecha
    return new Date(timestamp);
  };

  // Función para calcular las noches pendientes y dar formato
  const calculateNights = (room) => {
    try {
      // Verificar que tenemos datos de fechas válidos
      if (!room.checkoutDate || !room.checkInDate) {
        return <div className="text-gray-600">Estadía sin fecha definida</div>;
      }

      // Convertir fechas a objeto Date manejando Timestamps de Firestore
      let checkIn, checkOut;

      try {
        // Usar la función específica para convertir timestamp
        checkIn = convertFirestoreTimestamp(room.checkInDate);
        checkOut = convertFirestoreTimestamp(room.checkoutDate);

        // Verificar que son fechas válidas
        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
          console.error(
            "Fechas inválidas después de conversión:",
            checkIn,
            checkOut
          );
          return <div className="text-gray-600">Error en fecha</div>;
        }
      } catch (e) {
        console.error("Error al convertir fechas:", e);
        return <div className="text-gray-600">Error en fecha</div>;
      }

      // Reset para ignorar la hora y solo contar días
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      // Calcular diferencia en días - las noches son siempre un día menos que los días
      const diffTime = checkOut.getTime() - checkIn.getTime();
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Las noches son los días menos 1, mínimo 1 noche
      const totalNights = Math.max(1, totalDays);

      // Calcular noches restantes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const remainingTime = checkOut.getTime() - today.getTime();
      const remainingDays = Math.max(
        0,
        Math.ceil(remainingTime / (1000 * 60 * 60 * 24))
      );
      // Las noches restantes son los días restantes, mínimo 0
      const remainingNights = Math.max(0, remainingDays);

      return (
        <div className="text-gray-600">
          {remainingNights === 0 ? (
            <span className="text-red-600 font-semibold">Último día</span>
          ) : remainingNights === 1 ? (
            <span className="text-orange-600 font-semibold">
              Checkout mañana - {totalNights}{" "}
              {totalNights === 1 ? "noche" : "noches"} total
            </span>
          ) : (
            <span>
              {remainingNights} noches restantes de {totalNights}
            </span>
          )}
        </div>
      );
    } catch (error) {
      console.error("Error al calcular noches:", error);
      return <div className="text-gray-600">Error en cálculo</div>;
    }
  };

  // Efecto para verificar automáticamente las habitaciones con checkout programado para hoy
  useEffect(() => {
    try {
      if (room.status === "occupied" && room.checkoutDate) {
        // Intentar convertir a fecha válida usando nuestra función especial para Timestamp
        const checkoutDate = convertFirestoreTimestamp(room.checkoutDate);

        // Verificar que es una fecha válida
        if (isNaN(checkoutDate.getTime())) {
          console.error(
            "Fecha de checkout inválida después de conversión:",
            checkoutDate
          );
          return;
        }

        const today = new Date();

        // Resetear horas para comparar solo las fechas
        checkoutDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        // Si es el día de checkout y no está ya marcada como checkout_today
        if (checkoutDate.getTime() === today.getTime()) {
          console.log("Es día de checkout para habitación:", room.number);
          updateRoomState("checkout_today");
        }
      }
    } catch (error) {
      console.error("Error verificando fecha de checkout:", error);
    }
  }, [room.status, room.checkoutDate]);

  return (
    <div className="relative">
      {/* Indicador de notificación */}
      <RoomNotificationBadge isVisible={roomUnreadNotifications > 0} />
      <AnimatePresence>
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <Badge
              className={`bg-red-500 hover:bg-red-600 cursor-pointer ${
                isNewRequest ? "animate-bounce" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowRequestsDialog(true);
              }}
            >
              {pendingRequests.length}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      <Card
        className={`relative cursor-pointer transition-all hover:shadow-lg ${
          statusInfo.color
        } ${
          pendingRequests.length > 0
            ? "ring-2 ring-red-500 ring-opacity-50"
            : ""
        }`}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <span className="text-lg font-bold">{room.number}</span>
            <statusInfo.icon className="h-5 w-5" />
          </div>

          <div className="space-y-2">
            <Badge variant="secondary" className="w-full justify-center">
              {statusInfo.label}
            </Badge>

            {/* Mostrar información de check-out cuando la habitación está ocupada */}
            {room.status === "occupied" && room.checkoutDate && (
              <div className="mt-1 text-xs text-center">
                <div className="font-medium text-blue-600 flex items-center justify-center">
                  <span>
                    Checkout:{" "}
                    {(() => {
                      try {
                        // Usar nuestra función para convertir Timestamp
                        const date = convertFirestoreTimestamp(
                          room.checkoutDate
                        );
                        return isNaN(date.getTime())
                          ? "Fecha pendiente"
                          : date.toLocaleDateString();
                      } catch (e) {
                        console.error("Error mostrando fecha:", e);
                        return "Fecha inválida";
                      }
                    })()}
                  </span>
                  <button
                    className="ml-1 text-gray-500 hover:text-blue-700"
                    title="Modificar fecha de checkout"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Establecer la fecha actual en el formulario
                      try {
                        const date = convertFirestoreTimestamp(
                          room.checkoutDate
                        );
                        setCheckoutDate(date.toISOString().split("T")[0]);
                      } catch (e) {
                        // Si hay error, establecer con fecha de mañana
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setCheckoutDate(tomorrow.toISOString().split("T")[0]);
                      }
                      setModifyingCheckout(true);
                      setShowModal(true);
                    }}
                  >
                    ✏️
                  </button>
                </div>
                {calculateNights(room)}
              </div>
            )}

            {/* Mostrar alerta cuando es checkout today */}
            {room.status === "checkout_today" && (
              <div className="mt-1 text-xs text-center">
                <div className="font-medium text-red-600">¡Check-out hoy!</div>
              </div>
            )}

            {(room.status.includes("cleaning_") ||
              room.status === "need_cleaning") && (
              <div className="mt-2">
                <RoomProgressTimer
                  startTime={room.cleaningStartTime || room.lastStatusChange}
                  expectedDuration={
                    room.status === "cleaning_checkout"
                      ? 45 // Checkout toma más tiempo
                      : room.status === "cleaning_occupied"
                      ? 30 // Limpieza normal
                      : room.status === "cleaning_touch"
                      ? 15 // Retoque rápido
                      : 30 // Tiempo por defecto
                  }
                  status={room.status}
                />
              </div>
            )}

            {allowedTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={isLoading}
                  >
                    Cambiar Estado
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {allowedTransitions.map((state) => (
                    <DropdownMenuItem
                      key={state}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStateChange(state);
                      }}
                    >
                      {ROOM_STATES[state].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Habitación {room.number}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList>
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <p className="font-medium">{statusInfo.label}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{room.type}</p>
                </div>

                {/* Mostrar fechas de check-in y check-out si están disponibles */}
                {room.checkInDate && (
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-medium">
                      {(() => {
                        try {
                          // Usar función para convertir Timestamp
                          const date = convertFirestoreTimestamp(
                            room.checkInDate
                          );
                          return isNaN(date.getTime())
                            ? "Fecha no disponible"
                            : date.toLocaleDateString();
                        } catch (e) {
                          return "Fecha no disponible";
                        }
                      })()}
                    </p>
                  </div>
                )}

                {room.checkoutDate && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Check-out Programado
                    </p>
                    <p className="font-medium">
                      {(() => {
                        try {
                          // Usar función para convertir Timestamp
                          const date = convertFirestoreTimestamp(
                            room.checkoutDate
                          );
                          return isNaN(date.getTime())
                            ? "Fecha no disponible"
                            : date.toLocaleDateString();
                        } catch (e) {
                          return "Fecha no disponible";
                        }
                      })()}
                    </p>
                  </div>
                )}

                {/* Mostrar información de noches si aplica */}
                {room.status === "occupied" &&
                  room.checkoutDate &&
                  room.checkInDate && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Estancia</p>
                      <div className="font-medium flex items-center justify-between">
                        <span>{calculateNights(room)}</span>
                        {new Date(room.checkoutDate).toDateString() ===
                          new Date().toDateString() && (
                          <Badge variant="destructive">Check-out Hoy</Badge>
                        )}
                      </div>
                    </div>
                  )}

                <div>
                  <p className="text-sm text-gray-500">Última Limpieza</p>
                  <p className="font-medium">
                    {room.lastCleaned
                      ? new Date(room.lastCleaned).toLocaleString()
                      : "No disponible"}
                  </p>
                </div>

                {room.cleaningStartTime && (
                  <div>
                    <p className="text-sm text-gray-500">Tiempo Estimado</p>
                    <p className="font-medium">
                      {getEstimatedTime()
                        ? `${getEstimatedTime()} minutos restantes`
                        : "Completado"}
                    </p>
                  </div>
                )}
                {(room.status.includes("cleaning_") ||
                  room.status === "need_cleaning") && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">
                      Progreso de Limpieza
                    </p>
                    <RoomProgressTimer
                      startTime={
                        room.cleaningStartTime || room.lastStatusChange
                      }
                      expectedDuration={
                        room.status === "cleaning_checkout"
                          ? 45
                          : room.status === "cleaning_occupied"
                          ? 30
                          : room.status === "cleaning_touch"
                          ? 15
                          : 30
                      }
                      status={room.status}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <RoomHistoryTabs roomId={room.id} hotelId={hotelId} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de solicitudes */}
      <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitudes - Habitación {room.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <MessageSquare className="h-5 w-5 mt-1 text-gray-500" />
                <div className="flex-1">
                  <div className="font-medium">
                    {request.type === "maintenance"
                      ? MAINTENANCE_REQUEST_TYPES[request.maintenanceType]
                          ?.label
                      : request.type === "guest_request"
                      ? "Mensaje del huésped"
                      : request.type}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {request.message || request.description}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {request.createdAt
                      ? formatDistanceToNow(
                          typeof request.createdAt === "object" &&
                            "toDate" in request.createdAt
                            ? request.createdAt.toDate()
                            : request.createdAt,
                          { addSuffix: true, locale: es }
                        )
                      : "Fecha no disponible"}
                  </div>
                  {request.type === "maintenance" && (
                    <div className="text-xs text-gray-500 mt-1">
                      <Badge
                        variant={
                          request.priority === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {request.priority}
                      </Badge>
                      {request.requiresBlocking && (
                        <Badge variant="outline" className="ml-2">
                          Bloqueo requerido
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompleteRequest(request.id)}
                >
                  Completar
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal personalizado para seleccionar la fecha de checkout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              {modifyingCheckout
                ? `Modificar fecha de Check-out - Habitación ${room.number}`
                : `Fecha de Check-out - Habitación ${room.number}`}
            </h3>

            <div className="mb-4">
              <p className="mb-2 text-gray-700">
                {modifyingCheckout
                  ? "Por favor, seleccione la nueva fecha de checkout:"
                  : "Al cambiar esta habitación a Ocupada, debe asignar una fecha de salida programada."}
              </p>

              <label
                htmlFor="checkout-date-modal"
                className="block text-sm font-medium mb-2"
              >
                {modifyingCheckout
                  ? "Nueva fecha de salida"
                  : "Seleccione fecha de salida"}
              </label>

              <input
                id="checkout-date-modal"
                ref={inputRef}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
                min={(() => {
                  // No permitir seleccionar el día actual, mínimo el día siguiente
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toISOString().split("T")[0];
                })()}
                required
              />

              {modifyingCheckout && (
                <div className="mt-4">
                  <label
                    htmlFor="modify-reason"
                    className="block text-sm font-medium mb-2"
                  >
                    Motivo del cambio de fecha (requerido)
                  </label>
                  <textarea
                    id="modify-reason"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={modifyReason}
                    onChange={(e) => setModifyReason(e.target.value)}
                    placeholder="Indique el motivo por el que se cambia la fecha de salida..."
                    required
                  />
                </div>
              )}

              <p className="mt-2 text-sm text-gray-500">
                {modifyingCheckout
                  ? "El cambio quedará registrado en el historial de la habitación."
                  : "La fecha debe ser al menos un día después del check-in."}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  cancelDateSelection();
                  setCheckoutDate(""); // Limpiar estado
                }}
              >
                Cancelar
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  // Si estamos modificando, verificar que haya motivo
                  if (modifyingCheckout && !modifyReason.trim()) {
                    alert("Por favor indique el motivo del cambio de fecha");
                    return;
                  }
                  confirmDateSelection();
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para checkout anticipado */}
      {showEarlyCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              Checkout Anticipado - Habitación {room.number}
            </h3>

            <div className="mb-4">
              <p className="mb-2 text-gray-700">
                Esta habitación tiene fecha de salida programada para el{" "}
                <strong>
                  {convertFirestoreTimestamp(
                    room.checkoutDate
                  ).toLocaleDateString()}
                </strong>
                . Por favor indique el motivo del checkout anticipado:
              </p>

              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={earlyCheckoutReason}
                onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                placeholder="Indique el motivo del checkout anticipado..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setShowEarlyCheckoutModal(false);
                  setEarlyCheckoutReason("");
                }}
              >
                Cancelar
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  if (!earlyCheckoutReason.trim()) {
                    alert(
                      "Por favor indique el motivo del checkout anticipado"
                    );
                    return;
                  }

                  setShowEarlyCheckoutModal(false);
                  updateRoomState(newStatus, null, earlyCheckoutReason);
                  setEarlyCheckoutReason("");
                }}
              >
                Confirmar Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
