// app/components/guest/GuestServices.tsx
import { Button } from '@/components/ui/button';
import { Paintbrush, Waves, MessageSquare } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { sendGuestRequestNotification } from '@/app/services/guestNotificationService';

interface GuestServicesProps {
  room: any;
  hotelId: string;
  roomId: string;
  onShowMessage: () => void;
  onSuccess: (message: string) => void;
}

export function GuestServices({ room, hotelId, roomId, onShowMessage, onSuccess }: GuestServicesProps) {
  const handleStatusChange = async (newStatus: string) => {
    if (!hotelId || !roomId) return;
  
    try {
      const timestamp = new Date();
      const requestsRef = collection(db, 'hotels', hotelId, 'requests');
  
      // Crear solicitud con más detalles
      await addDoc(requestsRef, {
        roomId,
        roomNumber: room?.number,
        type: newStatus,
        status: 'pending',
        createdAt: timestamp,
        source: 'guest',
        priority: newStatus === 'need_cleaning' ? 'high' : 'medium',
        details: {
          previousStatus: room?.status,
          requestType: 'guest_initiated',
          guestRequest: true
        }
      });
  
      // Registrar en historial
      const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
      await addDoc(historyRef, {
        type: 'guest_request',
        requestType: newStatus,
        timestamp,
        source: 'guest',
        notes: `Solicitud de huésped: ${newStatus}`,
        room: {
          number: room?.number,
          id: room?.id
        }
      });

      // Enviar notificación
      await sendGuestRequestNotification({
        type: newStatus,
        hotelId,
        roomNumber: room.number,
        roomId
      });
  
      onSuccess('Solicitud enviada correctamente');
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Error al procesar la solicitud');
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <Button
        className="flex flex-col items-center p-6 h-auto"
        variant="outline"
        onClick={() => handleStatusChange('need_cleaning')}
      >
        <Paintbrush className="h-8 w-8 mb-2" />
        <span>Solicitar Limpieza</span>
        <span className="text-xs text-gray-500 mt-1">
          Servicio de limpieza
        </span>
      </Button>

      <Button
        className="flex flex-col items-center p-6 h-auto"
        variant="outline"
        onClick={() => handleStatusChange('need_towels')}
      >
        <Waves className="h-8 w-8 mb-2" />
        <span>Solicitar Toallas</span>
        <span className="text-xs text-gray-500 mt-1">
          Toallas adicionales
        </span>
      </Button>

      <Button
        className="flex flex-col items-center p-6 h-auto col-span-2"
        variant="outline"
        onClick={onShowMessage}
      >
        <MessageSquare className="h-8 w-8 mb-2" />
        <span>Enviar Mensaje</span>
        <span className="text-xs text-gray-500 mt-1">
          Contactar a recepción
        </span>
      </Button>
    </div>
  );
}