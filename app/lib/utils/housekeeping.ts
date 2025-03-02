// src/lib/utils/housekeeping.ts
import type { Room, Staff } from "@/app/lib/types";
import { Timestamp } from "firebase/firestore";

export interface RoomMetrics {
  tiempoLimpieza: number;
  eficiencia: number;
  estado: string;
  ultimaActualizacion: Date;
  tipoHabitacion?: string;
  diasDesdeUltimaLimpieza?: number;
}

export interface StaffMetrics {
  habitacionesCompletadas: number;
  tiempoPromedio: number;
  eficiencia: number;
  estado: string;
  tiemposPorTipoHabitacion?: Record<string, number>;
  eficienciaPorTipoHabitacion?: Record<string, number>;
}

// Función auxiliar para verificar si es un Timestamp válido
const isValidTimestamp = (timestamp: any): timestamp is Timestamp => {
  return (
    timestamp &&
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    typeof timestamp.toDate === "function"
  );
};

// Función auxiliar para convertir cualquier tipo de timestamp a Date
export const convertToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  try {
    // Si es un Timestamp de Firestore
    if (isValidTimestamp(timestamp)) {
      return timestamp.toDate();
    }

    // Si ya es un Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // Si es un string o número, intentar convertir
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }

    console.error("No se pudo convertir a fecha:", timestamp);
    return null;
  } catch (error) {
    console.error("Error al convertir timestamp a fecha:", error);
    return null;
  }
};

// Función auxiliar para obtener fecha como string con validación
const getDateString = (timestamp: any): string | null => {
  const date = convertToDate(timestamp);
  if (!date) return null;

  try {
    return date.toDateString();
  } catch (error) {
    console.error("Error al convertir fecha a string:", error);
    return null;
  }
};

// Función para calcular días transcurridos desde una fecha
export const getDiasTranscurridos = (
  timestamp: Timestamp | Date | null | undefined
): number => {
  if (!timestamp) return 0;

  try {
    const ahora = new Date();
    let fecha: Date;

    // Verificar si es un Timestamp de Firestore
    if (
      typeof timestamp === "object" &&
      "toDate" in timestamp &&
      typeof timestamp.toDate === "function"
    ) {
      fecha = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // Si ya es un objeto Date
      fecha = timestamp;
    } else {
      // Intentar crear una fecha si es otro formato
      fecha = new Date(timestamp as any);
      if (isNaN(fecha.getTime())) {
        console.error("Formato de fecha inválido:", timestamp);
        return 0;
      }
    }

    const milisegundosPorDia = 24 * 60 * 60 * 1000;
    return Math.floor((ahora.getTime() - fecha.getTime()) / milisegundosPorDia);
  } catch (error) {
    console.error("Error al calcular días transcurridos:", error);
    return 0;
  }
};

// Obtener tiempo esperado según tipo de limpieza y tipo de habitación
export const getTiempoEsperado = (
  tipoLimpieza: string,
  tipoHabitacion: string
): number => {
  // Base times by cleaning type
  const tiemposBase = {
    cleaning_checkout: 45,
    cleaning_occupied: 30,
    cleaning_touch: 15,
    checkout: 45,
    checkout_today: 45,
    default: 30,
  };

  // Multiplication factors by room type
  const factoresTipoHabitacion: Record<string, number> = {
    standard: 1.0,
    suite: 1.5,
    deluxe: 1.3,
    junior_suite: 1.4,
    presidential: 2.0,
    default: 1.0,
  };

  const tiempoBase =
    tiemposBase[tipoLimpieza as keyof typeof tiemposBase] ||
    tiemposBase.default;
  const factor =
    factoresTipoHabitacion[tipoHabitacion] || factoresTipoHabitacion.default;

  return tiempoBase * factor;
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

  const tiempoTranscurrido =
    (ahora.getTime() - ultimaActualizacion.getTime()) / 1000 / 60;

  const diasDesdeUltimaLimpieza = isValidTimestamp(habitacion.lastCleaned)
    ? getDiasTranscurridos(habitacion.lastCleaned)
    : null;

  return {
    tiempoLimpieza: habitacion.tiempoLimpieza || 0,
    eficiencia: calcularEficienciaHabitacion(habitacion, historial),
    estado: habitacion.status,
    ultimaActualizacion,
    tipoHabitacion: habitacion.type,
    diasDesdeUltimaLimpieza: diasDesdeUltimaLimpieza || undefined,
  };
};

