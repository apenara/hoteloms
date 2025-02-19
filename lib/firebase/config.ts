import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Inicializar messaging solo en el cliente
let messaging: any = null;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Error initializing messaging:", error);
  }
}

export async function requestNotificationPermission() {
  try {
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permiso de notificación denegado");
      return null;
    }

    // Verificar que la VAPID key esté definida
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("VAPID key no encontrada");
      return null;
    }

    // Obtener token FCM
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration:
        await navigator.serviceWorker.getRegistration(),
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error al solicitar permiso:", error);
    return null;
  }
}

export function onMessageListener() {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("Mensaje recibido:", payload);
    return payload;
  });
}

export { app, auth, db, storage, messaging };
