import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { hasPermission } from '@/app/lib/constants/permissions';
import { logAccess } from '@/app/services/access-logs';

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

  const createActiveSession = async (staffData: any, staffId: string) => {
    try {
      const sessionRef = collection(db, 'hotels', hotelId, 'active_sessions');
      await addDoc(sessionRef, {
        userId: staffId,
        userName: staffData.name,
        role: staffData.role,
        accessType: 'pin',
        active: true,
        startedAt: new Date(),
        lastHeartbeat: new Date()
      });
    } catch (error) {
      console.error('Error creating active session:', error);
      throw error;
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar PIN
      if (!/^\d{10}$/.test(pin)) {
        throw new Error('El PIN debe contener exactamente 10 dígitos numéricos');
      }

      // Buscar el staff por PIN
      const staffRef = collection(db, 'hotels', hotelId, 'staff');
      const q = query(staffRef, where('pin', '==', pin));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('PIN inválido o usuario inactivo');
      }

      const staffDoc = querySnapshot.docs[0];
      const staffData = staffDoc.data();

      // Verificar si el staff está activo
      if (staffData.status !== 'active') {
        throw new Error('Usuario inactivo. Contacte al administrador');
      }

      // Verificar permisos básicos
      if (!hasPermission(staffData.role, 'canChangeRoomStatus')) {
        throw new Error('No tienes los permisos necesarios para acceder');
      }

      // Registrar el acceso
      await logAccess({
        userId: staffDoc.id,
        userName: staffData.name,
        role: staffData.role,
        accessType: 'pin',
        hotelId: hotelId,
        action: 'pin_login'
      });

      // Crear sesión activa
      await createActiveSession(staffData, staffDoc.id);

      // Actualizar último acceso
      await updateDoc(doc(staffRef, staffDoc.id), {
        lastLogin: new Date(),
        lastLoginType: 'pin'
      });

      // Notificar éxito
      onSuccess({
        id: staffDoc.id,
        ...staffData,
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