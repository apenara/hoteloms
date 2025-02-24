// src/services/guestNotificationService.ts
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
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

interface SendGuestRequestNotificationProps {
  type: string;
  hotelId: string;
  roomNumber: string;
  roomId: string;
  message?: string;
}

export async function sendGuestRequestNotification({
  type,
  hotelId,
  roomNumber,
  roomId,
  message = ''
}: SendGuestRequestNotificationProps) {
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
    const timestamp = Timestamp.now();

    if (tokens.length === 0) {
      console.log('No hay tokens disponibles para notificar');
    }

    //Get all the users with the notification config role
    const staffRef = collection(db, 'hotels', hotelId, 'staff');
    const staffQuery = query(staffRef, where('role', '==', notificationConfig.role));
    const staffSnapshot = await getDocs(staffQuery);

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
    
    // 3. save notifications in the database.
    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const notificationPromises = staffSnapshot.docs.map(async (doc) => {
      const staffMember = doc.data();
      await addDoc(notificationsRef, {
        type: type,
        message: message ? message: `Nueva solicitud de ${type} - Habitación ${roomNumber}`, // Default message
        roomId: roomId,
        roomNumber: roomNumber,
        timestamp: timestamp,
        status: 'unread',
        priority: type === 'need_cleaning' ? 'high' : 'normal',
        targetRole: notificationConfig.role,
        targetStaffId: staffMember.id, // Add specific staff member id
        createdAt: timestamp,
        alertLevel: 0, // Set initial alert level
      });
    });
    await Promise.all(notificationPromises);

    // 4. Send the notification
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
