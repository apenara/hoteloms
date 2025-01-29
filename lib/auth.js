'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Crear el contexto con la función signOut
const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {}
});

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

// Proveedor de autenticación
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Inicializando...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthProvider: Estado de autenticación cambiado', firebaseUser);
      
      if (firebaseUser) {
        try {
          // 1. Intentar obtener datos del usuario regular
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          console.log('AuthProvider: Buscando en users/', userDoc.exists());
          
          if (userDoc.exists()) {
            // Es un usuario regular (admin de hotel o super admin)
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData
            });
          } else {
            // 2. Verificar si es un miembro del staff
            console.log('AuthProvider: Buscando en staff...');
            
            // Obtener el staffAccess del localStorage
            const staffAccess = localStorage.getItem('staffAccess');
            if (staffAccess) {
              const staffData = JSON.parse(staffAccess);
              console.log('AuthProvider: Staff data encontrada en localStorage:', staffData);
              
              // Verificar que el staff pertenece al hotel correcto
              if (staffData.hotelId) {
                const staffRef = collection(db, 'hotels', staffData.hotelId, 'staff');
                const staffQuery = query(staffRef, where('authId', '==', firebaseUser.uid));
                const staffSnapshot = await getDocs(staffQuery);
                
                if (!staffSnapshot.empty) {
                  const staffDoc = staffSnapshot.docs[0];
                  const staffDetails = staffDoc.data();
                  console.log('AuthProvider: Staff encontrado en Firestore:', staffDetails);
                  
                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    id: staffDoc.id,
                    hotelId: staffData.hotelId,
                    type: 'staff',
                    ...staffDetails
                  });
                } else {
                  console.log('AuthProvider: Staff no encontrado en Firestore');
                  setUser(null);
                }
              }
            } else {
              console.log('AuthProvider: No se encontró información de staff');
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
          setUser(null);
        }
      } else {
        console.log('AuthProvider: No hay usuario autenticado');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Función de cierre de sesión
  const signOut = async () => {
    try {
      // Limpiar localStorage
      localStorage.removeItem('staffAccess');
      
      // Cerrar sesión en Firebase
      await firebaseSignOut(auth);
      
      // Limpiar el estado del usuario
      setUser(null);
      
      // Redirigir a la página de login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}