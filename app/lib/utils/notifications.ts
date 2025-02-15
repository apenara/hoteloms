// src/lib/utils/notifications.ts
import { 
    NOTIFICATION_TYPES, 
    NOTIFICATION_TEMPLATES,
    NOTIFICATION_TOPICS,
    formatNotificationMessage
  } from '../constants/notifications';
  import { sendNotification } from '../../services/notificationService'; // Ensure this path is correct or update it to the correct path
  
  interface SendHousekeepingNotificationParams {
    hotelId: string;
    roomNumber: string;
    roomId: string;
    type: keyof typeof NOTIFICATION_TYPES.HOUSEKEEPING;
    additionalData?: Record<string, any>;
  }
  
  interface SendMaintenanceNotificationParams {
    hotelId: string;
    roomNumber: string;
    roomId: string;
    type: keyof typeof NOTIFICATION_TYPES.MAINTENANCE;
    description: string;
    priority?: 'high' | 'default' | 'low';
    additionalData?: Record<string, any>;
  }
  
  interface SendReceptionNotificationParams {
    hotelId: string;
    roomNumber: string;
    roomId: string;
    type: keyof typeof NOTIFICATION_TYPES.RECEPTION;
    additionalData?: Record<string, any>;
  }
  
  // Función para enviar notificaciones de limpieza
  export async function sendHousekeepingNotification({
    hotelId,
    roomNumber,
    roomId,
    type,
    additionalData = {}
  }: SendHousekeepingNotificationParams) {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) throw new Error(`Template not found for type: ${type}`);
  
    const payload = {
      title: template.title,
      body: formatNotificationMessage(template.body, { roomNumber, ...additionalData }),
      icon: template.icon,
      priority: template.priority,
      data: {
        type,
        roomId,
        roomNumber,
        url: `/housekeeping/rooms/${roomNumber}`,
        ...additionalData
      }
    };
  
    return sendNotification(payload, {
      hotelId,
      topic: NOTIFICATION_TOPICS.HOUSEKEEPING.ALL
    });
  }
  
  // Función para enviar notificaciones de mantenimiento
  export async function sendMaintenanceNotification({
    hotelId,
    roomNumber,
    roomId,
    type,
    description,
    priority = 'default',
    additionalData = {}
  }: SendMaintenanceNotificationParams) {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) throw new Error(`Template not found for type: ${type}`);
  
    const payload = {
      title: template.title,
      body: formatNotificationMessage(template.body, { 
        roomNumber, 
        issueDescription: description,
        ...additionalData 
      }),
      icon: template.icon,
      priority: priority,
      data: {
        type,
        roomId,
        roomNumber,
        url: `/maintenance/requests/${roomNumber}`,
        ...additionalData
      }
    };
  
    // Si es alta prioridad, notificar a supervisores también
    if (priority === 'high') {
      await sendNotification(payload, {
        hotelId,
        topic: NOTIFICATION_TOPICS.MAINTENANCE.SUPERVISORS
      });
    }
  
    return sendNotification(payload, {
      hotelId,
      topic: NOTIFICATION_TOPICS.MAINTENANCE.ALL
    });
  }
  
  // Función para enviar notificaciones de recepción
  export async function sendReceptionNotification({
    hotelId,
    roomNumber,
    roomId,
    type,
    additionalData = {}
  }: SendReceptionNotificationParams) {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) throw new Error(`Template not found for type: ${type}`);
  
    const payload = {
      title: template.title,
      body: formatNotificationMessage(template.body, { roomNumber, ...additionalData }),
      icon: template.icon,
      priority: template.priority,
      data: {
        type,
        roomId,
        roomNumber,
        url: `/reception/rooms/${roomNumber}`,
        ...additionalData
      }
    };
  
    return sendNotification(payload, {
      hotelId,
      topic: NOTIFICATION_TOPICS.RECEPTION.ALL
    });
  }
  
  // Ejemplo de uso:
  /*
  // Para una nueva solicitud de limpieza
  await sendHousekeepingNotification({
    hotelId: 'hotel123',
    roomNumber: '101',
    roomId: 'room123',
    type: NOTIFICATION_TYPES.HOUSEKEEPING.NEW_CLEANING_REQUEST
  });
  
  // Para una solicitud urgente de mantenimiento
  await sendMaintenanceNotification({
    hotelId: 'hotel123',
    roomNumber: '205',
    roomId: 'room456',
    type: NOTIFICATION_TYPES.MAINTENANCE.HIGH_PRIORITY,
    description: 'Fuga de agua en el baño',
    priority: 'high'
  });
  */