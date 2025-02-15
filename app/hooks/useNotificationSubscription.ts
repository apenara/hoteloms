// src/hooks/useNotificationSubscription.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { 
  requestNotificationPermission, 
  onMessageListener 
} from '@/lib/firebase/config';
import { NOTIFICATION_TOPICS } from '../lib/constants/notifications';
import { useToast } from './use-toast';
import { subscribeToTopic } from '../services/notificationService';

export function useNotificationSubscription() {
  const { user, staff } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    async function initializeNotifications() {
      try {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          setToken(fcmToken);
          setNotificationsEnabled(true);
          
          // Suscribir al tema del hotel
          if (user?.hotelId) {
            await subscribeToTopic(fcmToken, `hotel_${user.hotelId}`);
          }

          // Suscribir a temas según el rol
          if (staff?.role) {
            switch (staff.role) {
              case 'housekeeper':
                await subscribeToTopic(fcmToken, NOTIFICATION_TOPICS.HOUSEKEEPING.STAFF);
                break;
              case 'maintenance':
                await subscribeToTopic(fcmToken, NOTIFICATION_TOPICS.MAINTENANCE.STAFF);
                break;
              case 'manager':
                // Los managers reciben todas las notificaciones
                await Promise.all([
                  subscribeToTopic(fcmToken, NOTIFICATION_TOPICS.HOUSEKEEPING.SUPERVISORS),
                  subscribeToTopic(fcmToken, NOTIFICATION_TOPICS.MAINTENANCE.SUPERVISORS),
                  subscribeToTopic(fcmToken, NOTIFICATION_TOPICS.RECEPTION.MANAGERS)
                ]);
                break;
            }
          }
        }
      } catch (error) {
        console.error('Error inicializando notificaciones:', error);
        setNotificationsEnabled(false);
      }
    }

    if (user?.hotelId || staff?.id) {
      initializeNotifications();
    }

    // Configurar el listener de mensajes en primer plano
    const unsubscribe = onMessageListener((payload) => {
      // Mostrar toast para notificaciones en primer plano
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
        duration: 5000
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
    }
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