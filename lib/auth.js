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
// Importar los módulos necesarios en la parte superior
import { 
  setPersistence, 
  browserLocalPersistence,
  inMemoryPersistence
} from 'firebase/auth';

// Constantes
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas en milisegundos
const STORAGE_KEYS = {
  STAFF_ACCESS: "staffAccess",
  CURRENT_STAFF_SESSION: "currentStaffSession",
  AUTH_USER: "authUser",
  AUTH_PROVIDER_INITIALIZED: "authProviderInitialized",
  AUTH_STATE_INITIALIZED: "auth_state_initialized",
};

const COOKIE_KEYS = {
  AUTH_TOKEN: "authToken",
  STAFF_ACCESS: "staffAccess",
  FIREBASE_TOKEN: "firebase-token",
  SESSION_START: "sessionStart",
};

// Utilidades para manejo de almacenamiento
const storageUtils = {
  // Local Storage
  saveToLocalStorage: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
    }
  },

  getFromLocalStorage: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting from localStorage (${key}):`, error);
      return null;
    }
  },

  removeFromLocalStorage: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  },

  // Session Storage
  saveToSessionStorage: (key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to sessionStorage (${key}):`, error);
    }
  },

  getFromSessionStorage: (key) => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting from sessionStorage (${key}):`, error);
      return null;
    }
  },

  removeFromSessionStorage: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from sessionStorage (${key}):`, error);
    }
  },

  clearStaffBackups: () => {
    try {
      const staffKeys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith("staff_data_")
      );
      staffKeys.forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.error("Error clearing staff backups:", error);
    }
  },

  // Cookies
  getCookie: (name) => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    } catch (error) {
      console.error(`Error getting cookie (${name}):`, error);
      return null;
    }
  },

  // Modificación de la función setCookie en el objeto storageUtils
  setCookie: (name, value, maxAge = SESSION_DURATION / 1000) => {
    try {
      // Para PWA, es mejor usar expires que max-age
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + (maxAge * 1000));
      
      // Configuración más robusta de cookies
      document.cookie = `${name}=${value}; path=/; expires=${expirationDate.toUTCString()}; SameSite=Lax; secure`;
      
      // Además, guardar en localStorage como respaldo
      localStorage.setItem(`cookie_backup_${name}`, JSON.stringify({
        value: value,
        expires: expirationDate.getTime()
      }));
    } catch (error) {
      console.error(`Error setting cookie (${name}):`, error);
    }
  },

  // Añadir un método para restaurar cookies desde localStorage
  restoreCookiesFromBackup: () => {
    try {
      const cookieBackupKeys = Object.keys(localStorage).filter(
        key => key.startsWith('cookie_backup_')
      );
      
      cookieBackupKeys.forEach(key => {
        try {
          const backupData = JSON.parse(localStorage.getItem(key));
          if (backupData && backupData.expires > Date.now()) {
            const cookieName = key.replace('cookie_backup_', '');
            const cookieValue = backupData.value;
            
            // Restaurar la cookie si no existe
            if (!storageUtils.getCookie(cookieName)) {
              const expirationDate = new Date(backupData.expires);
              document.cookie = `${cookieName}=${cookieValue}; path=/; expires=${expirationDate.toUTCString()}; SameSite=Lax; secure`;
            }
          }
        } catch (error) {
          console.error(`Error restoring cookie from backup (${key}):`, error);
        }
      });
    } catch (error) {
      console.error("Error restoring cookies from backup:", error);
    }
  },

  removeCookie: (name) => {
    try {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    } catch (error) {
      console.error(`Error removing cookie (${name}):`, error);
    }
  },

  // Verificación de tiempo de sesión
  isSessionValid: (timestamp) => {
    if (!timestamp) return false;
    const sessionTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    return now - sessionTime < SESSION_DURATION;
  },
};

