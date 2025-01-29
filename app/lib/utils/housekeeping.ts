// src/lib/utils/housekeeping.ts
import type { Room, Staff } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export interface RoomMetrics {
  tiempoLimpieza: number;
  eficiencia: number;
  estado: string;
  ultimaActualizacion: Date;
}

export interface StaffMetrics {
  habitacionesCompletadas: number;
  tiempoPromedio: number;
  eficiencia: number;
  estado: string;
}

// Función auxiliar para verificar si es un Timestamp válido
const isValidTimestamp = (timestamp: any): timestamp is Timestamp => {
  return timestamp && 
         typeof timestamp === 'object' && 
         'toDate' in timestamp && 
         typeof timestamp.toDate === 'function';
};

// Función auxiliar para obtener fecha como string con validación
const getDateString = (timestamp: any): string | null => {
  if (!isValidTimestamp(timestamp)) return null;
  try {
    return timestamp.toDate().toDateString();
  } catch (error) {
    console.error('Error al convertir timestamp:', error);
    return null;
  }
};

export const calcularMetricasHabitacion = (
  habitacion: Room,
  historial: any[]
): RoomMetrics => {
  const ahora = new Date();
  let ultimaActualizacion = ahora;

  if (isValidTimestamp(habitacion.lastStatusChange)) {
    ultimaActualizacion = habitacion.lastStatusChange.toDate();
  }

  const tiempoTranscurrido = (ahora.getTime() - ultimaActualizacion.getTime()) / 1000 / 60;

  return {
    tiempoLimpieza: habitacion.tiempoLimpieza || 0,
    eficiencia: calcularEficienciaHabitacion(habitacion, historial),
    estado: habitacion.status,
    ultimaActualizacion
  };
};

export const calcularMetricasCamarera = (
  camarera: Staff,
  habitaciones: Room[]
): StaffMetrics => {
  const hoy = new Date().toDateString();
  const habitacionesAsignadas = habitaciones.filter(h => h.assignedTo === camarera.id);
  const habitacionesHoy = habitacionesAsignadas.filter(h => {
    const fecha = getDateString(h.lastStatusChange);
    return fecha === hoy;
  });

  const habitacionesCompletadas = habitacionesHoy.filter(h => 
    h.status === 'available'
  );

  const tiemposLimpieza = habitacionesCompletadas
    .map(h => h.tiempoLimpieza || 0)
    .filter(t => t > 0);

  return {
    habitacionesCompletadas: habitacionesCompletadas.length,
    tiempoPromedio: tiemposLimpieza.length > 0 
      ? tiemposLimpieza.reduce((a, b) => a + b) / tiemposLimpieza.length 
      : 0,
    eficiencia: habitacionesHoy.length > 0 
      ? (habitacionesCompletadas.length / habitacionesHoy.length) * 100 
      : 0,
    estado: camarera.estado
  };
};

const calcularEficienciaHabitacion = (habitacion: Room, historial: any[]): number => {
  const tiemposEsperados = {
    cleaning_checkout: 45,
    cleaning_occupied: 30,
    cleaning_touch: 15,
    default: 30
  };

  const tiempoEsperado = tiemposEsperados[habitacion.status as keyof typeof tiemposEsperados] || tiemposEsperados.default;
  const tiempoReal = habitacion.tiempoLimpieza || 0;

  if (tiempoReal === 0) return 100;
  return Math.min(100, (tiempoEsperado / tiempoReal) * 100);
};

export const getTiempoTranscurrido = (timestamp: Timestamp | null | undefined): string => {
  if (!isValidTimestamp(timestamp)) return 'N/A';

  try {
    const ahora = new Date();
    const fecha = timestamp.toDate();
    const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 1000 / 60);

    if (minutos < 60) {
      return `${minutos}min`;
    }
    
    const horas = Math.floor(minutos / 60);
    if (horas < 24) {
      return `${horas}h ${minutos % 60}min`;
    }
    
    const dias = Math.floor(horas / 24);
    return `${dias}d ${horas % 24}h`;
  } catch (error) {
    console.error('Error al calcular tiempo transcurrido:', error);
    return 'N/A';
  }
};

export const getDuracionEstimada = (tipoLimpieza: string): number => {
  const duraciones = {
    cleaning_checkout: 45,
    cleaning_occupied: 30,
    cleaning_touch: 15,
    inspection: 10,
    default: 30
  };

  return duraciones[tipoLimpieza as keyof typeof duraciones] || duraciones.default;
};

export const calcularProgresoLimpieza = (
  habitacion: Room,
  duracionEstimada: number
): number => {
  if (!isValidTimestamp(habitacion.lastStatusChange)) return 0;

  try {
    const tiempoTranscurrido = (
      new Date().getTime() - habitacion.lastStatusChange.toDate().getTime()
    ) / 1000 / 60;
    return Math.min(100, (tiempoTranscurrido / duracionEstimada) * 100);
  } catch (error) {
    console.error('Error al calcular progreso:', error);
    return 0;
  }
};

export const calcularEficienciaGlobal = (
  habitaciones: Room[],
  camareras: Staff[]
): number => {
  if (!habitaciones.length || !camareras.length) return 0;

  const eficienciasCamareras = camareras.map(camarera => {
    const metricas = calcularMetricasCamarera(camarera, habitaciones);
    return metricas.eficiencia;
  });

  return eficienciasCamareras.reduce((a, b) => a + b, 0) / eficienciasCamareras.length;
};

export const getEstadisticasGlobales = (
  habitaciones: Room[],
  camareras: Staff[]
) => {
  const hoy = new Date().toDateString();
  const habitacionesHoy = habitaciones.filter(h => {
    const fecha = getDateString(h.lastStatusChange);
    return fecha === hoy;
  });

  return {
    total: habitacionesHoy.length,
    completadas: habitacionesHoy.filter(h => h.status === 'available').length,
    enProgreso: habitacionesHoy.filter(h => 
      ['cleaning', 'cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'].includes(h.status)
    ).length,
    pendientes: habitacionesHoy.filter(h => 
      ['need_cleaning', 'checkout'].includes(h.status)
    ).length,
    inspeccion: habitacionesHoy.filter(h => h.status === 'inspection').length,
    eficienciaGlobal: calcularEficienciaGlobal(habitaciones, camareras),
    tiempoPromedioGlobal: calcularTiempoPromedioGlobal(habitacionesHoy)
  };
};

const calcularTiempoPromedioGlobal = (habitaciones: Room[]): number => {
  const tiempos = habitaciones
    .filter(h => h.tiempoLimpieza && h.tiempoLimpieza > 0)
    .map(h => h.tiempoLimpieza || 0);

  if (!tiempos.length) return 0;
  return tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
};