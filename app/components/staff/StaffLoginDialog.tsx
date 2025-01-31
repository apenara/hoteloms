// src/components/staff/StaffLoginDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { hasPermission } from '@/app/lib/constants/permissions';
import { logAccess } from '@/app/services/access-logs';
import { User, UserRole } from '@/lib/types';

interface StaffLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (staffMember: any) => void;
  hotelId: string;
}

interface LoginData {
  email: string;
  password: string;
}

const StaffLoginDialog: React.FC<StaffLoginDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  hotelId
}) => {
  const [loginData, setLoginData] = useState<LoginData>({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      // 1. Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );

      if (!userCredential.user) {
        throw new Error('No se pudo obtener la información del usuario');
      }
      
      // 2. Buscar el staff member en la colección del hotel
      const staffRef = collection(db, 'hotels', hotelId, 'staff');
      const staffQuery = query(staffRef, where('userId', '==', userCredential.user.uid));
      const staffSnapshot = await getDocs(staffQuery);

      if (staffSnapshot.empty) {
        throw new Error('Usuario no encontrado como personal de este hotel');
      }

      const staffDoc = staffSnapshot.docs[0];
      const staffData = staffDoc.data();

      // 3. Verificar el estado del usuario
      if (staffData.status !== 'active') {
        throw new Error('Usuario inactivo. Contacte al administrador');
      }

      // 4. Verificar permisos
      if (!hasPermission(staffData.role, 'canAccessOperationalPages')) {
        throw new Error('No tienes los permisos necesarios para acceder');
      }

      // 5. Registrar el acceso
      await logAccess({
        userId: staffDoc.id,
        userName: staffData.name,
        role: staffData.role,
        accessType: 'email',
        hotelId,
        action: 'email_login'
      });

      // 6. Actualizar último acceso
      await updateDoc(doc(staffRef, staffDoc.id), {
        lastLogin: new Date(),
        lastLoginType: 'email'
      });

      // 7. Preparar datos del usuario y llamar a onSuccess
      const userData = {
        id: staffDoc.id,
        authId: userCredential.user.uid,
        email: staffData.email,
        name: staffData.name,
        role: staffData.role,
        status: staffData.status,
        lastAccess: new Date().toISOString()
      };

      onSuccess(userData);
      onClose();
      
    } catch (error: any) {
      console.error('Error en login:', error);
      
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Intente más tarde';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setLoginError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acceso del Personal</DialogTitle>
          <DialogDescription>
            Ingresa con tus credenciales de personal del hotel
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={loginData.email}
              onChange={handleInputChange}
              placeholder="tu@email.com"
              required
              disabled={isLoggingIn}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={loginData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              disabled={isLoggingIn}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoggingIn}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoggingIn || !loginData.email || !loginData.password}
            >
              {isLoggingIn ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffLoginDialog;