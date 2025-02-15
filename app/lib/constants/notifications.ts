// src/lib/constants/notifications.ts

// Tipos de notificaciones por módulo
export const NOTIFICATION_TYPES = {
    HOUSEKEEPING: {
      NEW_CLEANING_REQUEST: 'new_cleaning_request',
      CLEANING_COMPLETED: 'cleaning_completed',
      INSPECTION_NEEDED: 'inspection_needed',
      ROOM_READY: 'room_ready',
      DO_NOT_DISTURB: 'do_not_disturb'
    },
    MAINTENANCE: {
      NEW_REQUEST: 'maintenance_new_request',
      HIGH_PRIORITY: 'maintenance_high_priority',
      COMPLETED: 'maintenance_completed',
      DELAYED: 'maintenance_delayed'
    },
    RECEPTION: {
      NEW_CHECKIN: 'reception_new_checkin',
      NEW_CHECKOUT: 'reception_new_checkout',
      ROOM_STATUS_CHANGE: 'room_status_change',
      VIP_GUEST: 'vip_guest_alert'
    },
    GUEST_REQUESTS: {
      NEW_REQUEST: 'guest_new_request',
      TOWELS_NEEDED: 'towels_needed',
      AMENITIES_NEEDED: 'amenities_needed',
      GENERAL_REQUEST: 'general_request'
    }
  } as const;
  
  // Temas de notificaciones por rol
  export const NOTIFICATION_TOPICS = {
    ALL_STAFF: 'all_staff',
    HOUSEKEEPING: {
      ALL: 'housekeeping_all',
      SUPERVISORS: 'housekeeping_supervisors',
      STAFF: 'housekeeping_staff'
    },
    MAINTENANCE: {
      ALL: 'maintenance_all',
      SUPERVISORS: 'maintenance_supervisors',
      STAFF: 'maintenance_staff'
    },
    RECEPTION: {
      ALL: 'reception_all',
      MANAGERS: 'reception_managers',
      STAFF: 'reception_staff'
    }
  } as const;
  
  // Plantillas de notificaciones
  export const NOTIFICATION_TEMPLATES = {
    [NOTIFICATION_TYPES.HOUSEKEEPING.NEW_CLEANING_REQUEST]: {
      title: 'Nueva solicitud de limpieza',
      body: 'Habitación {roomNumber} requiere limpieza',
      icon: '/icons/cleaning.png',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.MAINTENANCE.NEW_REQUEST]: {
      title: 'Nueva solicitud de mantenimiento',
      body: 'Habitación {roomNumber}: {issueDescription}',
      icon: '/icons/maintenance.png',
      priority: 'default'
    },
    [NOTIFICATION_TYPES.MAINTENANCE.HIGH_PRIORITY]: {
      title: '⚠️ Mantenimiento Urgente',
      body: 'Habitación {roomNumber}: {issueDescription}',
      icon: '/icons/maintenance-urgent.png',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.RECEPTION.NEW_CHECKIN]: {
      title: 'Nuevo Check-in',
      body: 'Check-in pendiente: Habitación {roomNumber}',
      icon: '/icons/checkin.png',
      priority: 'default'
    }
  } as const;
  
  // Configuración de prioridades
  export const PRIORITY_LEVELS = {
    LOW: 'low',
    DEFAULT: 'default',
    HIGH: 'high'
  } as const;
  
  // Función auxiliar para formatear mensajes
  export function formatNotificationMessage(
    template: string,
    params: Record<string, string | number>
  ): string {
    return template.replace(
      /{(\w+)}/g,
      (match, key) => params[key]?.toString() || match
    );
  }
  
  // Interfaz para el payload de notificaciones
  export interface NotificationPayload {
    type: keyof typeof NOTIFICATION_TYPES;
    title: string;
    body: string;
    icon?: string;
    priority?: keyof typeof PRIORITY_LEVELS;
    data?: {
      roomId?: string;
      roomNumber?: string;
      requestId?: string;
      url?: string;
      [key: string]: any;
    };
  }
  
  // Ejemplo de uso:
  /*
  const notification = {
    type: NOTIFICATION_TYPES.HOUSEKEEPING.NEW_CLEANING_REQUEST,
    ...NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.HOUSEKEEPING.NEW_CLEANING_REQUEST],
    data: {
      roomNumber: '101',
      roomId: 'room-id-123',
      url: '/housekeeping/rooms/101'
    }
  };
  */