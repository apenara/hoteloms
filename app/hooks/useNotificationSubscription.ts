// src/hooks/useNotificationSubscription.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  requestNotificationPermission,
  onMessageListener,
} from "@/lib/firebase/config";
import { NOTIFICATION_TOPICS } from "../lib/constants/notifications";
import { useToast } from "./use-toast";
import { subscribeToTopic } from "../services/notificationService";

export function useNotificationSubscription() {
  const { user, staff } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Verificar si estamos en una vista de staff o en una página donde realmente
    // necesitamos notificaciones - para las vistas públicas no las solicitamos
    const isPublicStaffView =
      window.location.pathname.includes("/rooms/") ||
      window.location.pathname.includes("/housekeeping/");

    // No solicitar notificaciones en vistas públicas para el staff
    if (isPublicStaffView) {
      return;
    }

    async function initializeNotifications() {
      try {
        // Verificar si ya tenemos token en sessionStorage
        const cachedToken = sessionStorage.getItem("fcm_token");
        if (cachedToken) {
          setToken(cachedToken);
          setNotificationsEnabled(true);
          return;
        }

        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          setToken(fcmToken);
          setNotificationsEnabled(true);

          // Guardar en sessionStorage
          sessionStorage.setItem("fcm_token", fcmToken);

          // Suscribir al tema del hotel
          if (user?.hotelId) {
            await subscribeToTopic(fcmToken, `hotel_${user.hotelId}`);
          }

          // Suscribir a temas según el rol
          if (staff?.role) {
            switch (staff.role) {
              case "housekeeper":
                await subscribeToTopic(
                  fcmToken,
                  NOTIFICATION_TOPICS.HOUSEKEEPING.STAFF
                );
                break;
              case "maintenance":
                await subscribeToTopic(
                  fcmToken,
                  NOTIFICATION_TOPICS.MAINTENANCE.STAFF
                );
                break;
              case "manager":
                // Los managers reciben todas las notificaciones
                await Promise.all([
                  subscribeToTopic(
                    fcmToken,
                    NOTIFICATION_TOPICS.HOUSEKEEPING.SUPERVISORS
                  ),
                  subscribeToTopic(
                    fcmToken,
                    NOTIFICATION_TOPICS.MAINTENANCE.SUPERVISORS
                  ),
                  subscribeToTopic(
                    fcmToken,
                    NOTIFICATION_TOPICS.RECEPTION.MANAGERS
                  ),
                ]);
                break;
            }
          }
        }
      } catch (error) {
        console.error("Error inicializando notificaciones:", error);
        setNotificationsEnabled(false);
      }
    }

    // Solo inicializar notificaciones en vistas administrativas
    if ((user?.hotelId || staff?.id) && !isPublicStaffView) {
      initializeNotifications();
    }

    // Configurar el listener de mensajes en primer plano
    const unsubscribe = onMessageListener((payload) => {
      // Mostrar toast para notificaciones en primer plano
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
        duration: 5000,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.hotelId, staff?.id, staff?.role]);

  return {
    token,
    notificationsEnabled,
    requestPermission: async () => {
      const fcmToken = await requestNotificationPermission();
      setToken(fcmToken);
      setNotificationsEnabled(!!fcmToken);
      return fcmToken;
    },
  };
}

// Ejemplo de uso en un componente:
/*
function MyComponent() {
  const { notificationsEnabled, requestPermission } = useNotificationSubscription();

  return (
    <div>
      {!notificationsEnabled && (
        <Button onClick={requestPermission}>
          Activar Notificaciones
        </Button>
      )}
    </div>
  );
}
*/
