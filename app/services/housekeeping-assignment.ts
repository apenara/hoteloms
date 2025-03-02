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
  getDoc,
  limit,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Room, Staff } from "@/lib/types";
import {
  requiereLimpieza,
  getDiasTranscurridos,
} from "@/app/lib/utils/housekeeping";

interface AssignmentScore {
  staffId: string;
  score: number;
  reason: string;
}

interface RoomPriority {
  roomId: string;
  room: Room;
  priority: number;
  reason: string;
}

interface AsignacionAutomaticaOptions {
  staffIds?: string[]; // IDs de camareras específicas a usar (opcional)
  soloCheckout?: boolean; // Solo asignar habitaciones de checkout
  ignorarAsignadas?: boolean; // Ignorar habitaciones ya asignadas
  pisos?: number[]; // Filtrar por pisos específicos
  tiposHabitacion?: string[]; // Filtrar por tipos de habitación
}

export const asignarHabitacionesAutomaticamente = async (
  hotelId: string,
  options: AsignacionAutomaticaOptions = {}
) => {
  try {
    // 1. Obtener habitaciones que necesitan limpieza
    const habitacionesPendientes = await obtenerHabitacionesPendientes(
      hotelId,
      options
    );
    if (!habitacionesPendientes.length) {
      return { success: true, message: "No hay habitaciones pendientes" };
    }

    // 2. Obtener camareras disponibles
    const camareras = await obtenerCamarerasDisponibles(
      hotelId,
      options.staffIds
    );
    if (!camareras.length) {
      return { success: false, message: "No hay camareras disponibles" };
    }

    // 3. Priorizar habitaciones
    const habitacionesPriorizadas = priorizarHabitaciones(
      habitacionesPendientes
    );

    // 4. Asignar habitaciones
    const asignaciones = await asignarHabitaciones(
      hotelId,
      habitacionesPriorizadas,
      camareras
    );

    // 5. Crear asignaciones grupales para cada camarera
    if (asignaciones.length > 0) {
      await crearAsignacionesGrupales(
        hotelId,
        asignaciones,
        habitacionesPendientes
      );
    }

    return {
      success: true,
      message: `Se asignaron ${asignaciones.length} habitaciones`,
      asignaciones,
    };
  } catch (error) {
    console.error("Error en asignación automática:", error);
    throw error;
  }
};

const obtenerHabitacionesPendientes = async (
  hotelId: string,
  options: AsignacionAutomaticaOptions
): Promise<Room[]> => {
  const roomsRef = collection(db, "hotels", hotelId, "rooms");

  // Construir condiciones base
  let conditions = [];

  if (options.soloCheckout) {
    // Solo checkouts y checkout_today
    conditions.push(where("status", "in", ["checkout", "checkout_today"]));
  } else {
    // Estados que requieren limpieza
    conditions.push(
      where("status", "in", [
        "need_cleaning",
        "checkout",
        "checkout_today",
        "clean_occupied", // Incluimos clean_occupied pero filtraremos después por días
      ])
    );
  }

  // Filtrar habitaciones ya asignadas
  if (options.ignorarAsignadas) {
    conditions.push(where("assignedTo", "==", null));
  }

  // Aplicar filtros disponibles
  const roomQuery = query(roomsRef, ...conditions);
  const snapshot = await getDocs(roomQuery);

  // Obtener todas las habitaciones que cumplen las condiciones base
  let habitaciones = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Room[];

  // Filtrado adicional por post-procesamiento
  habitaciones = habitaciones.filter((room) => {
    // Para clean_occupied, verificar si han pasado más de 1 día desde la última limpieza
    if (room.status === "clean_occupied") {
      return getDiasTranscurridos(room.lastCleaned) >= 1;
    }

    // Filtrar por piso si se especificó
    if (options.pisos && options.pisos.length > 0) {
      if (!options.pisos.includes(room.floor)) {
        return false;
      }
    }

    // Filtrar por tipo de habitación si se especificó
    if (options.tiposHabitacion && options.tiposHabitacion.length > 0) {
      if (!room.type || !options.tiposHabitacion.includes(room.type)) {
        return false;
      }
    }

    // Verificar si requiere limpieza (para otros estados)
    return requiereLimpieza(room);
  });

  return habitaciones;
};

