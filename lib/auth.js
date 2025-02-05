'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { logAccess } from '@/app/services/access-logs';
import { hasPermission } from '@/app/lib/constants/permissions';

const AuthContext = createContext({
  user: null,
  staff: null,
  loading: true,
  signOut: async () => {},
  loginWithPin: async (pin, hotelId, requiredRole) => {},
  checkAccess: (permission) => false,
  refreshUserData: async () => {}
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStaffSession = () => {
    try {
      // Intentar cargar desde sessionStorage primero
      const currentSession = sessionStorage.getItem('currentStaffSession');
      if (currentSession) {
        const sessionData = JSON.parse(currentSession);
        const sessionStart = new Date(sessionData.sessionStart).getTime();
        const now = new Date().getTime();
        const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

        if (now - sessionStart < SESSION_DURATION) {
          console.log('Staff session loaded from sessionStorage:', sessionData);
          return sessionData;
        }
      }

      // Si no hay sesión en sessionStorage, intentar desde localStorage
      const staffAccess = localStorage.getItem('staffAccess');
      if (staffAccess) {
        const staffData = JSON.parse(staffAccess);
        const sessionStart = new Date(staffData.timestamp).getTime();
        const now = new Date().getTime();
        const SESSION_DURATION = 8 * 60 * 60 * 1000;

        if (now - sessionStart < SESSION_DURATION) {
          // Recrear la sesión en sessionStorage
          sessionStorage.setItem('currentStaffSession', JSON.stringify({
            ...staffData,
            sessionStart: new Date().toISOString()
          }));
          console.log('Staff session loaded from localStorage:', staffData);
          return staffData;
        }
      }

      // Si no hay sesión válida, limpiar todo
      localStorage.removeItem('staffAccess');
      sessionStorage.removeItem('currentStaffSession');
      return null;
    } catch (error) {
      console.error('Error loading staff session:', error);
      return null;
    }
  };

  const loginWithPin = async (pin, hotelId, requiredRole = null) => {
    try {
      setLoading(true);
      console.log('Attempting PIN login:', { hotelId, requiredRole });

      const staffRef = collection(db, 'hotels', hotelId, 'staff');
      let q = query(staffRef, 
        where('pin', '==', pin), 
        where('status', '==', 'active')
      );

      // Si se requiere un rol específico, agregarlo a la query
      if (requiredRole) {
        q = query(staffRef, 
          where('pin', '==', pin), 
          where('status', '==', 'active'),
          where('role', '==', requiredRole)
        );
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('PIN inválido o usuario no autorizado');
      }

      const staffDoc = querySnapshot.docs[0];
      const staffData = staffDoc.data();

      console.log('Staff found:', staffData);

      // Si se requiere un rol específico, verificar
      if (requiredRole && staffData.role !== requiredRole) {
        throw new Error(`Acceso permitido solo para personal de ${requiredRole}`);
      }

      // Registrar acceso
      await logAccess({
        userId: staffDoc.id,
        userName: staffData.name,
        role: staffData.role,
        accessType: 'pin',
        hotelId,
        action: 'pin_login'
      });

      // Actualizar último acceso
      await updateDoc(staffDoc.ref, {
        lastLogin: new Date(),
        lastLoginType: 'pin'
      });

      const staffAccess = {
        id: staffDoc.id,
        ...staffData,
        hotelId,
        timestamp: new Date().toISOString()
      };

      // Guardar en storage
      localStorage.setItem('staffAccess', JSON.stringify(staffAccess));
      sessionStorage.setItem('currentStaffSession', JSON.stringify({
        ...staffAccess,
        sessionStart: new Date().toISOString()
      }));

      console.log('Setting staff state:', staffAccess);
      setStaff(staffAccess);
      setLoading(false);
      
      return staffAccess;
    } catch (error) {
      console.error('Error en login con PIN:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const hotelId = staff?.hotelId;
      
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      
      localStorage.removeItem('staffAccess');
      sessionStorage.removeItem('currentStaffSession');
      
      setUser(null);
      setStaff(null);
      
      if (hotelId) {
        window.location.href = `/reception/${hotelId}/login`;
      } else {
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
      throw error;
    }
   };

  // Verificación de permisos
  const checkAccess = (requiredPermission) => {
    if (user) {
      return hasPermission(user.role, requiredPermission);
    }
    if (staff) {
      return hasPermission(staff.role, requiredPermission);
    }
    return false;
  };

  // Actualizar datos de usuario/staff
  const refreshUserData = async () => {
    try {
      if (staff?.id && staff?.hotelId) {
        const staffDoc = await getDoc(doc(db, 'hotels', staff.hotelId, 'staff', staff.id));
        if (staffDoc.exists()) {
          const updatedStaffData = {
            ...staff,
            ...staffDoc.data()
          };
          setStaff(updatedStaffData);
          localStorage.setItem('staffAccess', JSON.stringify(updatedStaffData));
          sessionStorage.setItem('currentStaffSession', JSON.stringify({
            ...updatedStaffData,
            sessionStart: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Inicializando...');
    
    // Primero intentar cargar sesión de staff
    const staffSession = loadStaffSession();
    if (staffSession) {
      console.log('Loaded existing staff session:', staffSession);
      setStaff(staffSession);
      setLoading(false);
      return;
    }

    // Si no hay sesión de staff, manejar auth de Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('Auth state changed:', firebaseUser);
        
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data found:', userData);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    staff,
    loading,
    signOut,
    loginWithPin,
    checkAccess,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}