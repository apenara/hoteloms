'use client';

import { useState, useEffect } from 'react';
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
import { updateDoc, doc, addDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ROOM_STATES, ROLE_STATE_FLOWS, MAINTENANCE_REQUEST_TYPES } from '@/app/lib/constants/room-states';
import { Timer, Clock, Bell, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomProgressTimer } from '../hotels/RoomProgressTimer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RoomHistory } from './RoomHistory';
import RoomNotificationBadge from './roomNotificationBadge';
import { RoomHistoryTabs } from '../history/RoomHistoryTabs';

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

export function ReceptionRoomCard({ room, hotelId, currentUser }: ReceptionRoomCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isNewRequest, setIsNewRequest] = useState(false);
  const [roomUnreadNotifications, setRoomUnreadNotifications] = useState<number>(0);

  const statusInfo = ROOM_STATES[room.status] || ROOM_STATES.available;
  const allowedTransitions = ROLE_STATE_FLOWS.reception[room.status] || [];

  // Suscripción a las solicitudes de la habitación
  useEffect(() => {
    const requestsRef = collection(db, 'hotels', hotelId, 'requests');
    const requestsQuery = query(
      requestsRef,
      where('roomId', '==', room.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      setPendingRequests(requests);

      // Verificar si hay nuevas solicitudes
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          setIsNewRequest(true);
          setTimeout(() => setIsNewRequest(false), 5000);
        }
      });
    });

    return () => unsubscribe();
  }, [hotelId, room.id]);

  // Suscripción a las notificaciones de la habitación
  useEffect(() => {
    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('roomId', '==', room.id),
      where('status', '==', 'unread'),
      where('targetStaffId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const unreadNotifications = snapshot.size;
      setRoomUnreadNotifications(unreadNotifications);
    });

    return () => unsubscribe();
  }, [hotelId, room.id, currentUser.id]);

  const handleStateChange = async (newStatus: string) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const timestamp = new Date();
      const roomRef = doc(db, 'hotels', hotelId, 'rooms', room.id);

      const updateData: any = {
        status: newStatus,
        lastStatusChange: timestamp,
      };

      if (newStatus === 'checkout') {
        updateData.checkoutTime = timestamp;
        setTimeout(async () => {
          await updateDoc(roomRef, {
            lastStatusChange: new Date()
          });
        }, 1000);
      }

      await updateDoc(roomRef, updateData);

      await addDoc(collection(db, 'hotels', hotelId, 'rooms', room.id, 'history'), {
        previousStatus: room.status,
        newStatus,
        timestamp,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: 'reception'
      });
    } catch (error) {
      console.error('Error updating room status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'hotels', hotelId, 'requests', requestId);
      await updateDoc(requestRef, {
        status: 'completed',
        completedAt: new Date(),
        completedBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role
        }
      });
    } catch (error) {
      console.error('Error completing request:', error);
    }
  };

  const getEstimatedTime = () => {
    if (!room.cleaningStartTime) return null;
    const startTime = new Date(room.cleaningStartTime);
    const estimatedTime = room.estimatedCompletionTime ?
      new Date(room.estimatedCompletionTime) :
      new Date(startTime.getTime() + 30 * 60000);

    const now = new Date();
    const remainingTime = Math.max(0, estimatedTime.getTime() - now.getTime());
    const remainingMinutes = Math.ceil(remainingTime / 60000);

    return remainingMinutes;
  };

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
              className={`bg-red-500 hover:bg-red-600 cursor-pointer ${isNewRequest ? 'animate-bounce' : ''
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
        className={`relative cursor-pointer transition-all hover:shadow-lg ${statusInfo.color} ${pendingRequests.length > 0 ? 'ring-2 ring-red-500 ring-opacity-50' : ''
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

            {(room.status.includes('cleaning_') || room.status === 'need_cleaning') && (
              <div className="mt-2">
                <RoomProgressTimer
                  startTime={room.cleaningStartTime || room.lastStatusChange}
                  expectedDuration={
                    room.status === 'cleaning_checkout' ? 45 : // Checkout toma más tiempo
                      room.status === 'cleaning_occupied' ? 30 : // Limpieza normal
                        room.status === 'cleaning_touch' ? 15 : // Retoque rápido
                          30 // Tiempo por defecto
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
                <div>
                  <p className="text-sm text-gray-500">Última Limpieza</p>
                  <p className="font-medium">
                    {room.lastCleaned ?
                      new Date(room.lastCleaned).toLocaleString() :
                      'No disponible'}
                  </p>
                </div>
                {room.cleaningStartTime && (
                  <div>
                    <p className="text-sm text-gray-500">Tiempo Estimado</p>
                    <p className="font-medium">
                      {getEstimatedTime() ?
                        `${getEstimatedTime()} minutos restantes` :
                        'Completado'}
                    </p>
                  </div>
                )}
                {(room.status.includes('cleaning_') || room.status === 'need_cleaning') && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Progreso de Limpieza</p>
                    <RoomProgressTimer
                      startTime={room.cleaningStartTime || room.lastStatusChange}
                      expectedDuration={
                        room.status === 'cleaning_checkout' ? 45 :
                          room.status === 'cleaning_occupied' ? 30 :
                            room.status === 'cleaning_touch' ? 15 :
                              30
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
                    {request.type === 'maintenance' ?
                      MAINTENANCE_REQUEST_TYPES[request.maintenanceType]?.label :
                      (request.type === 'guest_request' ? 'Mensaje del huésped' : request.type)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {request.message || request.description}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {request.createdAt ? formatDistanceToNow(
                      typeof request.createdAt === 'object' && 'toDate' in request.createdAt ?
                        request.createdAt.toDate() :
                        request.createdAt,
                      { addSuffix: true, locale: es }
                    ) : 'Fecha no disponible'}
                  </div>
                  {request.type === 'maintenance' && (
                    <div className="text-xs text-gray-500 mt-1">
                      <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
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
    </div>
  );
}