const obtenerCamarerasDisponibles = async (
  hotelId: string,
  staffIds?: string[]
): Promise<Staff[]> => {
  const staffRef = collection(db, "hotels", hotelId, "staff");

  // Construir la consulta base
  let conditions = [
    where("role", "==", "housekeeper"),
    where("status", "==", "active"),
  ];

  // Si se proporcionaron IDs específicos, filtrar por ellos
  let staffQuery = query(staffRef, ...conditions);
  const snapshot = await getDocs(staffQuery);

  let camareras = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];

  // Filtrar por IDs específicos si se proporcionaron
  if (staffIds && staffIds.length > 0) {
    camareras = camareras.filter((camarera) => staffIds.includes(camarera.id));
  }

  return camareras;
};

const priorizarHabitaciones = (habitaciones: Room[]): RoomPriority[] => {
  return habitaciones
    .map((room) => {
      let priority = 0;
      let reason = "";

      // 1. Prioridad por tipo de limpieza/estado
      if (room.status === "checkout" || room.status === "checkout_today") {
        priority += 100; // Alta prioridad para checkouts
        reason += "Checkout pendiente; ";
      } else if (room.status === "need_cleaning") {
        priority += 80;
        reason += "Necesita limpieza; ";
      } else if (room.status === "clean_occupied") {
        // Prioridad basada en días desde última limpieza
        const diasSinLimpiar = getDiasTranscurridos(room.lastCleaned);
        if (diasSinLimpiar >= 3) {
          priority += 70;
          reason += `${diasSinLimpiar} días sin limpiar; `;
        } else if (diasSinLimpiar >= 2) {
          priority += 50;
          reason += `${diasSinLimpiar} días sin limpiar; `;
        } else {
          priority += 30;
          reason += "1 día sin limpiar; ";
        }
      }

      // 2. Prioridad por tiempo de espera
      if (room.lastStatusChange) {
        const tiempoEspera =
          Timestamp.now().seconds - room.lastStatusChange.seconds;
        const horasEspera = tiempoEspera / 3600;

        if (horasEspera > 4) {
          priority += 60;
          reason += "Espera muy prolongada; ";
        } else if (horasEspera > 2) {
          priority += 40;
          reason += "Espera prolongada; ";
        } else if (horasEspera > 1) {
          priority += 20;
          reason += "Espera moderada; ";
        }
      }

      // 3. Prioridad por tipo de habitación
      if (room.type === "suite" || room.type === "presidential") {
        priority += 25;
        reason += `Habitación ${room.type}; `;
      } else if (room.type === "deluxe" || room.type === "junior_suite") {
        priority += 15;
        reason += `Habitación ${room.type}; `;
      }

      // 4. Prioridad por VIP o características especiales
      if (room.features?.includes("vip")) {
        priority += 30;
        reason += "Habitación VIP; ";
      }

      return {
        roomId: room.id,
        room: room,
        priority,
        reason: reason.trim(),
      };
    })
    .sort((a, b) => b.priority - a.priority);
};

