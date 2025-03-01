'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  addDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/app/hooks/use-toast';
import { Loader2, MoveRight, Home, Info } from 'lucide-react';

// Interfaz para la habitación
interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
}

// Interfaz para el activo
interface Asset {
  id: string;
  name: string;
  assetCode: string;
  description: string;
  categoryId: string;
  roomId: string;
  status: 'active' | 'maintenance' | 'retired' | 'pending';
  condition: 'new' | 'good' | 'fair' | 'poor';
}

interface AssetTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  currentRoomId: string;
  hotelId: string;
  onSuccess: () => void;
}

export default function AssetTransferDialog({
  isOpen,
  onClose,
  asset,
  currentRoomId,
  hotelId,
  onSuccess
}: AssetTransferDialogProps) {
  // Estados
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // Cargar las habitaciones disponibles
  useEffect(() => {
    const fetchRooms = async () => {
      if (!hotelId) return;
      
      try {
        setLoading(true);
        
        // Cargar habitaciones
        const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
        const roomsQuery = query(roomsRef, orderBy('number', 'asc'));
        const roomsSnapshot = await getDocs(roomsQuery);
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        
        // Filtrar la habitación actual para no mostrarla en las opciones
        const filteredRooms = roomsData.filter(room => room.id !== currentRoomId);
        setRooms(filteredRooms);
        
        // Obtener la información de la habitación actual
        if (currentRoomId) {
          const currentRoomData = roomsData.find(room => room.id === currentRoomId);
          if (currentRoomData) {
            setCurrentRoom(currentRoomData);
          }
        }
        
      } catch (error) {
        console.error('Error al cargar habitaciones:', error);
        setError('Error al cargar las habitaciones disponibles');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [hotelId, currentRoomId]);

  // Función para realizar el traslado
  const handleTransfer = async () => {
    if (!user || !hotelId || !asset.id || !selectedRoomId || !transferReason.trim()) {
      setError('Por favor, selecciona una habitación y proporciona un motivo para el traslado');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Actualizar el activo con la nueva habitación
      const assetRef = doc(db, 'hotels', hotelId, 'assets', asset.id);
      await updateDoc(assetRef, {
        roomId: selectedRoomId,
        updatedAt: serverTimestamp(),
      });

      // 2. Registrar el traslado en el historial del activo
      const historyRef = collection(db, 'hotels', hotelId, 'assets', asset.id, 'history');
      await addDoc(historyRef, {
        type: 'transfer',
        date: serverTimestamp(),
        previousRoomId: currentRoomId,
        roomId: selectedRoomId,
        reason: transferReason,
        userId: user.uid,
        userName: user.name || 'Usuario',
      });

      // 3. Notificar éxito
      toast({
        title: 'Traslado exitoso',
        description: `El activo ha sido trasladado correctamente`,
      });

      // 4. Cerrar el diálogo y ejecutar callback de éxito
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al trasladar activo:', error);
      setError('Ocurrió un error al trasladar el activo. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveRight className="h-5 w-5" />
            Trasladar Activo
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Información del activo */}
          <div className="bg-slate-50 p-3 rounded-md">
            <h3 className="font-medium">{asset.name}</h3>
            <p className="text-sm text-muted-foreground">Código: {asset.assetCode}</p>
            {currentRoom && (
              <div className="flex items-center gap-1 mt-1 text-sm">
                <Home className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Ubicación actual: Habitación {currentRoom.number} (Piso {currentRoom.floor})
                </span>
              </div>
            )}
          </div>

          {/* Selección de habitación destino */}
          <div className="space-y-2">
            <Label htmlFor="room">Habitación destino</Label>
            <Select 
              value={selectedRoomId} 
              onValueChange={setSelectedRoomId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una habitación" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    Habitación {room.number} (Piso {room.floor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo del traslado */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del traslado</Label>
            <Textarea
              id="reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Indica el motivo por el que se realiza este traslado..."
              className="min-h-[100px]"
            />
          </div>

          {/* Nota informativa */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              El traslado quedará registrado en el historial del activo y no podrá deshacerse.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={submitting || !selectedRoomId || !transferReason.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Trasladando...
              </>
            ) : (
              'Confirmar Traslado'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
