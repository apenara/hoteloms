// src/lib/services/maintenanceService.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Room } from "@/lib/types";
import { notificationService, NotificationType } from "./notificationService";
import { notificationManagerService, RequestType } from "./notificationManagerService";

interface CreateMaintenanceParams {
  hotelId: string;
  roomId: string;
  room: Room;
  notes: string;
  user: {
    uid: string;
    name: string;
    role: string;
  };
  previousState: {
    status: string;
    wasInCleaning: boolean;
    cleaningStaffId: string | null;
  };
}

export async function createMaintenanceRequest({
  hotelId,
  roomId,
  room,
  notes,
  user,
  previousState,
}: CreateMaintenanceParams) {
  const timestamp = Timestamp.now();

  try {
    // 1. Crear registro de mantenimiento
    const maintenanceRef = collection(db, "hotels", hotelId, "maintenance");
    const maintenanceDoc = await addDoc(maintenanceRef, {
      roomId,
      roomNumber: room.number,
      type: "corrective",
      category: "room",
      status: "pending",
      priority: "medium",
      location: `Habitación ${room.number}`,
      description: notes,
      createdAt: timestamp,
      source: "room_request",
      requestedBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
      },
      scheduledFor: timestamp,
      previousState,
      assignedTo: null,
    });

    // 2. Crear solicitud general
    const requestsRef = collection(db, "hotels", hotelId, "requests");
    await addDoc(requestsRef, {
      roomId,
      roomNumber: room.number,
      type: "maintenance",
      status: "pending",
      createdAt: timestamp,
      description: notes,
      maintenanceId: maintenanceDoc.id,
      requestedBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
      },
      priority: "medium",
    });

    // 3. Enviar notificación a los administradores
    await notificationService.sendMaintenanceNotification(
      hotelId,
      maintenanceDoc.id,
      "Nueva solicitud de mantenimiento",
      `La habitación ${room.number} requiere mantenimiento: ${notes}`,
      {
        url: `/hotel-admin/maintenance/${maintenanceDoc.id}`,
        roomNumber: room.number,
        priority: "medium",
      }
    );
    
    // 4. Enviar notificación push mediante OneSignal
    await notificationManagerService.sendMaintenanceRequest(
      hotelId,
      room.number.toString(),
      notes,
      "medium"
    );

    return maintenanceDoc.id;
  } catch (error) {
    console.error("Error al crear solicitud de mantenimiento:", error);
    throw error;
  }
}

export async function assignMaintenanceStaff(
  hotelId: string,
  maintenanceId: string,
  staffId: string,
  staffName: string
) {
  try {
    const timestamp = Timestamp.now();
    const maintenanceRef = doc(
      db,
      "hotels",
      hotelId,
      "maintenance",
      maintenanceId
    );

    // 1. Obtener datos actuales del mantenimiento
    const maintenanceDoc = await getDoc(maintenanceRef);
    if (!maintenanceDoc.exists()) {
      throw new Error("Solicitud de mantenimiento no encontrada");
    }

    const maintenanceData = maintenanceDoc.data();

    // 2. Actualizar asignación
    await updateDoc(maintenanceRef, {
      assignedTo: {
        id: staffId,
        name: staffName,
        assignedAt: timestamp,
      },
      status: "assigned",
    });

    // 3. Enviar notificación al personal asignado
    await notificationService.sendMaintenanceAssignmentNotification(
      hotelId,
      staffId,
      maintenanceId,
      "Nueva tarea de mantenimiento asignada",
      `Se te ha asignado mantenimiento en la habitación ${maintenanceData.roomNumber}`,
      {
        roomNumber: maintenanceData.roomNumber,
        description: maintenanceData.description,
      }
    );

    return true;
  } catch (error) {
    console.error("Error al asignar personal de mantenimiento:", error);
    throw error;
  }
}

