// app/components/guest/GuestServices.tsx
import { Button } from '@/components/ui/button';
import { Paintbrush, Waves, MessageSquare } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { sendGuestRequestNotification } from '@/app/services/guestNotificationService';
import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface GuestServicesProps {
  room: any;
  hotelId: string;
  roomId: string;
  onShowMessage: () => void;
  onSuccess: (message: string) => void;
}

export function GuestServices({ room, hotelId, roomId, onShowMessage, onSuccess }: GuestServicesProps) {
  const [isRequestingTowels, setIsRequestingTowels] = useState(false);
  const [towelsQuantity, setTowelsQuantity] = useState<number | null>(null);

  const handleStatusChange = async (newStatus: string, quantity?: number) => {
    if (!hotelId || !roomId) return;
  
    try {
      const timestamp = new Date();
      const requestsRef = collection(db, 'hotels', hotelId, 'requests');
  
      const requestData = {
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
          guestRequest: true,
        },
      } as any;

      // Agregar la cantidad de toallas si se proporciona
      if (quantity !== undefined) {
        requestData.towelsQuantity = quantity;
      }
  
      // Crear solicitud con más detalles
      await addDoc(requestsRef, requestData);
  
      // Registrar en historial
      const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
      await addDoc(historyRef, {
        type: 'guest_request',
        requestType: newStatus,
        timestamp,
        source: 'guest',
        notes: `Solicitud de huésped: ${newStatus}${quantity ? ` - Cantidad: ${quantity}` : ''}`,
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
        roomId,
      });
  
      onSuccess('Solicitud enviada correctamente');
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Error al procesar la solicitud');
    } finally {
      setIsRequestingTowels(false)
      setTowelsQuantity(null);
    }
  };

  const handleRequestTowels = () => {
    setIsRequestingTowels(true);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <Button
        className="flex flex-col items-center p-6 h-auto"
        variant="outline"
        onClick={() => handleStatusChange('Necesita Limpieza')}
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
        onClick={handleRequestTowels}
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

      {/* Dialog for Towel Quantity */}
      <Dialog open={isRequestingTowels} onOpenChange={setIsRequestingTowels}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cuántas toallas necesita?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="towels">Cantidad de toallas</Label>
              <Input
                id="towels"
                type="number"
                min={1}
                value={towelsQuantity !== null ? towelsQuantity : ''}
                onChange={(e) => setTowelsQuantity(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (towelsQuantity && towelsQuantity == 1) {
                  handleStatusChange('Necesita ' + towelsQuantity + ' Toalla adicional' );
                } else if (towelsQuantity && towelsQuantity > 1) {
                  handleStatusChange('Necesita ' + towelsQuantity + ' Toallas adicionales', towelsQuantity);
                } else {
                  setIsRequestingTowels(false);
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
