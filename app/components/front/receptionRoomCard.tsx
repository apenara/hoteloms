'use client';

import { useState } from 'react';
import { Badge } from "@/app/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/app/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
//importaciones de firebas
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Importaciones de constantes y tipos
import { ROOM_STATES, ROLE_STATE_FLOWS } from '@/app/lib/constants/room-states';
import { Timer, Clock } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';

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
    const [isLoading, setIsLoading] = useState(false);
  
    const statusInfo = ROOM_STATES[room.status] || ROOM_STATES.available;
    const allowedTransitions = ROLE_STATE_FLOWS.reception[room.status] || [];

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

      // Lógica específica según el estado
      if (newStatus === 'checkout') {
        updateData.checkoutTime = timestamp;
        // Auto transición a need_cleaning después de checkout
        setTimeout(async () => {
          await updateDoc(roomRef, {
            // status: 'need_cleaning',
            lastStatusChange: new Date()
          });
        }, 1000);
      }

      // Actualizar estado
      await updateDoc(roomRef, updateData);

      // Registrar en historial
      await addDoc(collection(db, 'hotels', hotelId, 'rooms', room.id, 'history'), {
        previousStatus: room.status,
        newStatus,
        timestamp,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: 'reception'
      });

      // Si es un estado prioritario, crear notificación
      if (newStatus === 'in_house' || newStatus === 'checkout') {
        await addDoc(collection(db, 'hotels', hotelId, 'notifications'), {
          type: 'status_change',
          roomId: room.id,
          roomNumber: room.number,
          status: newStatus,
          timestamp,
          priority: newStatus === 'in_house' ? 'high' : 'normal',
          targetRole: 'housekeeping',
          read: false
        });
      }

    } catch (error) {
      console.error('Error updating room status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular tiempo estimado de limpieza
  const getEstimatedTime = () => {
    if (!room.cleaningStartTime) return null;
    const startTime = new Date(room.cleaningStartTime);
    const estimatedTime = room.estimatedCompletionTime ? 
      new Date(room.estimatedCompletionTime) : 
      new Date(startTime.getTime() + 30 * 60000); // 30 minutos por defecto

    const now = new Date();
    const remainingTime = Math.max(0, estimatedTime.getTime() - now.getTime());
    const remainingMinutes = Math.ceil(remainingTime / 60000);

    return remainingMinutes;
  };

  return (
    <Card 
    className={`relative cursor-pointer transition-all hover:shadow-lg ${statusInfo.color}`}
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

        {(room.status === 'need_cleaning' || room.status === 'cleaning_checkout') && (
          <div className="flex items-center gap-1 text-sm">
            <Timer className="h-4 w-4" />
            <span>
              {getEstimatedTime() ? 
                `${getEstimatedTime()} min restantes` : 
                'Esperando inicio'}
            </span>
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
                  {/* <ROOM_STATES[state].icon className="h-4 w-4 mr-2" /> */}
                  {ROOM_STATES[state].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </CardContent>

    {/* Modal de detalles */}
    <Dialog open={showDetails} onOpenChange={setShowDetails}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Habitación {room.number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </Card>
    ); 
}