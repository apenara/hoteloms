// src/lib/auth.js
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
  loginWithPin: async (pin, hotelId) => {},
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
      const staffAccess = localStorage.getItem('staffAccess');
      if (staffAccess) {
        const staffData = JSON.parse(staffAccess);
        const sessionStart = new Date(staffData.timestamp).getTime();
        const now = new Date().getTime();
        const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

        if (now - sessionStart < SESSION_DURATION) {
          console.log('Staff session loaded:', staffData);
          return staffData;
        } else {
          console.log('Staff session expired');
          localStorage.removeItem('staffAccess');
          sessionStorage.removeItem('currentStaffSession');
        }
      }
    } catch (error) {
      console.error('Error loading staff session:', error);
    }
    return null;
  };

  // Función para verificar permisos
  const checkAccess = (requiredPermission) => {
    if (user) {
      return hasPermission(user.role, requiredPermission);
    }
    if (staff) {
      return hasPermission(staff.role, requiredPermission);
    }
    return false;
  };

  const refreshUserData = async () => {
    try {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUser({ ...user, ...userDoc.data() });
        }
      }
      
      if (staff?.id) {
        const staffDoc = await getDoc(doc(db, 'hotels', staff.hotelId, 'staff', staff.id));
        if (staffDoc.exists()) {
          setStaff({ ...staff, ...staffDoc.data() });
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Función para login con PIN
  const loginWithPin = async (pin, hotelId) => {
    try {
      setLoading(true);
      console.log('Attempting PIN login:', { hotelId });

      const staffRef = collection(db, 'hotels', hotelId, 'staff');
      const q = query(staffRef, where('pin', '==', pin), where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('PIN inválido o usuario inactivo');
      }

      const staffDoc = querySnapshot.docs[0];
      const staffData = staffDoc.data();

      console.log('Staff found:', staffData);

      // Verificar permisos básicos
      if (!hasPermission(staffData.role, 'canChangeRoomStatus')) {
        throw new Error('No tienes permisos suficientes');
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
      sessionStorage.setItem('currentStaffSession', JSON.stringify(staffAccess));

      console.log('Setting staff state:', staffAccess);
      setStaff(staffAccess);
      
      return staffAccess;
    } catch (error) {
      console.error('Error en login con PIN:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      
      localStorage.removeItem('staffAccess');
      sessionStorage.removeItem('currentStaffSession');
      
      setUser(null);
      setStaff(null);
      
      window.location.href = '/';
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Inicializando...');
    
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
          // Intentar cargar sesión de staff
          const staffSession = loadStaffSession();
          if (staffSession) {
            console.log('Loading staff session:', staffSession);
            setStaff(staffSession);
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setStaff(null);
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