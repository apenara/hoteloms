// src/lib/services/notificationService.ts
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";

// Tipos de notificaciones
export enum NotificationType {
  MAINTENANCE_REQUEST = "maintenance_request",
  MAINTENANCE_ASSIGNED = "maintenance_assigned",
  HOUSEKEEPING_REQUEST = "housekeeping_request",
  GUEST_REQUEST = "guest_request",
}

// Interface para los tokens FCM
interface FCMToken {
  token: string;
  userId: string;
  hotelId: string;
  role: string;
  createdAt: Date;
  lastUpdated: Date;
}

// Interface para las suscripciones a notificaciones
interface NotificationSubscription {
  userId: string;
  hotelId: string;
  types: NotificationType[];
  role: string;
}

class NotificationService {
  private readonly vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  // Registrar token FCM para un usuario
  async registerFCMToken(
    userId: string,
    hotelId: string,
    role: string
  ): Promise<string> {
    try {
      const messaging = getMessaging();
      const currentToken = await getToken(messaging, {
        vapidKey: this.vapidKey,
      });

      if (!currentToken) {
        throw new Error("No se pudo obtener el token FCM");
      }

      // Guardar token en Firestore
      const tokenRef = doc(db, "fcm_tokens", currentToken);
      await setDoc(tokenRef, {
        token: currentToken,
        userId,
        hotelId,
        role,
        createdAt: new Date(),
        lastUpdated: new Date(),
      });

      return currentToken;
    } catch (error) {
      console.error("Error al registrar token FCM:", error);
      throw error;
    }
  }

  // Obtener tokens FCM por rol y hotel
  async getFCMTokensByRoleAndHotel(
    role: string,
    hotelId: string
  ): Promise<string[]> {
    try {
      const tokensRef = collection(db, "fcm_tokens");
      const q = query(
        tokensRef,
        where("role", "==", role),
        where("hotelId", "==", hotelId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data().token);
    } catch (error) {
      console.error("Error al obtener tokens FCM:", error);
      throw error;
    }
  }

  // Enviar notificación de mantenimiento
  async sendMaintenanceNotification(
    hotelId: string,
    requestId: string,
    title: string,
    body: string,
    data: any
  ) {
    try {
      // Obtener tokens de administradores del hotel
      const adminTokens = await this.getFCMTokensByRoleAndHotel(
        "hotel_admin",
        hotelId
      );

      if (adminTokens.length === 0) {
        console.log(
          "No hay administradores registrados para recibir notificaciones"
        );
        return;
      }

      // Enviar notificación a través de Cloud Functions
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokens: adminTokens,
          notification: {
            title,
            body,
          },
          data: {
            type: NotificationType.MAINTENANCE_REQUEST,
            requestId,
            hotelId,
            ...data,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar notificación");
      }

      return response.json();
    } catch (error) {
      console.error("Error al enviar notificación de mantenimiento:", error);
      throw error;
    }
  }

  // Enviar notificación a personal de mantenimiento asignado
  async sendMaintenanceAssignmentNotification(
    hotelId: string,
    staffId: string,
    requestId: string,
    title: string,
    body: string
  ) {
    try {
      // Obtener tokens del personal de mantenimiento
      const tokensRef = collection(db, "fcm_tokens");
      const q = query(
        tokensRef,
        where("userId", "==", staffId),
        where("hotelId", "==", hotelId)
      );

      const snapshot = await getDocs(q);
      const tokens = snapshot.docs.map((doc) => doc.data().token);

      if (tokens.length === 0) {
        console.log("El personal de mantenimiento no tiene tokens registrados");
        return;
      }

      // Enviar notificación
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokens,
          notification: {
            title,
            body,
          },
          data: {
            type: NotificationType.MAINTENANCE_ASSIGNED,
            requestId,
            hotelId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar notificación");
      }

      return response.json();
    } catch (error) {
      console.error("Error al enviar notificación de asignación:", error);
      throw error;
    }
  }

  // Eliminar token FCM
  async removeFCMToken(token: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "fcm_tokens", token));
    } catch (error) {
      console.error("Error al eliminar token FCM:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
