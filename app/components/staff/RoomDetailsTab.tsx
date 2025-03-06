// app/components/staff/RoomDetailsTab.tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ROOM_STATES } from '@/app/lib/constants/room-states';
import { RequestCard } from '@/components/hotels/RequestCard';
import { MessageSquare, CheckCircle } from 'lucide-react';
import MaintenancePreview from '@/components/maintenance/MaintenancePreview';
import { registrarCambioEstado } from '@/app/services/housekeeping';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { uploadMaintenanceImages } from '@/app/services/storage';
import { useState } from 'react';

interface RoomDetailsTabProps {
  room: any;
  successMessage: string;
  pendingRequests: any[];
  currentUser: any;
  checkAccess: (permission: string) => boolean;
  procesando: boolean;
  hotelId: string;
  roomId: string;
  onStateChange: (newRoom: any) => void;
  onShowMaintenanceDialog: () => void;
}

export function RoomDetailsTab({
  room,
  successMessage,
  pendingRequests,
  currentUser,
  checkAccess,
  procesando,
  hotelId,
  roomId,
  onStateChange,
  onShowMaintenanceDialog
}: RoomDetailsTabProps) {
  const [notes, setNotes] = useState('');

  const getAvailableStates = () => {
    if (!currentUser || !room) return [];
    let states = [];

    // Verificar permisos usando checkAccess
    if (checkAccess('canChangeRoomStatus')) {
      if (currentUser.role === 'housekeeper' || currentUser.role === 'hotel_admin') {
        switch (room.status) {
          case 'available':
          case 'occupied':
          case 'clean_occupied':
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'do_not_disturb'];
            break;
          case 'do_not_disturb':
            // Permitir volver a estados normales cuando el huésped lo permita
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'do_not_disturb'];
            break;
          case 'cleaning_occupied':
            states = ['clean_occupied'];
            break;
          case 'cleaning_checkout':
          case 'cleaning_touch':
            states = ['ready_for_inspection'];
            break;
          case 'ready_for_inspection':
            states = ['inspection'];
            break;
          case 'inspection':
            states = ['available'];
            break;
          case 'need_cleaning':
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'do_not_disturb'];
            break;
          case 'dirty_occupied':
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'do_not_disturb'];
            break;
          default:
            states = ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'];
        }
      }

      if (currentUser.role === 'maintenance') {
        if (room.status === 'blocked_maintenance') {
          states = ['available', 'need_cleaning'];
        }
      }

      if (currentUser.role === 'hotel_admin') {
        states = Object.keys(ROOM_STATES);
      }
    }

    // Mantenimiento siempre disponible para todo el personal
    if (!states.includes('maintenance')) {
      states.push('maintenance');
    }

    return states;
  };

  const handleStateChange = async (newState: string) => {
    if (!currentUser || !hotelId || !roomId || !room) {
      return;
    }

    try {
      // Registrar el cambio de estado
      await registrarCambioEstado(
        hotelId,
        roomId,
        currentUser.id,
        newState
      );

      // Solo crear solicitud si es mantenimiento
      if (newState === 'maintenance') {
        const requestsRef = collection(db, 'hotels', hotelId, 'requests');
        await addDoc(requestsRef, {
          type: 'maintenance',
          status: 'pending',
          roomId: roomId,
          roomNumber: room.number,
          description: notes.trim(),
          createdAt: new Date(),
          createdBy: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role
          },
          priority: 'medium',
          location: `Habitación ${room.number}`,
          category: 'maintenance',
          source: 'staff'
        });
      }

      const updatedRoom = { ...room, status: newState };
      onStateChange(updatedRoom);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {successMessage && (
        <Alert className="bg-green-100 mb-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {room?.status === 'maintenance' && room?.currentMaintenance && (
        <MaintenancePreview maintenance={room.currentMaintenance} />
      )}

      {pendingRequests.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Solicitudes Pendientes ({pendingRequests.length})
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onComplete={() => { }} // Implementar si es necesario
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Estado Actual: {ROOM_STATES[room?.status]?.label || room?.status}</h3>
          {room?.tiempoLimpieza && (
            <div className="text-sm text-gray-600">
              Último tiempo de limpieza: {room.tiempoLimpieza}min
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {getAvailableStates().map(state => {
            const stateInfo = ROOM_STATES[state];
            const StateIcon = stateInfo?.icon || CheckCircle;
            return state === 'maintenance' ? (
              <Button
                key={state}
                variant="outline"
                className={`flex flex-col items-center p-4 h-auto ${stateInfo?.color || ''}`}
                onClick={onShowMaintenanceDialog}
                disabled={procesando}
              >
                <StateIcon className="h-5 w-5" />
                <span className="mt-2 text-sm font-medium">{stateInfo?.label}</span>
              </Button>
            ) : (
              <Button
                key={state}
                variant="outline"
                className={`flex flex-col items-center p-4 h-auto ${stateInfo?.color || ''}`}
                onClick={() => handleStateChange(state)}
                disabled={procesando}
              >
                <StateIcon className="h-5 w-5" />
                <span className="mt-2 text-sm font-medium">{stateInfo?.label}</span>
                {stateInfo?.requiresInspection && (
                  <span className="mt-1 text-xs text-gray-600">
                    Requiere inspección
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}