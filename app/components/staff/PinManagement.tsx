"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface PinManagementProps {
  staff: any;
  isOpen: boolean;
  onClose: () => void;
}

export function PinManagement({ staff, isOpen, onClose }: PinManagementProps) {
  const [pin, setPin] = useState(staff?.pin || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdatePin = async () => {
    if (!staff || !staff.id || !staff.hotelId) return;

    try {
      if (pin.length !== 10) {
        throw new Error('El PIN debe tener exactamente 10 caracteres');
      }

      setLoading(true);
      setError('');

      // Actualizar el PIN en Firestore
      const staffRef = doc(db, 'hotels', staff.hotelId, 'staff', staff.id);
      await updateDoc(staffRef, { pin });

      onClose();
    } catch (error) {
      console.error('Error al actualizar el PIN:', error);
      setError(error.message || 'Error al actualizar el PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar PIN</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN (10 caracteres)</label>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Asignar un PIN de 10 caracteres"
              maxLength={10}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePin} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}