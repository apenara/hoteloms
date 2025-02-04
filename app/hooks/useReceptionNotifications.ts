// src/hooks/useReceptionNotifications.ts
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from './use-toast';

interface Notification {
  id: string;
  type: string;
  roomNumber: string;
  message?: string;
  createdAt: Timestamp;
  status: 'pending' | 'completed';
}

export function useReceptionNotifications(hotelId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    // Crear elemento de audio
    // audioRef.current = new Audio('/notification-sound.mp3'); // Asegúrate de tener este archivo en public/
    
    if (!hotelId) return;

    const requestsRef = collection(db, 'hotels', hotelId, 'requests');
    const q = query(
      requestsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);

      // Verificar si hay nuevas notificaciones
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data() as Notification;
          
          // Evitar duplicados al recargar la página
          if (lastNotificationRef.current !== change.doc.id) {
            lastNotificationRef.current = change.doc.id;
            
            // Reproducir sonido
            if (audioRef.current) {
              audioRef.current.play().catch(error => {
                console.log('Error reproduciendo sonido:', error);
              });
            }

            // Mostrar toast
            toast({
              title: "Nueva Solicitud",
              description: `Habitación ${notification.roomNumber} - ${notification.type}`,
              duration: 5000,
            });
          }
        }
      });
    });

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [hotelId]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}