export async function completeMaintenanceRequest(
  hotelId: string,
  roomId: string,
  requestId: string,
  maintenanceId: string,
  staffId: string,
  completionNotes: string
) {
  try {
    const timestamp = Timestamp.now();

    // 1. Obtener datos actuales
    const [roomDoc, maintenanceDoc] = await Promise.all([
      getDoc(doc(db, "hotels", hotelId, "rooms", roomId)),
      getDoc(doc(db, "hotels", hotelId, "maintenance", maintenanceId)),
    ]);

    const maintenanceData = maintenanceDoc.data();

    // 2. Preparar actualización de la habitación
    const updateData: any = {
      currentMaintenance: null,
      status: maintenanceData?.previousState?.wasInCleaning
        ? maintenanceData.previousState.status
        : "available",
      assignedTo: maintenanceData?.previousState?.wasInCleaning
        ? maintenanceData.previousState.cleaningStaffId
        : null,
    };

    // 3. Actualizar todos los documentos
    await Promise.all([
      // Actualizar habitación
      updateDoc(doc(db, "hotels", hotelId, "rooms", roomId), updateData),

      // Actualizar mantenimiento
      updateDoc(doc(db, "hotels", hotelId, "maintenance", maintenanceId), {
        status: "completed",
        completedAt: timestamp,
        completedBy: {
          id: staffId,
          timestamp,
        },
        completionNotes,
      }),

      // Actualizar solicitud
      updateDoc(doc(db, "hotels", hotelId, "requests", requestId), {
        status: "completed",
        completedAt: timestamp,
        completedBy: {
          id: staffId,
          timestamp,
        },
        completionNotes,
      }),

      // Registrar en historial
      addDoc(collection(db, "hotels", hotelId, "rooms", roomId, "history"), {
        type: "maintenance_completed",
        timestamp,
        previousStatus: "maintenance",
        newStatus: updateData.status,
        staffId,
        notes: completionNotes,
        maintenanceId,
      }),
    ]);

    // 4. Enviar notificación de finalización a administradores
    await notificationService.sendMaintenanceNotification(
      hotelId,
      maintenanceId,
      "Mantenimiento completado",
      `El mantenimiento de la habitación ${maintenanceData?.roomNumber} ha sido completado`,
      {
        status: "completed",
        roomNumber: maintenanceData?.roomNumber,
        completionNotes,
      }
    );

    return true;
  } catch (error) {
    console.error("Error al completar mantenimiento:", error);
    throw error;
  }
}
export async function getMaintenanceStats(
  hotelId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const maintenanceRef = collection(db, "hotels", hotelId, "maintenance");
    const statsQuery = query(
      maintenanceRef,
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(statsQuery);
    const maintenanceRequests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      total: maintenanceRequests.length,
      completed: maintenanceRequests.filter((r) => r.status === "completed")
        .length,
      pending: maintenanceRequests.filter((r) => r.status === "pending").length,
      averageCompletionTime:
        calculateAverageCompletionTime(maintenanceRequests),
      byType: countByType(maintenanceRequests),
      byPriority: countByPriority(maintenanceRequests),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de mantenimiento:", error);
    throw error;
  }
}

function calculateAverageCompletionTime(requests: any[]) {
  const completedRequests = requests.filter(
    (r) => r.status === "completed" && r.completedAt && r.createdAt
  );

  if (completedRequests.length === 0) return 0;

  const totalTime = completedRequests.reduce((acc, req) => {
    const completionTime =
      req.completedAt.toDate().getTime() - req.createdAt.toDate().getTime();
    return acc + completionTime / (1000 * 60); // Convertir a minutos
  }, 0);

  return Math.round(totalTime / completedRequests.length);
}

function countByType(requests: any[]) {
  return requests.reduce((acc, req) => {
    acc[req.type] = (acc[req.type] || 0) + 1;
    return acc;
  }, {});
}

function countByPriority(requests: any[]) {
  return requests.reduce((acc, req) => {
    acc[req.priority] = (acc[req.priority] || 0) + 1;
    return acc;
  }, {});
}
