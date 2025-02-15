// src/services/notificationService.ts
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
}

interface NotificationTarget {
  hotelId: string;
  userId?: string;
  role?: string;
  topic?: string;
}

export async function sendNotification(
  payload: NotificationPayload,
  target: NotificationTarget
) {
  try {
    // Guardar la notificación en Firestore
    const notificationRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationRef, {
      ...payload,
      ...target,
      status: 'pending',
      createdAt: serverTimestamp(),
      type: 'push'
    });

    // Enviar la notificación a través de la API
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload,
        target,
        notificationId: notificationDoc.id
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al enviar la notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en sendNotification:', error);
    throw error;
  }
}

export async function subscribeToTopic(token: string, topic: string) {
  try {
    // Validar el token y el topic
    if (!token || !topic) {
      throw new Error('Token y topic son requeridos');
    }

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        topic
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al suscribirse al tema');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en subscribeToTopic:', error);
    throw error;
  }
}

export async function unsubscribeFromTopic(token: string, topic: string) {
  try {
    if (!token || !topic) {
      throw new Error('Token y topic son requeridos');
    }

    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        topic
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al desuscribirse del tema');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en unsubscribeFromTopic:', error);
    throw error;
  }
}