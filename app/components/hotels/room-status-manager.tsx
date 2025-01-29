// src/components/hotels/room-status-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function RoomStatusManager({ room, hotelId, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStatusChange = async (newStatus) => {
    setIsLoading(true);
    setError('');

    try {
      const roomRef = doc(db, 'hotels', hotelId, 'rooms', room.id);
      await updateDoc(roomRef, {
        status: newStatus,
        lastStatusChange: serverTimestamp(),
        ...(newStatus === 'cleaning' && { lastCleaning: serverTimestamp() })
      });
      onStatusChange();
    } catch (error) {
      setError('Error al actualizar el estado');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusActions = {
    available: [
      { label: 'Marcar Ocupada', status: 'occupied', variant: 'default' },
      { label: 'Mantenimiento', status: 'maintenance', variant: 'secondary' }
    ],
    occupied: [
      { label: 'Liberar', status: 'cleaning', variant: 'default' }
    ],
    cleaning: [
      { label: 'Finalizar Limpieza', status: 'available', variant: 'default' }
    ],
    maintenance: [
      { label: 'Finalizar Mantenimiento', status: 'cleaning', variant: 'default' }
    ]
  };

  const currentActions = statusActions[room.status] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cambiar Estado - Habitación {room.number}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex gap-2">
            {currentActions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                disabled={isLoading}
                onClick={() => handleStatusChange(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}