const evaluarCamarera = async (
  hotelId: string,
  camarera: Staff,
  habitacionPriorizada: RoomPriority
): Promise<AssignmentScore> => {
  const habitacion = habitacionPriorizada.room;
  let score = 0;
  let reason = "";

  // 1. Carga de trabajo actual
  const asignacionesActuales = await obtenerAsignacionesActuales(
    hotelId,
    camarera.id
  );
  score -= asignacionesActuales.length * 10;
  reason += `Carga actual: ${asignacionesActuales.length} habitaciones; `;

  // 2. Eficiencia histórica
  if (camarera.efficiency) {
    score += camarera.efficiency;
    reason += `Eficiencia: ${Math.round(camarera.efficiency)}%; `;
  }

  // 3. Proximidad (mismo piso)
  if (asignacionesActuales.some((r) => r.floor === habitacion.floor)) {
    score += 20;
    reason += "Mismo piso; ";
  }

  // 4. Experiencia con tipo de habitación
  const experienciaPrevia = await verificarExperienciaPrevia(
    hotelId,
    camarera.id,
    habitacion.type
  );
  if (experienciaPrevia) {
    score += 15;
    reason += "Experiencia previa; ";
  }

  // 5. Rendimiento por tipo de habitación
  const estadisticasPorTipo = await obtenerEstadisticasPorTipo(
    hotelId,
    camarera.id
  );
  if (habitacion.type && estadisticasPorTipo[habitacion.type]) {
    const eficienciaTipo = estadisticasPorTipo[habitacion.type];
    if (eficienciaTipo > 80) {
      score += 25;
      reason += `Alta eficiencia en ${habitacion.type}: ${Math.round(
        eficienciaTipo
      )}%; `;
    } else if (eficienciaTipo > 60) {
      score += 10;
      reason += `Buena eficiencia en ${habitacion.type}: ${Math.round(
        eficienciaTipo
      )}%; `;
    }
  }

  // 6. Prioridad de la habitación
  score += habitacionPriorizada.priority * 0.2; // Factor de prioridad de habitación
  reason += `Prioridad habitación: ${Math.round(
    habitacionPriorizada.priority * 0.2
  )}; `;

  return {
    staffId: camarera.id,
    score,
    reason: reason.trim(),
  };
};

const obtenerAsignacionesActuales = async (
  hotelId: string,
  staffId: string
): Promise<Room[]> => {
  const roomsRef = collection(db, "hotels", hotelId, "rooms");
  const asignedQuery = query(
    roomsRef,
    where("assignedTo", "==", staffId),
    where("status", "in", [
      "cleaning_occupied",
      "cleaning_checkout",
      "cleaning_touch",
    ])
  );

  const snapshot = await getDocs(asignedQuery);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Room[];
};

const verificarExperienciaPrevia = async (
  hotelId: string,
  staffId: string,
  roomType: string
): Promise<boolean> => {
  if (!roomType) return false;

  const historyRef = collection(db, "hotels", hotelId, "cleaning_records");
  const historyQuery = query(
    historyRef,
    where("staffId", "==", staffId),
    where("status", "==", "completed"),
    orderBy("endTime", "desc"),
    limit(20)
  );

  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.some((doc) => doc.data().roomType === roomType);
};

