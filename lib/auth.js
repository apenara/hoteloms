"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { logAccess } from "@/app/services/access-logs";
import { hasPermission } from "@/app/lib/constants/permissions";

const AuthContext = createContext({
  user: null,
  staff: null,
  loading: true,
  signOut: async () => {},
  loginWithPin: async (pin, hotelId, requiredRole) => {},
  checkAccess: (permission) => false,
  refreshUserData: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
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
      const currentSession = sessionStorage.getItem("currentStaffSession");
      if (currentSession) {
        const sessionData = JSON.parse(currentSession);
        const sessionStart = new Date(sessionData.sessionStart).getTime();
        const now = new Date().getTime();
        const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

        if (now - sessionStart < SESSION_DURATION) {
          console.log("Staff session loaded from sessionStorage:", sessionData);

          // Asegurarnos que el staff tenga todos los campos necesarios
          if (!sessionData.userId && sessionData.id) {
            sessionData.userId = sessionData.id;
          }

          // Restaurar en localStorage para mantener consistencia
          localStorage.setItem("staffAccess", JSON.stringify(sessionData));

          return sessionData;
        }
      }

      // Si no hay sesión en sessionStorage, intentar desde localStorage
      const staffAccess = localStorage.getItem("staffAccess");
      if (staffAccess) {
        const staffData = JSON.parse(staffAccess);
        const sessionStart = new Date(staffData.timestamp).getTime();
        const now = new Date().getTime();
        const SESSION_DURATION = 8 * 60 * 60 * 1000;

        if (now - sessionStart < SESSION_DURATION) {
          // Asegurarnos que tenga los campos necesarios
          if (!staffData.userId && staffData.id) {
            staffData.userId = staffData.id;
          }

          // Recrear la sesión en sessionStorage
          const sessionData = {
            ...staffData,
            sessionStart: new Date().toISOString(),
          };

          // Guardar sesión actualizada
          sessionStorage.setItem(
            "currentStaffSession",
            JSON.stringify(sessionData)
          );

          console.log("Staff session loaded from localStorage:", staffData);
          return staffData;
        }
      }

      // Buscar backup específico de sesión de staff que pudimos haber guardado
      // Este es el respaldo que agregamos en la página de login
      const staffKeys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith("staff_data_")
      );

      if (staffKeys.length > 0) {
        console.log("Encontrada información de staff de respaldo");
        const staffBackupKey = staffKeys[0]; // Usar el primer respaldo encontrado
        try {
          const staffData = JSON.parse(sessionStorage.getItem(staffBackupKey));

          // Agregar campos necesarios
          const fullStaffData = {
            ...staffData,
            timestamp: new Date().toISOString(),
            userId: staffData.id || staffData.userId,
          };

          // Restaurar en ambos lugares
          localStorage.setItem("staffAccess", JSON.stringify(fullStaffData));
          sessionStorage.setItem(
            "currentStaffSession",
            JSON.stringify({
              ...fullStaffData,
              sessionStart: new Date().toISOString(),
            })
          );

          console.log("Staff session restored from backup:", fullStaffData);
          return fullStaffData;
        } catch (backupError) {
          console.error("Error restoring from backup:", backupError);
        }
      }

      // Si no hay sesión válida, limpiar todo
      localStorage.removeItem("staffAccess");
      sessionStorage.removeItem("currentStaffSession");
      return null;
    } catch (error) {
      console.error("Error loading staff session:", error);
      return null;
    }
  };

  const loginWithPin = async (pin, hotelId, requiredRole = null) => {
    try {
      setLoading(true);
      console.log("Attempting PIN login:", { hotelId, requiredRole });

      // Validar que hotelId no sea null
      if (!hotelId) {
        throw new Error("Se requiere un ID de hotel válido");
      }

      console.log("Attempting PIN login:", { hotelId, requiredRole });

      const staffRef = collection(db, "hotels", hotelId, "staff");
      let q = query(
        staffRef,
        where("pin", "==", pin),
        where("status", "==", "active")
      );

      // Si se requiere un rol específico, agregarlo a la query
      if (requiredRole) {
        q = query(
          staffRef,
          where("pin", "==", pin),
          where("status", "==", "active"),
          where("role", "==", requiredRole)
        );
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("PIN inválido o usuario no autorizado");
      }

      const staffDoc = querySnapshot.docs[0];
      const staffData = staffDoc.data();

      console.log("Staff found:", staffData);

      // Si se requiere un rol específico, verificar
      if (requiredRole && staffData.role !== requiredRole) {
        throw new Error(
          `Acceso permitido solo para personal de ${requiredRole}`
        );
      }

      // Registrar acceso
      await logAccess({
        userId: staffDoc.id,
        userName: staffData.name,
        role: staffData.role,
        accessType: "pin",
        hotelId,
        action: "pin_login",
      });

      // Actualizar último acceso
      await updateDoc(staffDoc.ref, {
        lastLogin: new Date(),
        lastLoginType: "pin",
      });

      const staffAccess = {
        id: staffDoc.id,
        ...staffData,
        hotelId,
        timestamp: new Date().toISOString(),
      };

      // Guardar en storage
      localStorage.setItem("staffAccess", JSON.stringify(staffAccess));
      sessionStorage.setItem(
        "currentStaffSession",
        JSON.stringify({
          ...staffAccess,
          sessionStart: new Date().toISOString(),
        })
      );

      console.log("Setting staff state:", staffAccess);
      setStaff(staffAccess);
      setLoading(false);

      return staffAccess;
    } catch (error) {
      console.error("Error en login con PIN:", error);
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

      localStorage.removeItem("staffAccess");
      sessionStorage.removeItem("currentStaffSession");

      setUser(null);
      setStaff(null);

      if (hotelId) {
        window.location.href = `/reception/${hotelId}/login`;
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error durante el cierre de sesión:", error);
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
        const staffDoc = await getDoc(
          doc(db, "hotels", staff.hotelId, "staff", staff.id)
        );
        if (staffDoc.exists()) {
          const updatedStaffData = {
            ...staff,
            ...staffDoc.data(),
          };
          setStaff(updatedStaffData);
          localStorage.setItem("staffAccess", JSON.stringify(updatedStaffData));
          sessionStorage.setItem(
            "currentStaffSession",
            JSON.stringify({
              ...updatedStaffData,
              sessionStart: new Date().toISOString(),
            })
          );
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  useEffect(() => {
    // Verificamos si el componente ya se inicializó para evitar doble inicialización
    const isInitialized = sessionStorage.getItem("authProviderInitialized");

    if (isInitialized) {
      // Si ya está inicializado, solo cargamos la sesión
      const staffSession = loadStaffSession();
      if (staffSession) {
        setStaff(staffSession);
        setLoading(false);
        return;
      }
    } else {
      console.log("AuthProvider: Inicializando...");
      sessionStorage.setItem("authProviderInitialized", "true");

      // Primero intentar cargar sesión de staff
      const staffSession = loadStaffSession();
      if (staffSession) {
        console.log("Loaded existing staff session:", staffSession);
        setStaff(staffSession);
        setLoading(false);
        return;
      }
    }

    // Si no hay sesión de staff, manejar auth de Firebase
    // Usamos una variable para evitar multiples inicializaciones de listeners
    const authStateKey = "auth_state_initialized";
    const isAuthStateInitialized = sessionStorage.getItem(authStateKey);

    if (isAuthStateInitialized === "true") {
      // Si ya tenemos un listener inicializado, simplemente terminamos la carga
      setLoading(false);
      return () => {};
    }

    // Marcar que estamos inicializando el listener
    sessionStorage.setItem(authStateKey, "true");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData,
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
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
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
