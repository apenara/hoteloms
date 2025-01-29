// src/lib/services/housekeeping.ts
import { 
    doc, 
    updateDoc, 
    addDoc, 
    collection, 
    Timestamp,
    serverTimestamp,
    getDoc,
    getDocs,
    query,
    where,
    orderBy as firestoreOrderBy,
    limit,
    Query,
    DocumentData
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  import type { Room, Staff } from '@/lib/types';
  
  interface CambioEstado {
    previousStatus: string;
    newStatus: string;
    timestamp: Timestamp;
    staffId: string;
    notes?: string;
  }
  
  export const registrarCambioEstado = async (
    hotelId: string,
    roomId: string,
    staffId: string,
    nuevoEstado: string,
    notas?: string
  ) => {
    try {
      const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        throw new Error('Habitación no encontrada');
      }
  
      const estadoAnterior = roomDoc.data()?.status;
      const timestamp = Timestamp.now();
  
      // Actualizar estado de la habitación
      const updateData: any = {
        status: nuevoEstado,
        lastStatusChange: timestamp,
        assignedTo: staffId,
        lastUpdatedBy: {
          id: staffId,
          timestamp: timestamp
        }
      };
  
      await updateDoc(roomRef, updateData);
  
      // Preparar datos para el historial
      const historyData: any = {
        previousStatus: estadoAnterior,
        newStatus: nuevoEstado,
        timestamp: timestamp,
        staffId: staffId,
        notes: notas || 'Sin notas'
      };
  
      // Registrar el cambio en el historial
      const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
      await addDoc(historyRef, historyData);
  
      // Si es inicio de limpieza, registrar tiempo inicio
      if (['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'].includes(nuevoEstado)) {
        await registrarInicioLimpieza(hotelId, roomId, staffId, nuevoEstado);
      }
  
      // Si es fin de limpieza, registrar tiempo total y actualizar métricas
      if (nuevoEstado === 'available' || nuevoEstado === 'inspection') {
        await registrarFinLimpieza(hotelId, roomId, staffId);
      }
  
      return true;
    } catch (error) {
      console.error('Error al registrar cambio de estado:', error);
      throw error;
    }
  };
  
  const registrarInicioLimpieza = async (
    hotelId: string,
    roomId: string,
    staffId: string,
    tipoLimpieza: string
  ) => {
    try {
      const cleaningRef = collection(db, 'hotels', hotelId, 'cleaning_records');
      await addDoc(cleaningRef, {
        roomId: roomId,
        staffId: staffId,
        tipoLimpieza: tipoLimpieza,
        startTime: serverTimestamp(),
        status: 'in_progress'
      });
    } catch (error) {
      console.error('Error al registrar inicio de limpieza:', error);
      throw error;
    }
  };
  
  const registrarFinLimpieza = async (
    hotelId: string,
    roomId: string,
    staffId: string
  ) => {
    try {
      // Buscar el registro de limpieza en progreso
      const cleaningRef = collection(db, 'hotels', hotelId, 'cleaning_records');
      
      // Crear la consulta sin orderBy primero
      const baseQuery = query(
        cleaningRef,
        where('roomId', '==', roomId),
        where('staffId', '==', staffId),
        where('status', '==', 'in_progress')
      );
  
      const cleaningSnapshot = await getDocs(baseQuery);
  
      if (!cleaningSnapshot.empty) {
        // Tomar el primer documento (asumiendo que solo debería haber uno en progreso)
        const cleaningDoc = cleaningSnapshot.docs[0];
        const startTime = cleaningDoc.data().startTime;
        const endTime = Timestamp.now();
        
        if (!startTime) {
          throw new Error('Tiempo de inicio no encontrado');
        }
  
        // Calcular tiempo total en minutos
        const tiempoTotal = Math.floor(
          (endTime.toMillis() - startTime.toMillis()) / (1000 * 60)
        );
  
        // Actualizar registro de limpieza
        await updateDoc(doc(cleaningRef, cleaningDoc.id), {
          endTime: endTime,
          status: 'completed',
          tiempoTotal: tiempoTotal
        });
  
        // Actualizar tiempos en la habitación
        const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
        await updateDoc(roomRef, {
          lastCleaned: endTime,
          tiempoLimpieza: tiempoTotal
        });
  
        // Actualizar métricas de la camarera
        await actualizarMetricasCamarera(hotelId, staffId, tiempoTotal);
      }
    } catch (error) {
      console.error('Error al registrar fin de limpieza:', error);
      throw error;
    }
  };
  
  const actualizarMetricasCamarera = async (
    hotelId: string,
    staffId: string,
    tiempoLimpieza: number
  ) => {
    try {
      const staffRef = doc(db, 'hotels', hotelId, 'staff', staffId);
      const staffDoc = await getDoc(staffRef);
      
      if (!staffDoc.exists()) {
        throw new Error('Personal no encontrado');
      }
  
      const staffData = staffDoc.data();
  
      // Calcular nuevas métricas
      const habitacionesCompletadas = (staffData?.habitacionesCompletadas || 0) + 1;
      const tiemposTotales = (staffData?.tiemposTotales || 0) + tiempoLimpieza;
      const tiempoPromedio = Math.round(tiemposTotales / habitacionesCompletadas);
  
      // Actualizar documento de la camarera
      await updateDoc(staffRef, {
        habitacionesCompletadas,
        tiemposTotales,
        tiempoPromedio,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al actualizar métricas de camarera:', error);
      throw error;
    }
  };