const obtenerEstadisticasPorTipo = async (
  hotelId: string,
  staffId: string
): Promise<Record<string, number>> => {
  // Por defecto, retornar un objeto vacío
  const estadisticasPorTipo: Record<string, number> = {};

  try {
    const historyRef = collection(db, "hotels", hotelId, "cleaning_records");
    const historyQuery = query(
      historyRef,
      where("staffId", "==", staffId),
      where("status", "==", "completed"),
      orderBy("endTime", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(historyQuery);

    // Agrupar por tipo y calcular eficiencia
    const registrosPorTipo: Record<
      string,
      { total: number; tiempoTotal: number; tiempoEsperadoTotal: number }
    > = {};

    snapshot.docs.forEach((doc) => {
      const registro = doc.data();
      const tipo = registro.roomType || "default";

      if (!registrosPorTipo[tipo]) {
        registrosPorTipo[tipo] = {
          total: 0,
          tiempoTotal: 0,
          tiempoEsperadoTotal: 0,
        };
      }

      registrosPorTipo[tipo].total++;

      if (registro.duration && registro.expectedDuration) {
        registrosPorTipo[tipo].tiempoTotal += registro.duration;
        registrosPorTipo[tipo].tiempoEsperadoTotal += registro.expectedDuration;
      }
    });

    // Calcular eficiencia por tipo
    Object.entries(registrosPorTipo).forEach(([tipo, datos]) => {
      if (datos.tiempoTotal > 0 && datos.tiempoEsperadoTotal > 0) {
        estadisticasPorTipo[tipo] = Math.min(
          100,
          (datos.tiempoEsperadoTotal / datos.tiempoTotal) * 100
        );
      } else {
        estadisticasPorTipo[tipo] = 0;
      }
    });

    return estadisticasPorTipo;
  } catch (error) {
    console.error("Error al obtener estadísticas por tipo:", error);
    return estadisticasPorTipo;
  }
};

const asignarHabitaciones = async (
  hotelId: string,
  habitacionesPriorizadas: RoomPriority[],
  camareras: Staff[]
): Promise<
  {
    roomId: string;
    roomNumber: string;
    staffId: string;
    staffName: string;
    reason: string;
  }[]
> => {
  const asignaciones = [];

  for (const habitacionPriorizada of habitacionesPriorizadas) {
    // Evaluar cada camarera para esta habitación
    const evaluaciones = await Promise.all(
      camareras.map((camarera) =>
        evaluarCamarera(hotelId, camarera, habitacionPriorizada)
      )
    );

    // Seleccionar la mejor camarera
    const mejorAsignacion = evaluaciones.reduce((mejor, actual) =>
      actual.score > mejor.score ? actual : mejor
    );

    // Realizar la asignación
    if (mejorAsignacion.score > 0) {
      const camarera = camareras.find((c) => c.id === mejorAsignacion.staffId);

      if (camarera) {
        await asignarHabitacion(
          hotelId,
          habitacionPriorizada.roomId,
          mejorAsignacion.staffId
        );

        asignaciones.push({
          roomId: habitacionPriorizada.roomId,
          roomNumber: habitacionPriorizada.room.number,
          staffId: mejorAsignacion.staffId,
          staffName: camarera.name,
          reason: mejorAsignacion.reason,
        });
      }
    }
  }

  return asignaciones;
};

const asignarHabitacion = async (
  hotelId: string,
  roomId: string,
  staffId: string
) => {
  const roomRef = doc(db, "hotels", hotelId, "rooms", roomId);
  await updateDoc(roomRef, {
    assignedTo: staffId,
    assignedAt: Timestamp.now(),
  });
};

// Crear asignaciones grupales por camarera
const crearAsignacionesGrupales = async (
  hotelId: string,
  asignaciones: {
    roomId: string;
    roomNumber: string;
    staffId: string;
    staffName: string;
    reason: string;
  }[],
  habitaciones: Room[]
) => {
  // Agrupar asignaciones por camarera
  const asignacionesPorCamarera: Record<
    string,
    {
      staffId: string;
      staffName: string;
      rooms: {
        roomId: string;
        roomNumber: string;
        floor: number;
        status: string;
      }[];
    }
  > = {};

  asignaciones.forEach((asignacion) => {
    if (!asignacionesPorCamarera[asignacion.staffId]) {
      asignacionesPorCamarera[asignacion.staffId] = {
        staffId: asignacion.staffId,
        staffName: asignacion.staffName,
        rooms: [],
      };
    }

    const habitacion = habitaciones.find((h) => h.id === asignacion.roomId);
    if (habitacion) {
      asignacionesPorCamarera[asignacion.staffId].rooms.push({
        roomId: asignacion.roomId,
        roomNumber: habitacion.number,
        floor: habitacion.floor,
        status: "pending",
      });
    }
  });

  // Crear documentos de asignación en Firestore
  const assignmentsRef = collection(db, "hotels", hotelId, "assignments");

  for (const staffId in asignacionesPorCamarera) {
    const asignacion = asignacionesPorCamarera[staffId];

    // Solo crear asignación si hay habitaciones
    if (asignacion.rooms.length > 0) {
      try {
        await addDoc(assignmentsRef, {
          staffId: asignacion.staffId,
          date: Timestamp.now(),
          rooms: asignacion.rooms,
          createdAt: Timestamp.now(),
          status: "active",
          assignmentType: "automatic",
        });
      } catch (error) {
        console.error(
          `Error al crear asignación para ${asignacion.staffName}:`,
          error
        );
      }
    }
  }
};
