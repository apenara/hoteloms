// src/lib/services/roomStateService.ts
import { collection, doc, addDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { createMaintenanceRequest } from './maintenanceService';
import type { Room } from '@/lib/types';

interface UpdateStateParams {
  hotelId: string;
  roomId: string;
  currentStatus: string;
  newStatus: string;
  notes: string;
  user: any;
  room: Room;
}

export async function updateRoomState({
  hotelId,
  roomId,
  currentStatus,
  newStatus,
  notes,
  user,
  room
}: UpdateStateParams) {
  try {
    const timestamp = Timestamp.now();
    const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);

    // Obtener estado actual de limpieza si existe
    const roomDoc = await getDoc(roomRef);
    const roomData = roomDoc.data();
    const wasInCleaning = currentStatus?.includes('cleaning_');
    const cleaningStaffId = wasInCleaning ? roomData?.assignedTo : null;

    // Preparar datos de actualización
    const updateData: any = {
      status: newStatus,
      lastStatusChange: timestamp,
      lastUpdatedBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
        timestamp: timestamp
      }
    };

    // Si el nuevo estado es mantenimiento, guardar datos adicionales
    if (newStatus === 'maintenance') {
      updateData.currentMaintenance = {
        status: 'pending',
        description: notes,
        createdAt: timestamp
      };

      // Si estaba en limpieza, mantener la asignación
      if (wasInCleaning) {
        updateData.previousCleaningState = currentStatus;
        updateData.previousCleaningStaff = cleaningStaffId;
      }
    }

    // Actualizar estado de la habitación
    await updateDoc(roomRef, updateData);

    // Registrar en historial
    const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
    await addDoc(historyRef, {
      previousStatus: currentStatus,
      newStatus,
      timestamp,
      notes: notes.trim() || 'Sin notas adicionales',
      staffMember: {
        id: user.uid,
        name: user.name,
        role: user.role,
        accessType: user.accessType || 'email'
      }
    });

    // Si es mantenimiento, crear solicitud
    if (newStatus === 'maintenance') {
      await createMaintenanceRequest({
        hotelId,
        roomId,
        room,
        notes,
        user,
        previousState: {
          status: currentStatus,
          wasInCleaning,
          cleaningStaffId
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    throw error;
  }
}