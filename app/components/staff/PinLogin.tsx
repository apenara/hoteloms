// src/components/staff/PinLogin.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { hasPermission } from '@/app/lib/constants/permissions';
import { logAccess } from '@/app/services/access-logs';

interface PinLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (staffMember: any) => void;
  hotelId: string;
}

interface SavedPinData {
  pin: string;
  hotelId: string;
  timestamp: string;
}

export function PinLogin({ isOpen, onClose, onSuccess, hotelId }: PinLoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberPin, setRememberPin] = useState(false);

  useEffect(() => {
    // Intentar cargar PIN guardado al abrir el diálogo
    if (isOpen) {
      const savedPinData = getSavedPin();
      if (savedPinData && savedPinData.hotelId === hotelId) {
        setPin(savedPinData.pin);
        setRememberPin(true);
      }
    }
  }, [isOpen, hotelId]);

  const validatePin = (pin: string) => {
    return /^\d{10}$/.test(pin);
  };

  const getSavedPin = (): SavedPinData | null => {
    try {
      const savedPin = localStorage.getItem('savedStaffPin');
      if (savedPin) {
        const pinData = JSON.parse(savedPin);
        // Verificar si el PIN guardado tiene menos de 12 horas
        const savedTime = new Date(pinData.timestamp).getTime();
        const now = new Date().getTime();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        
        if (now - savedTime < TWELVE_HOURS) {
          return pinData;
        } else {
          // Eliminar PIN guardado si ha expirado
          localStorage.removeItem('savedStaffPin');
        }
      }
    } catch (error) {
      console.error('Error al recuperar PIN guardado:', error);
      localStorage.removeItem('savedStaffPin');
    }
    return null;
  };

  const savePin = (pin: string) => {
    try {
      const pinData: SavedPinData = {
        pin,
        hotelId,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('savedStaffPin', JSON.stringify(pinData));
    } catch (error) {
      console.error('Error al guardar PIN:', error);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!validatePin(pin)) {
        throw new Error('El PIN debe contener exactamente 10 dígitos numéricos');
      }

      const staffRef = collection(db, 'hotels', hotelId, 'staff');
      const q = query(staffRef, where('pin', '==', pin));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('PIN inválido o usuario inactivo');
      }

      const staffDoc = querySnapshot.docs[0];
      const staffData = staffDoc.data();

      if (staffData.status !== 'active') {
        throw new Error('Usuario inactivo. Contacte al administrador');
      }

      if (!hasPermission(staffData.role, 'canChangeRoomStatus')) {
        throw new Error('No tienes los permisos necesarios para acceder');
      }

      // Guardar PIN si se seleccionó recordar
      if (rememberPin) {
        savePin(pin);
      } else {
        localStorage.removeItem('savedStaffPin');
      }

      await logAccess({
        userId: staffDoc.id,
        userName: staffData.name,
        role: staffData.role,
        accessType: 'pin',
        hotelId: hotelId,
        action: 'pin_login'
      });

      await updateDoc(doc(db, 'hotels', hotelId, 'staff', staffDoc.id), {
        lastLogin: new Date(),
        lastLoginType: 'pin'
      });

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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberPin"
              checked={rememberPin}
              onCheckedChange={(checked) => setRememberPin(checked as boolean)}
            />
            <label
              htmlFor="rememberPin"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Recordar PIN por 12 horas
            </label>
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