import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db, messaging } from "@/lib/firebase/config"; // Importa messaging
import { collection, doc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging"; // Importa getToken y onMessage
import { toast } from "./use-toast";

export function useNotifications() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // Verificar el estado actual del permiso
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === "granted") {
          console.log("Notification permission granted.");
          await getFcmToken();
        } else {
          console.log("Permission denied or dismissed.");
        }
      } catch (error) {
        console.error("Error requesting permission:", error);
      }
    };

    const getFcmToken = async () => {
      if (!user) return;
      try {
        const currentToken = await getToken(messaging, {
          vapidKey: "BO-PNClIUSFDsAayx_acyc7FYSkwpYpvYyEbhwQUn7SWIRQDHcjYzGnr8uhN66KDy4iLiCTtTgrsmbR3v1cVt3c", // Reemplaza con tu VAPID Key
        });

        if (currentToken) {
          console.log("FCM Token:", currentToken);
          setToken(currentToken);
          await saveTokenToFirestore(currentToken);
        } else {
          console.warn(
            "No registration token available. Request permission to generate one."
          );
        }
      } catch (error) {
        console.error("An error occurred while retrieving token. ", error);
      }
    };

    const setupMessageHandler = () => {
      onMessage(messaging, (payload) => {
        console.log("Message received. ", payload);
        // Muestra una notificación en primer plano
        toast({
          title: payload.notification?.title || "Nueva Notificación",
          description: payload.notification?.body || "Tienes una nueva notificación.",
        });
      });
    };

    if (user && notificationPermission === "granted") {
      getFcmToken();
      setupMessageHandler();
    } else {
      requestPermission();
    }

    return () => {};
  }, [user, notificationPermission]);

  const saveTokenToFirestore = async (fcmToken: string) => {
    if (!user) return;

    try {
      // Actualiza el documento del usuario con el token
      const userRef = doc(db, "users", user.uid); // O staff si es personal
      await updateDoc(userRef, {
        fcmToken: fcmToken,
      });
    } catch (error) {
      console.error("Error saving token to Firestore:", error);
    }
  };

  return {
    token,
    notificationPermission,
  };
}
