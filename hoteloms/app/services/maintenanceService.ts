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
    limit 
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  import type { Room } from '@/lib/types';
  
  interface CreateMaintenanceParams {
    hotelId: string;
    roomId: string;
    room: Room;
    notes: string;
    user: any;
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
    previousState
  }: CreateMaintenanceParams) {
    const timestamp = Timestamp.now();
  
    try {
      // Crear registro de mantenimiento
      const maintenanceRef = collection(db, 'hotels', hotelId, 'maintenance');
      const maintenanceDoc = await addDoc(maintenanceRef, {
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
        },
        previousState
      });
  
      // Crear solicitud general
      const requestsRef = collection(db, 'hotels', hotelId, 'requests');
      await addDoc(requestsRef, {
        roomId,
        roomNumber: room.number,
        type: 'maintenance',
        status: 'pending',
        createdAt: timestamp,
        description: notes,
        maintenanceId: maintenanceDoc.id,
        requestedBy: {
          id: user.uid,
          name: user.name,
          role: user.role
        }
      });
  
      return maintenanceDoc.id;
    } catch (error) {
      console.error('Error al crear solicitud de mantenimiento:', error);
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
  
      // 1. Obtener datos actuales de la habitación
      const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      const roomData = roomDoc.data();
  
      // 2. Obtener datos del mantenimiento
      const maintenanceRef = doc(db, 'hotels', hotelId, 'maintenance', maintenanceId);
      const maintenanceDoc = await getDoc(maintenanceRef);
      const maintenanceData = maintenanceDoc.data();
  
      // 3. Preparar actualización de la habitación
      const updateData: any = {
        currentMaintenance: null
      };
  
      // Si hay estado previo de limpieza, restaurarlo
      if (maintenanceData?.previousState?.wasInCleaning) {
        updateData.status = maintenanceData.previousState.status;
        updateData.assignedTo = maintenanceData.previousState.cleaningStaffId;
      } else {
        updateData.status = 'available';
        updateData.assignedTo = null;
      }
  
      // 4. Actualizar estado de la habitación
      await updateDoc(roomRef, updateData);
  
      // 5. Actualizar registro de mantenimiento
      await updateDoc(maintenanceRef, {
        status: 'completed',
        completedAt: timestamp,
        completedBy: {
          id: staffId,
          timestamp
        },
        completionNotes
      });
  
      // 6. Actualizar solicitud
      const requestRef = doc(db, 'hotels', hotelId, 'requests', requestId);
      await updateDoc(requestRef, {
        status: 'completed',
        completedAt: timestamp,
        completedBy: {
          id: staffId,
          timestamp
        },
        completionNotes
      });
  
      // 7. Registrar en historial
      const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
      await addDoc(historyRef, {
        type: 'maintenance_completed',
        timestamp,
        previousStatus: 'maintenance',
        newStatus: updateData.status,
        staffId,
        notes: completionNotes,
        maintenanceId
      });
  
      return true;
    } catch (error) {
      console.error('Error al completar mantenimiento:', error);
      throw error;
    }
  }
  
  export async function getMaintenanceStats(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const maintenanceRef = collection(db, 'hotels', hotelId, 'maintenance');
      const statsQuery = query(
        maintenanceRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );
  
      const snapshot = await getDocs(statsQuery);
      const maintenanceRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      return {
        total: maintenanceRequests.length,
        completed: maintenanceRequests.filter(r => r.status === 'completed').length,
        pending: maintenanceRequests.filter(r => r.status === 'pending').length,
        averageCompletionTime: calculateAverageCompletionTime(maintenanceRequests),
        byType: countByType(maintenanceRequests),
        byPriority: countByPriority(maintenanceRequests)
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de mantenimiento:', error);
      throw error;
    }
  }
  
  function calculateAverageCompletionTime(requests: any[]) {
    const completedRequests = requests.filter(r => 
      r.status === 'completed' && r.completedAt && r.createdAt
    );
  
    if (completedRequests.length === 0) return 0;
  
    const totalTime = completedRequests.reduce((acc, req) => {
      const completionTime = req.completedAt.toDate().getTime() - req.createdAt.toDate().getTime();
      return acc + (completionTime / (1000 * 60)); // Convertir a minutos
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