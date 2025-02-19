// src/services/notificationService.ts
import { db } from '@/lib/firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

interface NotificationPayload {
  title: string;
  body: string;
  type: 'maintenance' | 'housekeeping' | 'reception' | 'guest_request';
  hotelId: string;
  roomId?: string;
  roomNumber?: string;
  priority?: 'high' | 'normal';
  data?: Record<string, string>;
}

interface NotificationToken {
  token: string;
  userId: string;
  role: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: Date;
}

export class NotificationService {
  private static instance: NotificationService;
  private fcmPublicKey = process.env.NEXT_PUBLIC_FCM_PUBLIC_KEY;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async registerToken(token: string, userId: string, role: string): Promise<void> {
    try {
      const tokensRef = collection(db, 'notification_tokens');
      const q = query(tokensRef, where('userId', '==', userId), where('token', '==', token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await addDoc(tokensRef, {
          token,
          userId,
          role,
          platform: 'web',
          createdAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error registering token:', error);
      throw error;
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const { hotelId, type, title, body, data } = payload;

      // 1. Guardar la notificación en Firestore
      const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
      await addDoc(notificationsRef, {
        ...payload,
        createdAt: Timestamp.now(),
        status: 'pending'
      });

      // 2. Enviar a través de Cloud Functions
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Error sending notification');
      }
    } catch (error) {
      console.error('Error in sendNotification:', error);
      throw error;
    }
  }

  async getNotifications(hotelId: string, userId: string): Promise<any[]> {
    try {
      const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }
}

export const notificationService = NotificationService.getInstance();