// src/lib/services/housekeeping-assignment.ts
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc,
    doc,
    Timestamp,
    orderBy,
    getDoc
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  import type { Room, Staff } from '@/lib/types';
  
  interface AssignmentScore {
    staffId: string;
    score: number;
    reason: string;
  }
  
  interface RoomPriority {
    roomId: string;
    priority: number;
    reason: string;
  }
  
  export const asignarHabitacionesAutomaticamente = async (hotelId: string) => {
    try {
      // 1. Obtener habitaciones que necesitan limpieza
      const habitacionesPendientes = await obtenerHabitacionesPendientes(hotelId);
      if (!habitacionesPendientes.length) {
        return { success: true, message: 'No hay habitaciones pendientes' };
      }
  
      // 2. Obtener camareras disponibles
      const camareras = await obtenerCamarerasDisponibles(hotelId);
      if (!camareras.length) {
        return { success: false, message: 'No hay camareras disponibles' };
      }
  
      // 3. Priorizar habitaciones
      const habitacionesPriorizadas = priorizarHabitaciones(habitacionesPendientes);
  
      // 4. Asignar habitaciones
      const asignaciones = await asignarHabitaciones(
        hotelId,
        habitacionesPriorizadas,
        camareras
      );
  
      return {
        success: true,
        message: `Se asignaron ${asignaciones.length} habitaciones`,
        asignaciones
      };
    } catch (error) {
      console.error('Error en asignación automática:', error);
      throw error;
    }
  };
  
  const obtenerHabitacionesPendientes = async (hotelId: string): Promise<Room[]> => {
    const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
    const pendingQuery = query(
      roomsRef,
      where('status', 'in', ['need_cleaning', 'checkout'])
    );
  
    const snapshot = await getDocs(pendingQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Room[];
  };
  
  const obtenerCamarerasDisponibles = async (hotelId: string): Promise<Staff[]> => {
    const staffRef = collection(db, 'hotels', hotelId, 'staff');
    const staffQuery = query(
      staffRef,
      where('role', '==', 'housekeeper'),
      where('status', '==', 'active')
    );
  
    const snapshot = await getDocs(staffQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Staff[];
  };
  
  const priorizarHabitaciones = (habitaciones: Room[]): RoomPriority[] => {
    return habitaciones.map(room => {
      let priority = 0;
      let reason = '';
  
      // Prioridad por tipo de limpieza
      if (room.status === 'checkout') {
        priority += 100; // Alta prioridad para checkouts
        reason += 'Checkout pendiente; ';
      }
  
      // Prioridad por tiempo de espera
      if (room.lastStatusChange) {
        const tiempoEspera = Timestamp.now().seconds - room.lastStatusChange.seconds;
        const horasEspera = tiempoEspera / 3600;
        
        if (horasEspera > 2) {
          priority += 50;
          reason += 'Espera prolongada; ';
        }
      }
  
      // Prioridad por VIP o características especiales
      if (room.features?.includes('vip')) {
        priority += 30;
        reason += 'Habitación VIP; ';
      }
  
      return {
        roomId: room.id,
        priority,
        reason: reason.trim()
      };
    }).sort((a, b) => b.priority - a.priority);
  };
  
  const evaluarCamarera = async (
    hotelId: string,
    camarera: Staff,
    habitacion: Room
  ): Promise<AssignmentScore> => {
    let score = 0;
    let reason = '';
  
    // 1. Carga de trabajo actual
    const asignacionesActuales = await obtenerAsignacionesActuales(hotelId, camarera.id);
    score -= asignacionesActuales.length * 10;
    reason += `Carga actual: ${asignacionesActuales.length} habitaciones; `;
  
    // 2. Eficiencia histórica
    if (camarera.efficiency) {
      score += camarera.efficiency;
      reason += `Eficiencia: ${Math.round(camarera.efficiency)}%; `;
    }
  
    // 3. Proximidad (mismo piso)
    if (asignacionesActuales.some(r => r.floor === habitacion.floor)) {
      score += 20;
      reason += 'Mismo piso; ';
    }
  
    // 4. Experiencia con tipo de habitación
    const experienciaPrevia = await verificarExperienciaPrevia(
      hotelId,
      camarera.id,
      habitacion.type
    );
    if (experienciaPrevia) {
      score += 15;
      reason += 'Experiencia previa; ';
    }
  
    return {
      staffId: camarera.id,
      score,
      reason: reason.trim()
    };
  };
  
  const obtenerAsignacionesActuales = async (
    hotelId: string,
    staffId: string
  ): Promise<Room[]> => {
    const roomsRef = collection(db, 'hotels', hotelId, 'rooms');
    const asignedQuery = query(
      roomsRef,
      where('assignedTo', '==', staffId),
      where('status', 'in', [
        'cleaning_occupied',
        'cleaning_checkout',
        'cleaning_touch'
      ])
    );
  
    const snapshot = await getDocs(asignedQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Room[];
  };
  
  const verificarExperienciaPrevia = async (
    hotelId: string,
    staffId: string,
    roomType: string
  ): Promise<boolean> => {
    const historyRef = collection(db, 'hotels', hotelId, 'cleaning_records');
    const historyQuery = query(
      historyRef,
      where('staffId', '==', staffId),
      where('status', '==', 'completed'),
      orderBy('endTime', 'desc'),
      limit(20)
    );
  
    const snapshot = await getDocs(historyQuery);
    return snapshot.docs.some(doc => doc.data().roomType === roomType);
  };
  
  const asignarHabitaciones = async (
    hotelId: string,
    habitacionesPriorizadas: RoomPriority[],
    camareras: Staff[]
  ): Promise<{ roomId: string; staffId: string; reason: string }[]> => {
    const asignaciones = [];
  
    for (const habitacion of habitacionesPriorizadas) {
      // Evaluar cada camarera para esta habitación
      const evaluaciones = await Promise.all(
        camareras.map(camarera => 
          evaluarCamarera(hotelId, camarera, habitacion as Room)
        )
      );
  
      // Seleccionar la mejor camarera
      const mejorAsignacion = evaluaciones.reduce((mejor, actual) => 
        actual.score > mejor.score ? actual : mejor
      );
  
      // Realizar la asignación
      if (mejorAsignacion.score > 0) {
        await asignarHabitacion(
          hotelId,
          habitacion.roomId,
          mejorAsignacion.staffId
        );
  
        asignaciones.push({
          roomId: habitacion.roomId,
          staffId: mejorAsignacion.staffId,
          reason: mejorAsignacion.reason
        });
      }
    }
  
    return asignaciones;
  };
  
  const asignarHabitacion = async (
    hotelId: string,
    roomId: string,
    staffId: string
  ) => {
    const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
    await updateDoc(roomRef, {
      assignedTo: staffId,
      assignedAt: Timestamp.now()
    });
  };