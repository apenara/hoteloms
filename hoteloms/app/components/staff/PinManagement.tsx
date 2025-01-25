// src/components/staff/PinManagement.tsx
'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth';
import { generatePin } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw } from 'lucide-react';

interface PinManagementProps {
  staff: any;
  isOpen: boolean;
  onClose: () => void;
}

export function PinManagement({ staff, isOpen, onClose }: PinManagementProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pin, setPin] = useState(staff?.pin || '');

  const handleRegeneratePin = async () => {
    if (!user?.hotelId || !staff?.id) return;

    try {
      setLoading(true);
      const newPin = generatePin(6);
      const staffRef = doc(db, 'hotels', user.hotelId, 'staff', staff.id);
      
      await updateDoc(staffRef, {
        pin: newPin,
        lastPinUpdate: new Date()
      });

      setPin(newPin);
      setSuccess('PIN actualizado correctamente');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error regenerating PIN:', error);
      setError('Error al regenerar el PIN');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pin).then(() => {
      setSuccess('PIN copiado al portapapeles');
      setTimeout(() => setSuccess(''), 3000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestión de PIN - {staff?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-100">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN Actual</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-2 border rounded bg-gray-50">
                <code className="text-lg">{pin}</code>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copiar PIN"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegeneratePin}
                disabled={loading}
                title="Regenerar PIN"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>Último cambio: {staff?.lastPinUpdate ? new Date(staff.lastPinUpdate.seconds * 1000).toLocaleString() : 'No registrado'}</p>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}