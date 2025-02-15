import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator  } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import { getStorage, connectStorageEmulator  } from "firebase/storage";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// const analytics = getAnalytics(app);

auth.onAuthStateChanged((user) => {
  if (user) {
    user.getIdToken(true);
  }
});

export async function requestNotificationPermission() {
  try {
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permiso de notificación denegado');
      return null;
    }

    // Obtener token FCM
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Asegúrate de tener esta variable de entorno
    });

    return token;
  } catch (error) {
    console.error('Error al solicitar permiso:', error);
    return null;
  }
}

// 3. Función para manejar mensajes en primer plano
export function onMessageListener() {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Mensaje recibido:', payload);
    // Aquí puedes manejar la notificación como desees
    // Por ejemplo, mostrar un toast o actualizar el UI
  });
}

export { app, auth, db, storage, messaging  };