export const calcularMetricasCamarera = (
  camarera: Staff,
  habitaciones: Room[]
): StaffMetrics => {
  const hoy = new Date().toDateString();
  const habitacionesAsignadas = habitaciones.filter(
    (h) => h.assignedTo === camarera.id
  );
  const habitacionesHoy = habitacionesAsignadas.filter((h) => {
    const fecha = getDateString(h.lastStatusChange);
    return fecha === hoy;
  });

  const habitacionesCompletadas = habitacionesHoy.filter(
    (h) => h.status === "available"
  );

  const tiemposLimpieza = habitacionesCompletadas
    .map((h) => h.tiempoLimpieza || 0)
    .filter((t) => t > 0);

  // Calcular métricas por tipo de habitación
  const tiemposPorTipo: Record<string, { total: number; cantidad: number }> =
    {};
  const eficienciaPorTipo: Record<string, { total: number; cantidad: number }> =
    {};

  habitacionesCompletadas.forEach((hab) => {
    const tipo = hab.type || "default";

    // Tiempos promedio
    if (hab.tiempoLimpieza && hab.tiempoLimpieza > 0) {
      if (!tiemposPorTipo[tipo]) {
        tiemposPorTipo[tipo] = { total: 0, cantidad: 0 };
      }
      tiemposPorTipo[tipo].total += hab.tiempoLimpieza;
      tiemposPorTipo[tipo].cantidad += 1;
    }

    // Eficiencia
    const eficienciaHab = calcularEficienciaHabitacion(hab, []);
    if (!eficienciaPorTipo[tipo]) {
      eficienciaPorTipo[tipo] = { total: 0, cantidad: 0 };
    }
    eficienciaPorTipo[tipo].total += eficienciaHab;
    eficienciaPorTipo[tipo].cantidad += 1;
  });

  // Convertir a promedios
  const tiemposPorTipoHabitacion: Record<string, number> = {};
  const eficienciaPorTipoHabitacion: Record<string, number> = {};

  Object.entries(tiemposPorTipo).forEach(([tipo, datos]) => {
    tiemposPorTipoHabitacion[tipo] =
      datos.cantidad > 0 ? datos.total / datos.cantidad : 0;
  });

  Object.entries(eficienciaPorTipo).forEach(([tipo, datos]) => {
    eficienciaPorTipoHabitacion[tipo] =
      datos.cantidad > 0 ? datos.total / datos.cantidad : 0;
  });

  return {
    habitacionesCompletadas: habitacionesCompletadas.length,
    tiempoPromedio:
      tiemposLimpieza.length > 0
        ? tiemposLimpieza.reduce((a, b) => a + b) / tiemposLimpieza.length
        : 0,
    eficiencia:
      habitacionesHoy.length > 0
        ? (habitacionesCompletadas.length / habitacionesHoy.length) * 100
        : 0,
    estado: camarera.estado,
    tiemposPorTipoHabitacion,
    eficienciaPorTipoHabitacion,
  };
};

const calcularEficienciaHabitacion = (
  habitacion: Room,
  historial: any[]
): number => {
  const tipoHabitacion = habitacion.type || "standard";
  const tiempoEsperado = getTiempoEsperado(habitacion.status, tipoHabitacion);
  const tiempoReal = habitacion.tiempoLimpieza || 0;

  if (tiempoReal === 0) return 100;
  return Math.min(100, (tiempoEsperado / tiempoReal) * 100);
};

export const getTiempoTranscurrido = (
  timestamp: Timestamp | null | undefined
): string => {
  if (!isValidTimestamp(timestamp)) return "N/A";

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
    console.error("Error al calcular tiempo transcurrido:", error);
    return "N/A";
  }
};

export const getDuracionEstimada = (
  tipoLimpieza: string,
  tipoHabitacion: string = "standard"
): number => {
  return getTiempoEsperado(tipoLimpieza, tipoHabitacion);
};

export const calcularProgresoLimpieza = (
  habitacion: Room,
  duracionEstimada?: number
): number => {
  if (!isValidTimestamp(habitacion.lastStatusChange)) return 0;

  try {
    const tiempoTranscurrido =
      (new Date().getTime() - habitacion.lastStatusChange.toDate().getTime()) /
      1000 /
      60;

    const duracion =
      duracionEstimada ||
      getDuracionEstimada(habitacion.status, habitacion.type);
    return Math.min(100, (tiempoTranscurrido / duracion) * 100);
  } catch (error) {
    console.error("Error al calcular progreso:", error);
    return 0;
  }
};

export const calcularEficienciaGlobal = (
  habitaciones: Room[],
  camareras: Staff[]
): number => {
  if (!habitaciones.length || !camareras.length) return 0;

  // Calcular eficiencia considerando tipos de habitación
  let eficienciaTotal = 0;
  let habitacionesCalculadas = 0;

  habitaciones.forEach((hab) => {
    if (hab.tiempoLimpieza && hab.tiempoLimpieza > 0) {
      const tiempoEsperado = getTiempoEsperado(
        hab.status,
        hab.type || "standard"
      );
      const eficienciaHabitacion = Math.min(
        100,
        (tiempoEsperado / hab.tiempoLimpieza) * 100
      );

      eficienciaTotal += eficienciaHabitacion;
      habitacionesCalculadas++;
    }
  });

  if (habitacionesCalculadas === 0) {
    // Fallback al método anterior si no hay habitaciones con tiempo de limpieza
    const eficienciasCamareras = camareras
      .map((camarera) => {
        const metricas = calcularMetricasCamarera(camarera, habitaciones);
        return metricas.eficiencia;
      })
      .filter((e) => e > 0);

    return eficienciasCamareras.length > 0
      ? eficienciasCamareras.reduce((a, b) => a + b, 0) /
          eficienciasCamareras.length
      : 0;
  }

  return eficienciaTotal / habitacionesCalculadas;
};

