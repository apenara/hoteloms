// services/roomStateService.ts
import { collection, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface UpdateStateParams {
  hotelId: string;
  roomId: string;
  currentStatus: string;
  newStatus: string;
  notes: string;
  user: any;
  room: any;
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
  const timestamp = Timestamp.now();
  const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);

  // Actualizar estado de la habitación
  await updateDoc(roomRef, {
    status: newStatus,
    lastStatusChange: timestamp,
    lastUpdatedBy: {
      id: user.uid,
      name: user.name,
      role: user.role
    },
    ...(newStatus === 'maintenance' ? {
      currentMaintenance: {
        status: 'pending',
        description: notes,
        createdAt: Timestamp.now()
      }
    } : {})
  });

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

  if (newStatus === 'maintenance') {
    // Crear registro de mantenimiento
    const maintenanceRef = collection(db, 'hotels', hotelId, 'maintenance');
    await addDoc(maintenanceRef, {
      roomId,
      roomNumber: room.number,
      type: 'corrective',
      status: 'pending',
      priority: 'medium',
      location: `Habitación ${room.number}`,
      description: notes,
      createdAt: timestamp,
      source: 'room_request',
      requestedBy: {
        id: user.uid,
        name: user.name,
        role: user.role
      }
    });

    // Crear solicitud
    const requestsRef = collection(db, 'hotels', hotelId, 'requests');
    await addDoc(requestsRef, {
      roomId,
      roomNumber: room.number,
      type: 'maintenance',
      status: 'pending',
      createdAt: timestamp,
      description: notes,
      requestedBy: {
        id: user.uid,
        name: user.name,
        role: user.role
      }
    });
  }
}