// Contexto de autenticación
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

  // Normalizar datos del staff para asegurar consistencia
  const normalizeStaffData = (staffData) => {
    if (!staffData) return null;
    
    // Crear copia para no mutar el original
    const normalized = { ...staffData };
    
    // Asegurar que tenga userId (usar id si no existe userId)
    if (!normalized.userId && normalized.id) {
      normalized.userId = normalized.id;
    } else if (!normalized.id && normalized.userId) {
      normalized.id = normalized.userId;
    }
    
    return normalized;
  };

  // Función para cargar la sesión del staff
  const loadStaffSession = () => {
    try {
      // Verificar si estamos en modo PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      // Intentar cargar desde sessionStorage primero
      const sessionData = storageUtils.getFromSessionStorage(STORAGE_KEYS.CURRENT_STAFF_SESSION);
      if (sessionData) {
        // En modo PWA, ser más flexible con la validez de la sesión
        const isValid = isPWA 
          ? true // En PWA consideramos válida la sesión sin verificar tiempo
          : storageUtils.isSessionValid(sessionData.sessionStart);
          
        if (isValid) {
          console.log("Staff session loaded from sessionStorage:", sessionData);
          
          // Normalizar el formato de datos
          const normalizedData = normalizeStaffData(sessionData);
          
          // Actualizar localStorage para consistencia
          storageUtils.saveToLocalStorage(STORAGE_KEYS.STAFF_ACCESS, normalizedData);
          
          // En PWA, renovar la sesión
          if (isPWA) {
            const renewedSession = {
              ...normalizedData,
              sessionStart: new Date().toISOString(),
            };
            storageUtils.saveToSessionStorage(STORAGE_KEYS.CURRENT_STAFF_SESSION, renewedSession);
            
            // Renovar cookies
            storageUtils.setCookie(COOKIE_KEYS.STAFF_ACCESS, normalizedData.id);
            storageUtils.setCookie(COOKIE_KEYS.SESSION_START, Date.now().toString());
          }
          
          return normalizedData;
        }
      }

      // Si no hay sesión en sessionStorage, intentar desde localStorage
      const staffData = storageUtils.getFromLocalStorage(STORAGE_KEYS.STAFF_ACCESS);
      if (staffData && storageUtils.isSessionValid(staffData.timestamp)) {
        // Normalizar el formato de datos
        const normalizedData = normalizeStaffData(staffData);
        
        // Recrear la sesión en sessionStorage
        const sessionData = {
          ...normalizedData,
          sessionStart: new Date().toISOString(),
        };
        
        // Guardar sesión actualizada
        storageUtils.saveToSessionStorage(STORAGE_KEYS.CURRENT_STAFF_SESSION, sessionData);
        
        console.log("Staff session loaded from localStorage:", normalizedData);
        return normalizedData;
      }

      // Buscar backup de sesión de staff
      const staffKeys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith("staff_data_")
      );

      if (staffKeys.length > 0) {
        console.log("Encontrada información de staff de respaldo");
        const staffBackupKey = staffKeys[0]; // Usar el primer respaldo encontrado
        try {
          const backupData = JSON.parse(sessionStorage.getItem(staffBackupKey));
          
          // Normalizar el formato de datos
          const normalizedData = normalizeStaffData(backupData);
          
          // Agregar campos necesarios
          const fullStaffData = {
            ...normalizedData,
            timestamp: new Date().toISOString(),
          };
          
          // Restaurar en ambos lugares
          storageUtils.saveToLocalStorage(STORAGE_KEYS.STAFF_ACCESS, fullStaffData);
          storageUtils.saveToSessionStorage(
            STORAGE_KEYS.CURRENT_STAFF_SESSION,
            {
              ...fullStaffData,
              sessionStart: new Date().toISOString(),
            }
          );
          
          console.log("Staff session restored from backup:", fullStaffData);
          return fullStaffData;
        } catch (backupError) {
          console.error("Error restoring from backup:", backupError);
        }
      }

      // Si no hay sesión válida, limpiar todo
      storageUtils.removeFromLocalStorage(STORAGE_KEYS.STAFF_ACCESS);
      storageUtils.removeFromSessionStorage(STORAGE_KEYS.CURRENT_STAFF_SESSION);
      return null;
    } catch (error) {
      console.error("Error loading staff session:", error);
      return null;
    }
  };

  // Cargar sesión de usuario
  const loadUserSession = () => {
    try {
      // Verificar si hay una cookie de autenticación
      const authTokenCookie = storageUtils.getCookie(COOKIE_KEYS.AUTH_TOKEN);

      if (authTokenCookie) {
        // Intentar cargar datos de usuario desde sessionStorage
        const userSession = storageUtils.getFromSessionStorage(STORAGE_KEYS.AUTH_USER);
        if (userSession) {
          return userSession;
        }

        // Si no está en sessionStorage, intentar localStorage
        const userLocal = storageUtils.getFromLocalStorage(STORAGE_KEYS.AUTH_USER);
        if (userLocal) {
          // Restaurar en sessionStorage
          storageUtils.saveToSessionStorage(STORAGE_KEYS.AUTH_USER, userLocal);
          return userLocal;
        }
      }

      return null;
    } catch (error) {
      console.error("Error loading user session:", error);
      return null;
    }
  };

  // Login con PIN
  const loginWithPin = async (pin, hotelId, requiredRole = null) => {
    try {
      setLoading(true);

      // Validar que hotelId no sea null
      if (!hotelId) {
        throw new Error("Se requiere un ID de hotel válido");
      }

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
        userId: staffDoc.id, // Añadir userId para consistencia
        ...staffData,
        hotelId,
        timestamp: new Date().toISOString(),
      };

      // Guardar en storage
      storageUtils.saveToLocalStorage(STORAGE_KEYS.STAFF_ACCESS, staffAccess);
      storageUtils.saveToSessionStorage(
        STORAGE_KEYS.CURRENT_STAFF_SESSION,
        {
          ...staffAccess,
          sessionStart: new Date().toISOString(),
        }
      );
      
      // Establecer cookie para mantener la sesión
      storageUtils.setCookie(COOKIE_KEYS.STAFF_ACCESS, staffDoc.id);
      storageUtils.setCookie(COOKIE_KEYS.SESSION_START, Date.now().toString());

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

  // Cerrar sesión
  const signOut = async () => {
    try {
      const hotelId = staff?.hotelId;

      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }

      // Limpiar localStorage
      storageUtils.removeFromLocalStorage(STORAGE_KEYS.STAFF_ACCESS);
      storageUtils.removeFromLocalStorage(STORAGE_KEYS.AUTH_USER);

      // Limpiar sessionStorage
      storageUtils.removeFromSessionStorage(STORAGE_KEYS.CURRENT_STAFF_SESSION);
      storageUtils.removeFromSessionStorage(STORAGE_KEYS.AUTH_USER);
      
      // Limpiar flags de redirección y dejamos una marca de logout
      storageUtils.removeFromSessionStorage("isRedirecting");
      storageUtils.removeFromSessionStorage("redirectStartTime");
      storageUtils.saveToSessionStorage("justLoggedOut", true);

      // Limpiar respaldos específicos de staff
      storageUtils.clearStaffBackups();

      // Limpiar cookies
      storageUtils.removeCookie(COOKIE_KEYS.AUTH_TOKEN);
      storageUtils.removeCookie(COOKIE_KEYS.STAFF_ACCESS);
      storageUtils.removeCookie(COOKIE_KEYS.FIREBASE_TOKEN);
      storageUtils.removeCookie(COOKIE_KEYS.SESSION_START);

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
          const updatedStaffData = normalizeStaffData({
            ...staff,
            ...staffDoc.data(),
          });
          
          setStaff(updatedStaffData);
          storageUtils.saveToLocalStorage(STORAGE_KEYS.STAFF_ACCESS, updatedStaffData);
          storageUtils.saveToSessionStorage(
            STORAGE_KEYS.CURRENT_STAFF_SESSION,
            {
              ...updatedStaffData,
              sessionStart: new Date().toISOString(),
            }
          );
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  // Efecto para inicializar la autenticación
  useEffect(() => {
    const configurePersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log("Firebase Auth persistence set to browserLocalPersistence");
      } catch (error) {
        console.error("Error configuring Firebase Auth persistence:", error);
        // Si falla, intentar con memoria
        try {
          await setPersistence(auth, inMemoryPersistence);
          console.log("Fallback: Firebase Auth persistence set to inMemoryPersistence");
        } catch (fallbackError) {
          console.error("Error configuring fallback persistence:", fallbackError);
        }
      }
    };
    
    configurePersistence();
    
    // Función para inicializar la autenticación
    const initializeAuth = () => {
      // Restaurar cookies desde backups
      storageUtils.restoreCookiesFromBackup();
      
      // Marcar como inicializado
      storageUtils.saveToSessionStorage(STORAGE_KEYS.AUTH_PROVIDER_INITIALIZED, true);
      
      // Verificar PWA state
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      if (isPWA) {
        console.log("Ejecutando en modo PWA");
        // En modo PWA, ser más agresivo para restaurar sesiones
        
        // Primero intentar restaurar desde localStorage
        const staffSession = loadStaffSession();
        if (staffSession) {
          // Recrear cookies y estado
          storageUtils.setCookie(COOKIE_KEYS.STAFF_ACCESS, staffSession.id, SESSION_DURATION * 2 / 1000); // Más tiempo para PWA
          storageUtils.setCookie(COOKIE_KEYS.SESSION_START, Date.now().toString(), SESSION_DURATION * 2 / 1000);
          
          setStaff(staffSession);
          setLoading(false);
          return;
        }
        
        // Intentar restaurar usuario
        const userSession = loadUserSession();
        if (userSession) {
          // Recrear cookies y estado
          storageUtils.setCookie(COOKIE_KEYS.AUTH_TOKEN, userSession.uid || userSession.id, SESSION_DURATION * 2 / 1000);
          storageUtils.setCookie(COOKIE_KEYS.SESSION_START, Date.now().toString(), SESSION_DURATION * 2 / 1000);
          
          setUser(userSession);
          setLoading(false);
          return;
        }
      }
      
      // Primero verificar si hay cookie de autenticación
      const authToken = storageUtils.getCookie(COOKIE_KEYS.AUTH_TOKEN);
      const staffAccessCookie = storageUtils.getCookie(COOKIE_KEYS.STAFF_ACCESS);
      
      // Iniciar con staff si hay cookies de staff
      if (staffAccessCookie) {
        const staffSession = loadStaffSession();
        if (staffSession) {
          setStaff(staffSession);
          setLoading(false);
          return;
        }
      }
      
      // Intentar cargar usuario si hay cookie de auth
      if (authToken) {
        const userSession = loadUserSession();
        if (userSession) {
          setUser(userSession);
          setLoading(false);
          return;
        }
      }
      
      // Intentar cargar sesiones sin cookies
      const staffSession = loadStaffSession();
      if (staffSession) {
        console.log("Loaded existing staff session:", staffSession);
        
        // Recrear cookie
        storageUtils.setCookie(COOKIE_KEYS.STAFF_ACCESS, staffSession.id);
        storageUtils.setCookie(COOKIE_KEYS.SESSION_START, Date.now().toString());
        
        setStaff(staffSession);
        setLoading(false);
        return;
      }
      
      // Inicializar listener de Firebase Auth si no hay sesiones
      initializeFirebaseAuthListener();
    };
    
    // Función para inicializar el listener de Firebase Auth
    const initializeFirebaseAuthListener = () => {
      // Marcar que estamos inicializando el listener
      storageUtils.saveToSessionStorage(STORAGE_KEYS.AUTH_STATE_INITIALIZED, true);
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const userInfo = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData,
              };
              
              setUser(userInfo);
              
              // Establecer cookie
              storageUtils.setCookie(COOKIE_KEYS.AUTH_TOKEN, firebaseUser.uid);
              storageUtils.setCookie(COOKIE_KEYS.SESSION_START, Date.now().toString());
              
              // Guardar en almacenamiento
              storageUtils.saveToLocalStorage(STORAGE_KEYS.AUTH_USER, userInfo);
              storageUtils.saveToSessionStorage(STORAGE_KEYS.AUTH_USER, userInfo);
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
    };
    
    // Verificar si ya está inicializado
    const isInitialized = storageUtils.getFromSessionStorage(STORAGE_KEYS.AUTH_PROVIDER_INITIALIZED);
    
    if (isInitialized) {
      // Verificar sesiones existentes
      const staffSession = loadStaffSession();
      if (staffSession) {
        setStaff(staffSession);
        setLoading(false);
        return;
      }
      
      const userSession = loadUserSession();
      if (userSession) {
        setUser(userSession);
        setLoading(false);
        return;
      }
      
      // Verificar si el listener de Firebase Auth ya está inicializado
      const isAuthStateInitialized = storageUtils.getFromSessionStorage(STORAGE_KEYS.AUTH_STATE_INITIALIZED);
      
      if (isAuthStateInitialized) {
        // Si ya hay un listener inicializado, solo terminamos la carga
        setLoading(false);
        return;
      }
    }
    
    // Si llegamos aquí, es necesario inicializar
    initializeAuth();
    
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