export const getEstadisticasGlobales = (
  habitaciones: Room[],
  camareras: Staff[]
) => {
  const hoy = new Date().toDateString();

  // Filtrar habitaciones relevantes para limpieza
  const habitacionesRelevantes = habitaciones.filter((h) => {
    // Habitaciones con cambio de estado hoy
    const fechaCambioHoy = getDateString(h.lastStatusChange) === hoy;

    // Habitaciones ocupadas limpias que llevan más de un día
    const esLimpiaOcupadaMasDeUnDia =
      h.status === "clean_occupied" &&
      isValidTimestamp(h.lastStatusChange) &&
      getDiasTranscurridos(h.lastStatusChange) >= 1;

    // Habitaciones en checkout o checkout hoy
    const esCheckout = ["checkout", "checkout_today"].includes(h.status);

    // Habitaciones que necesitan limpieza o están en proceso
    const necesitaLimpieza = [
      "need_cleaning",
      "cleaning_occupied",
      "cleaning_checkout",
      "cleaning_touch",
    ].includes(h.status);

    return (
      fechaCambioHoy ||
      esLimpiaOcupadaMasDeUnDia ||
      esCheckout ||
      necesitaLimpieza
    );
  });

  // Calcular estadísticas por tipo de habitación
  const estatusHabitacionesPorTipo: Record<
    string,
    {
      total: number;
      completadas: number;
      enProgreso: number;
      pendientes: number;
    }
  > = {};

  habitacionesRelevantes.forEach((hab) => {
    const tipo = hab.type || "sin_tipo";

    if (!estatusHabitacionesPorTipo[tipo]) {
      estatusHabitacionesPorTipo[tipo] = {
        total: 0,
        completadas: 0,
        enProgreso: 0,
        pendientes: 0,
      };
    }

    estatusHabitacionesPorTipo[tipo].total++;

    if (hab.status === "available") {
      estatusHabitacionesPorTipo[tipo].completadas++;
    } else if (
      ["cleaning_occupied", "cleaning_checkout", "cleaning_touch"].includes(
        hab.status
      )
    ) {
      estatusHabitacionesPorTipo[tipo].enProgreso++;
    } else if (
      [
        "need_cleaning",
        "checkout",
        "checkout_today",
        "clean_occupied",
      ].includes(hab.status)
    ) {
      estatusHabitacionesPorTipo[tipo].pendientes++;
    }
  });

  return {
    total: habitacionesRelevantes.length,
    completadas: habitacionesRelevantes.filter((h) => h.status === "available")
      .length,
    enProgreso: habitacionesRelevantes.filter((h) =>
      ["cleaning_occupied", "cleaning_checkout", "cleaning_touch"].includes(
        h.status
      )
    ).length,
    pendientes: habitacionesRelevantes.filter((h) =>
      [
        "need_cleaning",
        "checkout",
        "checkout_today",
        "clean_occupied",
      ].includes(h.status)
    ).length,
    inspeccion: habitacionesRelevantes.filter((h) => h.status === "inspection")
      .length,
    eficienciaGlobal: calcularEficienciaGlobal(
      habitacionesRelevantes,
      camareras
    ),
    tiempoPromedioGlobal: calcularTiempoPromedioGlobal(habitacionesRelevantes),
    estadisticasPorTipo: estatusHabitacionesPorTipo,
  };
};

const calcularTiempoPromedioGlobal = (habitaciones: Room[]): number => {
  const tiempos = habitaciones
    .filter((h) => h.tiempoLimpieza && h.tiempoLimpieza > 0)
    .map((h) => h.tiempoLimpieza || 0);

  if (!tiempos.length) return 0;
  return tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
};

// Función para verificar si una habitación requiere limpieza
export const requiereLimpieza = (habitacion: Room): boolean => {
  // Casos directos: estados que requieren limpieza
  if (
    ["need_cleaning", "checkout", "checkout_today"].includes(habitacion.status)
  ) {
    return true;
  }

  // Caso de habitación limpia pero ocupada con más de un día desde su limpieza
  if (
    habitacion.status === "clean_occupied" &&
    isValidTimestamp(habitacion.lastCleaned)
  ) {
    const diasDesdeUltimaLimpieza = getDiasTranscurridos(
      habitacion.lastCleaned
    );
    return diasDesdeUltimaLimpieza >= 1; // Requiere limpieza si ha pasado 1 o más días
  }

  return false;
};
