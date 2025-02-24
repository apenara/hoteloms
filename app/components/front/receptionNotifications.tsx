import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  updateDoc,
  doc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BedDouble, 
  CheckCircle, 
  Clock,
  Bell,
  Timer,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/app/hooks/use-toast';

interface ReceptionNotification {
  id: string;
  type: string;
  roomId: string;
  roomNumber: string;
  message: string;
  timestamp: Timestamp;
  status: 'unread' | 'read';
  priority: 'low' | 'normal' | 'high';
  details?: any;
  alertLevel?: number;
  createdAt: Timestamp;
  lastAlertAt?: Timestamp;
}

interface ReceptionNotificationsProps {
  hotelId: string;
  onRoomClick?: (roomId: string) => void;
}

export function ReceptionNotifications({ 
  hotelId,
  onRoomClick 
}: ReceptionNotificationsProps) {
  const [notifications, setNotifications] = useState<ReceptionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Función para calcular el tiempo transcurrido en minutos
  const getElapsedMinutes = (timestamp: Timestamp) => {
    if (!timestamp) return 0;
    const now = new Date().getTime();
    const notificationTime = timestamp.toDate().getTime();
    return Math.floor((now - notificationTime) / (1000 * 60));
  };

  // Función para crear una alerta
  const createAlert = async (notification: ReceptionNotification, type: 'warning' | 'urgent') => {
    try {
      const alertsRef = collection(db, 'hotels', hotelId, 'alerts');
      const notificationRef = doc(db, 'hotels', hotelId, 'notifications', notification.id);
      const now = Timestamp.now();

      const alertMessage = type === 'urgent' 
        ? `¡URGENTE! Solicitud sin atender por más de 10 minutos - Habitación ${notification.roomNumber}`
        : `Advertencia: Solicitud pendiente por más de 5 minutos - Habitación ${notification.roomNumber}`;

      // Crear la alerta
      await addDoc(alertsRef, {
        type,
        message: alertMessage,
        notificationId: notification.id,
        roomNumber: notification.roomNumber,
        createdAt: now,
        status: 'active'
      });

      // Actualizar la notificación
      await updateDoc(notificationRef, {
        alertLevel: type === 'urgent' ? 2 : 1,
        priority: type === 'urgent' ? 'high' : 'normal',
        lastAlertAt: now
      });

      // Mostrar toast
      toast({
        title: type === 'urgent' ? "¡Solicitud Urgente!" : "Advertencia",
        description: alertMessage,
        variant: type === 'urgent' ? "destructive" : "default",
        duration: 10000
      });
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  // Función para verificar y actualizar alertas
  const checkNotificationAlerts = async (notification: ReceptionNotification) => {
    if (notification.status === 'read') return;

    const elapsedMinutes = getElapsedMinutes(notification.createdAt);
    const lastAlertMinutes = notification.lastAlertAt ? 
      getElapsedMinutes(notification.lastAlertAt) : elapsedMinutes;

    // Verificar si han pasado 10 minutos y no se ha enviado alerta urgente
    if (elapsedMinutes >= 10 && (!notification.alertLevel || notification.alertLevel < 2)) {
      await createAlert(notification, 'urgent');
    }
    // Verificar si han pasado 5 minutos y no se ha enviado primera alerta
    else if (elapsedMinutes >= 5 && (!notification.alertLevel || notification.alertLevel < 1)) {
      await createAlert(notification, 'warning');
    }
  };

  useEffect(() => {
    if (!hotelId) return;

    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('status', '==', 'unread'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReceptionNotification[];
      
      setNotifications(notificationsData);
      setLoading(false);

      // Verificar alertas para cada notificación al cargar
      notificationsData.forEach(notification => {
        checkNotificationAlerts(notification);
      });
    });

    return () => unsubscribe();
  }, [hotelId]);

  // Efecto para verificar alertas periódicamente
  useEffect(() => {
    const intervalId = setInterval(() => {
      notifications.forEach(notification => {
        if (notification.status === 'unread') {
          checkNotificationAlerts(notification);
        }
      });
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(intervalId);
  }, [notifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'hotels', hotelId, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
        readAt: Timestamp.now(),
        alertLevel: 0 // Resetear nivel de alerta
      });

      toast({
        title: "Solicitud atendida",
        description: "La solicitud ha sido marcada como atendida",
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo marcar la solicitud como atendida",
      });
    }
  };

  const getNotificationStyle = (notification: ReceptionNotification) => {
    if (notification.alertLevel === 2) {
      return 'bg-red-50 border-red-200 border-2';
    }
    if (notification.alertLevel === 1) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return notification.status === 'unread' ? 'bg-blue-50' : '';
  };

  const getNotificationIcon = (type: string, alertLevel: number = 0) => {
    if (alertLevel === 2) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (alertLevel === 1) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }

    switch (type) {
      case 'guest_request':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'maintenance':
        return <Timer className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const formatElapsedTime = (timestamp: Timestamp) => {
    const minutes = getElapsedMinutes(timestamp);
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <ScrollArea className="h-[500px]">
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No hay notificaciones nuevas
          </div>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${getNotificationStyle(notification)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.alertLevel)}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Habitación {notification.roomNumber}
                        </span>
                        {notification.alertLevel > 0 && (
                          <Badge 
                            variant={notification.alertLevel === 2 ? "destructive" : "warning"}
                            className="animate-pulse"
                          >
                            {notification.alertLevel === 2 ? '¡URGENTE!' : 'Atención requerida'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span className={`${notification.alertLevel === 2 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          {formatElapsedTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        variant={notification.alertLevel === 2 ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Marcar como atendido
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onRoomClick?.(notification.roomId)}
                      >
                        Ver habitación
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );
}