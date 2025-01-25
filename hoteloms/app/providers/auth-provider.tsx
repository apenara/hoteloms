// src/providers/auth-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { User, UserRole, StaffRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isStaffSession: boolean;
}

interface AuthContextType extends AuthState {
  validateAccess: (requiredRoles: Array<UserRole | StaffRole>) => boolean;
  checkHotelAccess: (hotelId: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isStaffSession: false,
  validateAccess: () => false,
  checkHotelAccess: () => false,
  signOut: async () => {},
  
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isStaffSession: false
  });

  useEffect(() => {
    console.log('AuthProvider: Iniciando efecto');
    
    const checkStaffSession = () => {
      console.log('Verificando sesión de staff...');
      const staffSession = localStorage.getItem('staffAccess');

      if (staffSession) {
        try {
          const staff = JSON.parse(staffSession);
          console.log('Datos de sesión encontrados:', staff);
          
          const sessionTime = new Date(staff.timestamp);
          const now = new Date();
          const diff = now.getTime() - sessionTime.getTime();
          const hoursLeft = (8 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000);
          
          // Verificar expiración de 8 horas
          if (diff < 8 * 60 * 60 * 1000) {
            console.log(`Sesión válida, expira en ${hoursLeft.toFixed(1)} horas`);
            
            // Crear objeto de usuario con la estructura correcta
            const user: User = {
              id: staff.id,
              name: staff.name,
              email: staff.email || '',
              role: staff.role as StaffRole,
              hotelId: staff.hotelId,
              status: 'active',
              accessType: 'pin',
              lastLogin: new Date(staff.timestamp)
            };

            setAuthState({
              user,
              loading: false,
              isStaffSession: true
            });
            return true;
          } else {
            console.log('Sesión expirada, eliminando datos');
            localStorage.removeItem('staffAccess');
          }
        } catch (error) {
          console.error('Error procesando sesión de staff:', error);
          localStorage.removeItem('staffAccess');
        }
      }
      return false;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.log('No hay usuario de Firebase, verificando sesión de staff');
        if (!checkStaffSession()) {
          console.log('No hay sesiones activas');
          setAuthState({
            user: null,
            loading: false,
            isStaffSession: false
          });
        }
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          throw new Error('Usuario no encontrado');
        }

        const userData = userDoc.data();

        if (userData.status === 'pending_activation' && !firebaseUser.emailVerified) {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            status: 'active',
            lastLogin: new Date(),
            mustChangePassword: false
          });
          
          userData.status = 'active';
          userData.lastLogin = new Date();
          userData.mustChangePassword = false;
        }

        setAuthState({
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            ...userData,
            accessType: 'email'
          } as User,
          loading: false,
          isStaffSession: false
        });
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        setAuthState({
          user: null,
          loading: false,
          isStaffSession: false
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const validateAccess = (requiredRoles: Array<UserRole | StaffRole>): boolean => {
    if (!authState.user) return false;
    return requiredRoles.includes(authState.user.role);
  };

  const checkHotelAccess = (hotelId: string): boolean => {
    if (!authState.user) return false;
    if (authState.user.role === 'super_admin') return true;
    return authState.user.hotelId === hotelId;
  };

  const signOut = async () => {
    if (authState.isStaffSession) {
      localStorage.removeItem('staffAccess');
    } else {
      await auth.signOut();
    }
    setAuthState({
      user: null,
      loading: false,
      isStaffSession: false
    });
  };

  return (
    <AuthContext.Provider 
      value={{
        ...authState,
        validateAccess,
        checkHotelAccess,
        signOut
      }}
    >
      {!authState.loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);