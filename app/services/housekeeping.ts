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
    roomType?: string;
  }

  interface CleaningTiming {
    fromState: string;
    toState: string;
    duration: number;  // en segundos
    timestamp: Timestamp;
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
  
      const roomData = roomDoc.data();
      const estadoAnterior = roomData?.status;
      const roomType = roomData?.type;
      const timestamp = Timestamp.now();
      
      // Calcular tiempo desde el último cambio de estado (en segundos)
      let tiempoDesdeUltimoEstado = 0;
      if (roomData?.lastStatusChange) {
        tiempoDesdeUltimoEstado = Math.floor(
          (timestamp.toMillis() - roomData.lastStatusChange.toMillis()) / 1000
        );
      }
  
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
        notes: notas || 'Sin notas',
        roomType: roomType || 'standard',  // Incluir tipo de habitación
        tiempoDesdeUltimoEstado: tiempoDesdeUltimoEstado // Tiempo entre cambios de estado
      };
  
      // Registrar el cambio en el historial
      const historyRef = collection(db, 'hotels', hotelId, 'rooms', roomId, 'history');
      await addDoc(historyRef, historyData);
      
      // Registrar timing específico para análisis de eficiencia
      await registrarTiemposEntreEstados(hotelId, roomId, {
        fromState: estadoAnterior,
        toState: nuevoEstado,
        duration: tiempoDesdeUltimoEstado,
        timestamp: timestamp
      });
  
      // Si es inicio de limpieza, registrar tiempo inicio
      if (['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'].includes(nuevoEstado)) {
        await registrarInicioLimpieza(hotelId, roomId, staffId, nuevoEstado, roomType);
      }
  
      // Si es fin de limpieza o paso a estado de inspección, registrar tiempo total y actualizar métricas
      // Los estados de limpieza finalizan al pasar a cualquiera de estos estados
      if (nuevoEstado === 'available' || nuevoEstado === 'inspection' || 
          nuevoEstado === 'clean_occupied' || nuevoEstado === 'ready_for_inspection') {
        
        // Verificamos si hay una limpieza en progreso para esta habitación
        const isCleaningCheckout = estadoAnterior === 'cleaning_checkout';
        
        // Registrar finalización de limpieza
        await registrarFinLimpieza(hotelId, roomId, staffId, isCleaningCheckout ? 'checkout' : undefined);
      }
  
      return true;
    } catch (error) {
      console.error('Error al registrar cambio de estado:', error);
      throw error;
    }
  };
  
  const registrarTiemposEntreEstados = async (
    hotelId: string,
    roomId: string,
    timingData: CleaningTiming
  ) => {
    try {
      // Colección específica para analítica de tiempos entre estados
      const timingRef = collection(db, 'hotels', hotelId, 'state_timings');
      await addDoc(timingRef, {
        ...timingData,
        roomId: roomId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al registrar timing entre estados:', error);
      // No lanzamos el error para no interrumpir el flujo principal
    }
  };
  
  const registrarInicioLimpieza = async (
    hotelId: string,
    roomId: string,
    staffId: string,
    tipoLimpieza: string,
    roomType?: string
  ) => {
    try {
      // Obtener información adicional de la habitación
      const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      const roomData = roomDoc.exists() ? roomDoc.data() : null;
      
      const cleaningRef = collection(db, 'hotels', hotelId, 'cleaning_records');
      await addDoc(cleaningRef, {
        roomId: roomId,
        roomNumber: roomData?.number || '',
        roomType: roomType || roomData?.type || 'standard',  // Guardar tipo de habitación
        staffId: staffId,
        tipoLimpieza: tipoLimpieza,
        startTime: serverTimestamp(),
        status: 'in_progress',
        floor: roomData?.floor || 0,
        previousStates: {
          estado: roomData?.status || '',
          tiempoEnEstado: roomData?.lastStatusChange ? 
            Math.floor((new Date().getTime() - roomData.lastStatusChange.toMillis()) / (1000 * 60)) : 0
        }
      });
    } catch (error) {
      console.error('Error al registrar inicio de limpieza:', error);
      throw error;
    }
  };
  
  const registrarFinLimpieza = async (
    hotelId: string,
    roomId: string,
    staffId: string,
    tipoLimpiezaOverride?: string
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
        const cleaningData = cleaningDoc.data();
        const startTime = cleaningData.startTime;
        const endTime = Timestamp.now();
        
        if (!startTime) {
          throw new Error('Tiempo de inicio no encontrado');
        }
  
        // Calcular tiempo total en minutos
        const tiempoTotal = Math.floor(
          (endTime.toMillis() - startTime.toMillis()) / (1000 * 60)
        );
        
        // Obtener información adicional para estadísticas
        const roomRef = doc(db, 'hotels', hotelId, 'rooms', roomId);
        const roomDoc = await getDoc(roomRef);
        const roomData = roomDoc.exists() ? roomDoc.data() : null;
  
        // Verificar si es un tipo especial de limpieza (como checkout que pasa a ready_for_inspection)
        const tipoLimpieza = tipoLimpiezaOverride || cleaningData.tipoLimpieza;
        const esLimpiezaCheckout = tipoLimpieza === 'checkout' || cleaningData.tipoLimpieza === 'cleaning_checkout';
        
        // Actualizar registro de limpieza
        await updateDoc(doc(cleaningRef, cleaningDoc.id), {
          endTime: endTime,
          status: 'completed',
          tiempoTotal: tiempoTotal,
          finalRoomState: roomData?.status || '',
          tipoLimpieza: tipoLimpieza, // Asegurarse de guardar el tipo correcto
          esLimpiezaCheckout: esLimpiezaCheckout, // Añadir flag para identificar limpiezas de checkout
          roomDetails: {
            floor: roomData?.floor || 0,
            type: roomData?.type || cleaningData.roomType || 'standard'
          }
        });
  
        // Actualizar tiempos en la habitación
        await updateDoc(roomRef, {
          lastCleaned: endTime,
          tiempoLimpieza: tiempoTotal,
          cleaningStats: {
            lastCleaningTime: tiempoTotal,
            lastCleaningType: tipoLimpieza,
            lastCleaningStaff: staffId,
            esLimpiezaCheckout: esLimpiezaCheckout
          }
        });
  
        // Actualizar métricas de la camarera por tipo de habitación
        await actualizarMetricasCamarera(
          hotelId, 
          staffId, 
          tiempoTotal, 
          tipoLimpieza, 
          roomData?.type || cleaningData.roomType || 'standard',
          esLimpiezaCheckout
        );
      }
    } catch (error) {
      console.error('Error al registrar fin de limpieza:', error);
      throw error;
    }
  };
  
  const actualizarMetricasCamarera = async (
    hotelId: string,
    staffId: string,
    tiempoLimpieza: number,
    tipoLimpieza: string,
    tipoHabitacion: string,
    esLimpiezaCheckout: boolean = false
  ) => {
    try {
      const staffRef = doc(db, 'hotels', hotelId, 'staff', staffId);
      const staffDoc = await getDoc(staffRef);
      
      if (!staffDoc.exists()) {
        throw new Error('Personal no encontrado');
      }
  
      const staffData = staffDoc.data();
  
      // Inicializar métricas si no existen
      const metricas = staffData?.metricas || {
        totalHabitaciones: 0,
        tiempoTotal: 0,
        tiempoPromedio: 0,
        porTipoLimpieza: {},
        porTipoHabitacion: {}
      };
      
      // Actualizar métricas generales
      metricas.totalHabitaciones = (metricas.totalHabitaciones || 0) + 1;
      metricas.tiempoTotal = (metricas.tiempoTotal || 0) + tiempoLimpieza;
      metricas.tiempoPromedio = Math.round(metricas.tiempoTotal / metricas.totalHabitaciones);
      
      // Actualizar métricas por tipo de limpieza
      if (!metricas.porTipoLimpieza) metricas.porTipoLimpieza = {};
      if (!metricas.porTipoLimpieza[tipoLimpieza]) {
        metricas.porTipoLimpieza[tipoLimpieza] = {
          cantidad: 0,
          tiempoTotal: 0,
          tiempoPromedio: 0
        };
      }
      metricas.porTipoLimpieza[tipoLimpieza].cantidad += 1;
      metricas.porTipoLimpieza[tipoLimpieza].tiempoTotal += tiempoLimpieza;
      metricas.porTipoLimpieza[tipoLimpieza].tiempoPromedio = 
        Math.round(metricas.porTipoLimpieza[tipoLimpieza].tiempoTotal / 
                   metricas.porTipoLimpieza[tipoLimpieza].cantidad);
      
      // Actualizar métricas por tipo de habitación
      if (!metricas.porTipoHabitacion) metricas.porTipoHabitacion = {};
      if (!metricas.porTipoHabitacion[tipoHabitacion]) {
        metricas.porTipoHabitacion[tipoHabitacion] = {
          cantidad: 0,
          tiempoTotal: 0,
          tiempoPromedio: 0
        };
      }
      metricas.porTipoHabitacion[tipoHabitacion].cantidad += 1;
      metricas.porTipoHabitacion[tipoHabitacion].tiempoTotal += tiempoLimpieza;
      metricas.porTipoHabitacion[tipoHabitacion].tiempoPromedio = 
        Math.round(metricas.porTipoHabitacion[tipoHabitacion].tiempoTotal / 
                   metricas.porTipoHabitacion[tipoHabitacion].cantidad);
  
      // Para compatibilidad con código anterior
      const habitacionesCompletadas = (staffData?.habitacionesCompletadas || 0) + 1;
      const tiemposTotales = (staffData?.tiemposTotales || 0) + tiempoLimpieza;
      const tiempoPromedio = Math.round(tiemposTotales / habitacionesCompletadas);
  
      // Actualizar documento de la camarera
      await updateDoc(staffRef, {
        habitacionesCompletadas,
        tiemposTotales,
        tiempoPromedio,
        metricas,
        lastUpdated: serverTimestamp(),
        ultimaLimpieza: {
          timestamp: serverTimestamp(),
          tipoLimpieza,
          tipoHabitacion,
          duracion: tiempoLimpieza
        }
      });
      
      // Preparar datos adicionales para limpiezas de checkout
      let datosAdicionales = {};
      if (esLimpiezaCheckout) {
        // Si es limpieza de checkout, registrar en una categoría especial
        if (!metricas.porTipo) metricas.porTipo = {};
        if (!metricas.porTipo.checkout) {
          metricas.porTipo.checkout = {
            cantidad: 0,
            tiempoTotal: 0,
            tiempoPromedio: 0
          };
        }
        
        // Actualizar métricas específicas de checkout
        metricas.porTipo.checkout.cantidad += 1;
        metricas.porTipo.checkout.tiempoTotal += tiempoLimpieza;
        metricas.porTipo.checkout.tiempoPromedio = 
          Math.round(metricas.porTipo.checkout.tiempoTotal / metricas.porTipo.checkout.cantidad);
          
        // Datos adicionales para registro histórico
        datosAdicionales = {
          esCheckout: true,
          tipoCheckout: "standard" // Puede ampliarse con más tipos si es necesario
        };
      }

      // Guardar registro histórico para análisis
      const historialRef = collection(db, 'hotels', hotelId, 'housekeeping_stats');
      await addDoc(historialRef, {
        staffId,
        tiempoLimpieza,
        tipoLimpieza,
        tipoHabitacion,
        timestamp: serverTimestamp(),
        fecha: new Date().toISOString().split('T')[0], // Para facilitar consultas por fecha
        esLimpiezaCheckout,
        ...datosAdicionales
      });
    } catch (error) {
      console.error('Error al actualizar métricas de camarera:', error);
      throw error;
    }
  };