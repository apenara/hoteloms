"use client";

/**
 * Servicio para manejar notificaciones push con OneSignal
 */
export const oneSignalService = {
  /**
   * Solicita permiso y registra el dispositivo para recibir notificaciones
   * @returns {Promise<string|null>} ID de suscripción o null si falla
   */
  async requestPermission(): Promise<string | null> {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        console.error('OneSignal no está inicializado');
        return null;
      }

      // Verificar si el navegador soporta notificaciones push
      if (!('Notification' in window)) {
        console.log('Este navegador no soporta notificaciones');
        return null;
      }

      // Solicitar permiso si no está otorgado
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Permiso de notificación denegado');
          return null;
        }
      }

      // Registrar al usuario en OneSignal
      await window.OneSignal.showSlidedownPrompt();
      
      // Obtener el ID de suscripción
      const deviceState = await window.OneSignal.getDeviceState();
      return deviceState?.userId || null;
    } catch (error) {
      console.error('Error al registrar para notificaciones:', error);
      return null;
    }
  },

  /**
   * Establece etiquetas para el usuario actual (útil para segmentación)
   * @param {Record<string, string>} tags Etiquetas a establecer
   */
  async setTags(tags: Record<string, string>): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        console.error('OneSignal no está inicializado');
        return;
      }

      await window.OneSignal.sendTags(tags);
      console.log('Etiquetas establecidas exitosamente:', tags);
    } catch (error) {
      console.error('Error al establecer etiquetas:', error);
    }
  },

  /**
   * Suscribe al usuario a un tópico específico (por ej. hotel-id)
   * @param {string} topic ID del tema (hotel, habitación, etc.)
   */
  async subscribeToTopic(topic: string): Promise<void> {
    await this.setTags({ [topic]: 'true' });
  },

  /**
   * Desuscribe al usuario de un tópico
   * @param {string} topic ID del tema 
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    await this.setTags({ [topic]: 'false' });
  },

  /**
   * Establece el ID externo para el usuario (para vincular con usuarios de tu aplicación)
   * @param {string} userId ID del usuario en tu sistema
   */
  async setExternalUserId(userId: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        console.error('OneSignal no está inicializado');
        return;
      }

      await window.OneSignal.setExternalUserId(userId);
      console.log('ID externo establecido:', userId);
    } catch (error) {
      console.error('Error al establecer ID externo:', error);
    }
  },
  
  /**
   * Verifica si las notificaciones están habilitadas
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return false;
      }
      
      const deviceState = await window.OneSignal.getDeviceState();
      return deviceState?.isPushEnabled || false;
    } catch (error) {
      console.error('Error al verificar estado de notificaciones:', error);
      return false;
    }
  },

  /**
   * Envía una notificación a un único usuario usando la REST API de OneSignal
   * (Nota: esto generalmente debe hacerse desde el servidor para seguridad)
   * @param {string} externalUserId ID del usuario en tu sistema
   * @param {string} title Título de la notificación
   * @param {string} message Mensaje de la notificación
   * @param {object} additionalData Datos adicionales para la notificación
   */
  async sendNotificationToUser(
    externalUserId: string,
    title: string,
    message: string,
    additionalData?: Record<string, any>
  ): Promise<boolean> {
    // Este tipo de operación es mejor hacerla desde el servidor por seguridad,
    // pero podemos implementar una función que llame a una API propia que luego
    // realice la solicitud a OneSignal. Aquí el esquema para Future Implementación:
    try {
      // Llamada a nuestro endpoint específico para OneSignal
      const response = await fetch('/api/onesignal/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: externalUserId,
          title,
          message,
          data: additionalData
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }
};