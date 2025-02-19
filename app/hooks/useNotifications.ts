// src/hooks/useNotifications.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import {
  requestNotificationPermission,
  onMessageListener,
} from "@/lib/firebase/config";

export function useNotifications() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // Verificar el estado actual del permiso
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (user && notificationPermission === "granted") {
      const initializeNotifications = async () => {
        try {
          const fcmToken = await requestNotificationPermission();
          if (fcmToken) {
            setToken(fcmToken);
            // Guardar el token en Firestore
            await saveTokenToFirestore(fcmToken);
          }
        } catch (error) {
          console.error("Error initializing notifications:", error);
        }
      };

      initializeNotifications();
    }
  }, [user, notificationPermission]);

  useEffect(() => {
    const unsubscribe = onMessageListener();

    return () => {
      unsubscribe();
    };
  }, []);

  const saveTokenToFirestore = async (fcmToken: string) => {
    if (!user) return;

    try {
      const tokensRef = collection(db, "notification_tokens");
      await addDoc(tokensRef, {
        token: fcmToken,
        userId: user.uid,
        createdAt: new Date(),
        platform: "web",
      });
    } catch (error) {
      console.error("Error saving token to Firestore:", error);
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.log("Este navegador no soporta notificaciones");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          setToken(fcmToken);
          await saveTokenToFirestore(fcmToken);
        }
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  };

  return {
    token,
    notification,
    notificationPermission,
    requestPermission,
  };
}
