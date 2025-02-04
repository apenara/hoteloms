'use client';

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
  Timestamp 
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
  AlertTriangle
} from 'lucide-react';

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

  useEffect(() => {
    if (!hotelId) return;

    // Query para notificaciones de recepción
    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('targetRole', 'in', ['reception', 'all']),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReceptionNotification[];
      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [hotelId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'hotels', hotelId, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
        readAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'room_ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cleaning_completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'maintenance_completed':
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      case 'cleaning_delayed':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'priority_cleaning':
        return <Timer className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const formatTimestamp = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} minutos`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Hace ${hours} horas`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              className={`transition-colors ${
                notification.status === 'unread' ? 'bg-blue-50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Habitación {notification.roomNumber}
                        </span>
                        <Badge 
                          className={getPriorityColor(notification.priority)}
                        >
                          {notification.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    {notification.details && (
                      <div className="mt-2 text-sm text-gray-500">
                        {notification.details.estimatedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Tiempo estimado: {notification.details.estimatedTime} min
                          </div>
                        )}
                        {notification.details.completedBy && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Completado por: {notification.details.completedBy}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex justify-end gap-2">
                      {notification.status === 'unread' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Marcar como leído
                        </Button>
                      )}
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