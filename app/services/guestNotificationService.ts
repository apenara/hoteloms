// src/services/guestNotificationService.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const NOTIFICATION_TYPES = {
  need_cleaning: {
    title: 'Nueva solicitud de limpieza',
    body: 'Habitación {roomNumber} solicita servicio de limpieza',
    role: 'housekeeper'
  },
  need_towels: {
    title: 'Solicitud de toallas',
    body: 'Habitación {roomNumber} necesita toallas adicionales',
    role: 'housekeeper'
  },
  guest_request: {
    title: 'Nuevo mensaje del huésped',
    body: 'Habitación {roomNumber} envió un mensaje',
    role: 'reception'
  },
  do_not_disturb: {
    title: 'No molestar activado',
    body: 'Habitación {roomNumber} activó No Molestar',
    role: 'housekeeper'
  }
};

export async function sendGuestRequestNotification({
  type,
  hotelId,
  roomNumber,
  roomId,
  message = ''
}) {
  try {
    const notificationConfig = NOTIFICATION_TYPES[type];
    if (!notificationConfig) {
      throw new Error('Tipo de notificación no válido');
    }

    // 1. Obtener tokens de los usuarios del rol correspondiente
    const tokensRef = collection(db, 'notification_tokens');
    const q = query(
      tokensRef,
      where('hotelId', '==', hotelId),
      where('role', '==', notificationConfig.role)
    );
    
    const snapshot = await getDocs(q);
    const tokens = snapshot.docs.map(doc => doc.data().token);

    if (tokens.length === 0) {
      console.log('No hay tokens disponibles para notificar');
      return;
    }

    // 2. Preparar el payload de la notificación
    const payload = {
      notification: {
        title: notificationConfig.title,
        body: notificationConfig.body.replace('{roomNumber}', roomNumber)
      },
      data: {
        type,
        hotelId,
        roomId,
        roomNumber: roomNumber.toString(),
        message,
        url: `/rooms/${hotelId}/${roomId}/staff`
      },
      tokens
    };

    // 3. Enviar la notificación
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Error al enviar notificación');
    }

    const result = await response.json();
    return result.success;

  } catch (error) {
    console.error('Error sending guest notification:', error);
    return false;
  }
}