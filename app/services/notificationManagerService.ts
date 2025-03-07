"use client";

import { oneSignalService } from './oneSignalService';

/**
 * Tipos de solicitudes que pueden generar notificaciones
 */
export enum RequestType {
  NEED_TOWELS = 'need_towels',
  NEED_CLEANING = 'need_cleaning',
  DO_NOT_DISTURB = 'do_not_disturb',
  GUEST_MESSAGE = 'guest_message',
  MAINTENANCE = 'maintenance_request',
  ROOM_READY = 'room_ready',
  CHECKOUT_REQUEST = 'checkout_request',
  GENERAL_ALERT = 'general_alert'
}

/**
 * Define la audiencia objetivo de una notificación
 */
interface NotificationAudience {
  hotelId: string;
  roles?: string[];
  specificUserIds?: string[];
}

/**
 * Servicio para gestionar las notificaciones según el tipo de solicitud
 */
export const notificationManagerService = {
  /**
   * Determina los roles que deben recibir una notificación según el tipo
   * @param requestType Tipo de solicitud
   */
  getRolesForRequestType(requestType: RequestType): string[] {
    // Configura aquí a qué roles debe ir cada tipo de solicitud
    const roleMatrix: Record<RequestType, string[]> = {
      [RequestType.NEED_TOWELS]: ['front', 'housekeeping', 'reception'],
      [RequestType.NEED_CLEANING]: ['housekeeping', 'reception'],
      [RequestType.DO_NOT_DISTURB]: ['housekeeping', 'reception'],
      [RequestType.GUEST_MESSAGE]: ['front', 'reception'],
      [RequestType.MAINTENANCE]: ['maintenance', 'manager'],
      [RequestType.ROOM_READY]: ['reception', 'housekeeping'],
      [RequestType.CHECKOUT_REQUEST]: ['reception', 'front'],
      [RequestType.GENERAL_ALERT]: ['manager', 'admin', 'superadmin']
    };

    return roleMatrix[requestType] || ['reception']; // por defecto a recepción
  },

  /**
   * Envía una notificación basada en un tipo de solicitud
   * @param requestType Tipo de solicitud que genera la notificación
   * @param audience Audiencia objetivo (hotel y opcionalmente roles específicos)
   * @param details Detalles de la notificación
   */
  async sendRequestNotification(
    requestType: RequestType,
    audience: NotificationAudience,
    details: {
      title: string;
      message: string;
      roomNumber?: string;
      data?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      // Determinar qué roles deben recibir la notificación
      const targetRoles = audience.roles || this.getRolesForRequestType(requestType);

      // Preparar los datos adicionales
      const notificationData = {
        requestType,
        hotelId: audience.hotelId,
        roomNumber: details.roomNumber,
        timestamp: new Date().toISOString(),
        ...details.data
      };

      // Preparar los filtros para OneSignal (usando tags)
      const filters = [
        { field: "tag", key: `hotel-${audience.hotelId}`, relation: "=", value: "true" },
        { operator: "OR" }
      ];

      // Agregar filtros por rol
      targetRoles.forEach((role, index) => {
        if (index > 0) {
          filters.push({ operator: "OR" });
        }
        filters.push({ field: "tag", key: "role", relation: "=", value: role });
      });

      // Llamada a nuestro endpoint específico para OneSignal
      const response = await fetch('/api/onesignal/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: filters,
          title: details.title,
          message: details.message,
          data: notificationData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const result = await response.json();
      return !!result.success;
    } catch (error) {
      console.error('Error sending request notification:', error);
      return false;
    }
  },

  /**
   * Envía una notificación específica para solicitud de toallas
   */
  async sendTowelRequest(
    hotelId: string,
    roomNumber: string,
    guestName?: string
  ): Promise<boolean> {
    const title = "Solicitud de Toallas";
    const message = guestName 
      ? `${guestName} en habitación ${roomNumber} solicitó toallas`
      : `Habitación ${roomNumber} solicitó toallas`;

    return this.sendRequestNotification(
      RequestType.NEED_TOWELS,
      { hotelId },
      {
        title,
        message,
        roomNumber,
        data: { guestName }
      }
    );
  },

  /**
   * Envía una notificación específica para solicitud de limpieza
   */
  async sendCleaningRequest(
    hotelId: string,
    roomNumber: string,
    guestName?: string
  ): Promise<boolean> {
    const title = "Solicitud de Limpieza";
    const message = guestName 
      ? `${guestName} en habitación ${roomNumber} solicitó limpieza`
      : `Habitación ${roomNumber} solicitó limpieza`;

    return this.sendRequestNotification(
      RequestType.NEED_CLEANING,
      { hotelId },
      {
        title,
        message,
        roomNumber,
        data: { guestName }
      }
    );
  },

  /**
   * Envía una notificación de mensaje de huésped
   */
  async sendGuestMessage(
    hotelId: string,
    roomNumber: string,
    messageText: string,
    guestName?: string
  ): Promise<boolean> {
    const title = "Mensaje de Huésped";
    const message = guestName
      ? `Mensaje de ${guestName} (Hab. ${roomNumber}): ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`
      : `Mensaje de Hab. ${roomNumber}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`;

    return this.sendRequestNotification(
      RequestType.GUEST_MESSAGE,
      { hotelId },
      {
        title,
        message,
        roomNumber,
        data: { guestName, fullMessage: messageText }
      }
    );
  },

  /**
   * Envía una notificación de solicitud de mantenimiento
   */
  async sendMaintenanceRequest(
    hotelId: string,
    roomNumber: string,
    issue: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<boolean> {
    const priorityText = 
      priority === 'high' ? '🔴 URGENTE' : 
      priority === 'medium' ? '🟠 Normal' : '🟢 Baja';

    const title = `Mantenimiento ${priorityText}`;
    const message = `Hab. ${roomNumber}: ${issue.substring(0, 100)}${issue.length > 100 ? '...' : ''}`;

    return this.sendRequestNotification(
      RequestType.MAINTENANCE,
      { hotelId },
      {
        title,
        message,
        roomNumber,
        data: { priority, issue }
      }
    );
  }
};