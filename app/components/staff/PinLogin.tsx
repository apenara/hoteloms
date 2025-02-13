// src/components/staff/PinLogin.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { logAccess } from '@/app/services/access-logs';
import { hasPermission } from '@/app/lib/constants/permissions';

interface PinLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (staffMember: any) => void;
  hotelId: string;
}

export function PinLogin({ isOpen, onClose, onSuccess, hotelId }: PinLoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePin = (pin: string) => {
    return /^\d{10}$/.test(pin);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar formato del PIN
      if (!validatePin(pin)) {
        throw new Error('El PIN debe contener exactamente 10 dígitos numéricos');
      }

      // 1. Obtener custom token del servidor
      const response = await fetch('/api/auth/create-staff-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, hotelId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en la autenticación');
      }

      const { token, staff } = await response.json();

      // 2. Iniciar sesión con el custom token
      await signInWithCustomToken(auth, token);

      // 3. Verificar permisos básicos
      if (!hasPermission(staff.role, 'canChangeRoomStatus')) {
        throw new Error('No tienes los permisos necesarios para acceder');
      }

      // 4. Registrar acceso
      await logAccess({
        userId: staff.id,
        userName: staff.name,
        role: staff.role,
        accessType: 'pin',
        hotelId: hotelId,
        action: 'pin_login'
      });

      // 5. Notificar éxito y cerrar
      onSuccess({
        ...staff,
        lastAccess: new Date().toISOString()
      });
      
      onClose();
      setPin('');

    } catch (error) {
      console.error('Error de autenticación:', error);
      setError(error.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acceso del Personal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="pin">PIN de Acceso</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingrese su PIN de 10 dígitos"
              maxLength={10}
              pattern="\d*"
              inputMode="numeric"
              required
              className="text-center tracking-widest text-lg"
              autoComplete="off"
            />
            <p className="text-sm text-gray-500">
              Ingrese su número de documento como PIN
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || pin.length !== 10}
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}