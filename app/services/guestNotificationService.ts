// src/services/guestNotificationService.ts
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { notificationManagerService, RequestType } from './notificationManagerService';

// Mapa de tipos de notificación con sus configuraciones
const NOTIFICATION_TYPES = {
  need_cleaning: {
    title: 'Nueva solicitud de limpieza',
    body: 'Habitación {roomNumber} solicita servicio de limpieza',
    role: 'housekeeping',
    requestType: RequestType.NEED_CLEANING
  },
  need_towels: {
    title: 'Solicitud de toallas',
    body: 'Habitación {roomNumber} necesita toallas adicionales',
    role: 'housekeeping',
    requestType: RequestType.NEED_TOWELS
  },
  guest_request: {
    title: 'Nuevo mensaje del huésped',
    body: 'Habitación {roomNumber} envió un mensaje',
    role: 'reception',
    requestType: RequestType.GUEST_MESSAGE
  },
  do_not_disturb: {
    title: 'No molestar activado',
    body: 'Habitación {roomNumber} activó No Molestar',
    role: 'housekeeping',
    requestType: RequestType.DO_NOT_DISTURB
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

    const timestamp = Timestamp.now();

    // 1. Guardar la notificación en Firestore para cada miembro del personal objetivo
    const staffRef = collection(db, 'hotels', hotelId, 'staff');
    const staffQuery = query(staffRef, where('role', '==', notificationConfig.role));
    const staffSnapshot = await getDocs(staffQuery);

    // Guardar notificaciones en la base de datos
    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const notificationPromises = staffSnapshot.docs.map(async (doc) => {
      const staffMember = doc.data();
      await addDoc(notificationsRef, {
        type: type,
        message: message ? message : `Nueva solicitud de ${type} - Habitación ${roomNumber}`,
        roomId: roomId,
        roomNumber: roomNumber,
        timestamp: timestamp,
        status: 'unread',
        priority: type === 'need_cleaning' ? 'high' : 'normal',
        targetRole: notificationConfig.role,
        targetStaffId: staffMember.id,
        createdAt: timestamp,
        alertLevel: 0,
      });
    });
    await Promise.all(notificationPromises);

    // 2. Enviar notificación push usando OneSignal a través de nuestro servicio gestor
    let result = false;

    // Usar el servicio apropiado según el tipo de solicitud
    switch (notificationConfig.requestType) {
      case RequestType.NEED_TOWELS:
        result = await notificationManagerService.sendTowelRequest(hotelId, roomNumber);
        break;
      
      case RequestType.NEED_CLEANING:
        result = await notificationManagerService.sendCleaningRequest(hotelId, roomNumber);
        break;
      
      case RequestType.GUEST_MESSAGE:
        result = await notificationManagerService.sendGuestMessage(hotelId, roomNumber, message);
        break;
      
      case RequestType.DO_NOT_DISTURB:
        // Para solicitudes de "No molestar", usamos el método genérico
        result = await notificationManagerService.sendRequestNotification(
          RequestType.DO_NOT_DISTURB,
          { hotelId },
          {
            title: "No Molestar Activado",
            message: `Habitación ${roomNumber} ha activado No Molestar`,
            roomNumber,
            data: { timestamp: timestamp.toDate().toISOString() }
          }
        );
        break;
      
      default:
        // Método genérico para otros tipos de solicitudes
        result = await notificationManagerService.sendRequestNotification(
          notificationConfig.requestType || RequestType.GENERAL_ALERT,
          { hotelId },
          {
            title: notificationConfig.title,
            message: notificationConfig.body.replace('{roomNumber}', roomNumber),
            roomNumber,
            data: { 
              type, 
              message,
              roomId,
              url: `/rooms/${hotelId}/${roomId}/staff` 
            }
          }
        );
    }

    return result;

  } catch (error) {
    console.error('Error sending guest notification:', error);
    return false;
  }
}
