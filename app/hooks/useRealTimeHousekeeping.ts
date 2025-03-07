// src/hooks/useRealTimeHousekeeping.ts
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  // Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Staff, Room } from "@/app/lib/types";
import { startOfDay, endOfDay } from "date-fns";
import { convertToDate } from "@/app/lib/utils/housekeeping";

interface UseRealTimeHousekeepingProps {
  hotelId: string;
  selectedDate?: Date;
}

interface EstadisticasGlobales {
  total: number;
  completadas: number;
  enProgreso: number;
  pendientes: number;
  inspeccion: number;
  eficienciaGlobal: number;
  tiempoPromedioGlobal: number;
}

export const useRealTimeHousekeeping = ({
  hotelId,
  selectedDate = new Date(),
}: UseRealTimeHousekeepingProps) => {
  const [camareras, setCamareras] = useState<Staff[]>([]);
  const [habitaciones, setHabitaciones] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadisticasGlobales, setEstadisticasGlobales] =
    useState<EstadisticasGlobales>({
      total: 0,
      completadas: 0,
      enProgreso: 0,
      pendientes: 0,
      inspeccion: 0,
      eficienciaGlobal: 0,
      tiempoPromedioGlobal: 0,
    });

  // Función para calcular estadísticas
  const calcularEstadisticas = useCallback(
    (
      habitacionesFiltradas: Room[],
      staffList: Staff[]
    ): EstadisticasGlobales => {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      // Filtrar habitaciones del día
      const habitacionesDelDia = habitacionesFiltradas.filter((h) => {
        if (!h.lastStatusChange) return false;

        const fecha = convertToDate(h.lastStatusChange);
        if (!fecha) return false;

        return fecha >= startOfSelectedDay && fecha <= endOfSelectedDay;
      });

      // Contadores básicos
      const contadores = {
        total: habitacionesDelDia.length,
        completadas: habitacionesDelDia.filter((h) => h.status === "available")
          .length,
        enProgreso: habitacionesDelDia.filter((h) =>
          ["cleaning_occupied", "cleaning_checkout", "cleaning_touch"].includes(
            h.status
          )
        ).length,
        pendientes: habitacionesDelDia.filter((h) =>
          ["need_cleaning", "checkout"].includes(h.status)
        ).length,
        inspeccion: habitacionesDelDia.filter((h) => h.status === "inspection")
          .length,
      };

      // Cálculo de eficiencia global
      const eficienciasPorCamarera = staffList
        .map((camarera) => {
          const habitacionesCamarera = habitacionesDelDia.filter(
            (h) => h.assignedTo === camarera.id
          );
          if (!habitacionesCamarera.length) return 0;
          return (
            (habitacionesCamarera.filter((h) => h.status === "available")
              .length /
              habitacionesCamarera.length) *
            100
          );
        })
        .filter((eficiencia) => eficiencia > 0);

      const eficienciaGlobal = eficienciasPorCamarera.length
        ? eficienciasPorCamarera.reduce((acc, curr) => acc + curr, 0) /
          eficienciasPorCamarera.length
        : 0;

      // Cálculo de tiempo promedio
      const tiemposLimpieza = habitacionesDelDia
        .filter((h) => h.tiempoLimpieza && h.tiempoLimpieza > 0)
        .map((h) => h.tiempoLimpieza || 0);

      const tiempoPromedioGlobal = tiemposLimpieza.length
        ? tiemposLimpieza.reduce((acc, curr) => acc + curr, 0) /
          tiemposLimpieza.length
        : 0;

      return {
        ...contadores,
        eficienciaGlobal,
        tiempoPromedioGlobal,
      };
    },
    [selectedDate]
  );

  // Función para cargar datos iniciales (una sola vez)
  const fetchInitialData = useCallback(async () => {
    if (!hotelId) {
      setError("Hotel ID no proporcionado");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar si hay datos en sessionStorage
      const cachedRoomsKey = `rooms_${hotelId}`;
      const cachedStaffKey = `staff_housekeeper_${hotelId}`;
      const cachedRooms = sessionStorage.getItem(cachedRoomsKey);
      const cachedStaff = sessionStorage.getItem(cachedStaffKey);
      const cacheTimestamp = sessionStorage.getItem(
        `${cachedRoomsKey}_timestamp`
      );

      // Si hay datos en cache y tienen menos de 5 minutos, usarlos
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
      if (cachedRooms && cachedStaff && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setHabitaciones(JSON.parse(cachedRooms));
          setCamareras(JSON.parse(cachedStaff));
          setLoading(false);

          // Aún así iniciar las suscripciones en tiempo real
          startRealTimeSubscriptions();
          return;
        }
      }

      // Obtener datos de camareras
      const staffRef = collection(db, "hotels", hotelId, "staff");
      const staffQuery = query(
        staffRef,
        where("role", "==", "housekeeper"),
        where("status", "==", "active"),
        orderBy("name")
      );

      const staffSnapshot = await getDocs(staffQuery);
      const staffData = staffSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Staff[];

      // Obtener datos de habitaciones
      const roomsRef = collection(db, "hotels", hotelId, "rooms");
      const roomsQuery = query(roomsRef);
      const roomsSnapshot = await getDocs(roomsQuery);
      const roomsData = roomsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      // Actualizar el estado
      setCamareras(staffData);
      setHabitaciones(roomsData);

      // Guardar en sessionStorage
      sessionStorage.setItem(cachedStaffKey, JSON.stringify(staffData));
      sessionStorage.setItem(cachedRoomsKey, JSON.stringify(roomsData));
      sessionStorage.setItem(
        `${cachedRoomsKey}_timestamp`,
        Date.now().toString()
      );

      setLoading(false);

      // Iniciar las suscripciones en tiempo real
      startRealTimeSubscriptions();
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      setError("Error al cargar datos iniciales");
      setLoading(false);
    }
  }, [hotelId]);

  // Función para iniciar suscripciones en tiempo real
  const startRealTimeSubscriptions = useCallback(() => {
    if (!hotelId) return;

    // Queries
    const staffRef = collection(db, "hotels", hotelId, "staff");
    const staffQuery = query(
      staffRef,
      where("role", "==", "housekeeper"),
      where("status", "==", "active"),
      orderBy("name")
    );

    const roomsRef = collection(db, "hotels", hotelId, "rooms");
    const roomsQuery = query(roomsRef);

    // Suscripciones
    const unsubscribeStaff = onSnapshot(
      staffQuery,
      (snapshot) => {
        const staffData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Staff[];
        setCamareras(staffData);

        // Actualizar cache
        sessionStorage.setItem(
          `staff_housekeeper_${hotelId}`,
          JSON.stringify(staffData)
        );
      },
      (error) => {
        console.error("Error en snapshot de camareras:", error);
        setError("Error al obtener datos de camareras");
      }
    );

    const unsubscribeRooms = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const roomsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        setHabitaciones(roomsData);

        // Actualizar cache
        const cachedRoomsKey = `rooms_${hotelId}`;
        sessionStorage.setItem(cachedRoomsKey, JSON.stringify(roomsData));
        sessionStorage.setItem(
          `${cachedRoomsKey}_timestamp`,
          Date.now().toString()
        );
      },
      (error) => {
        console.error("Error en snapshot de habitaciones:", error);
        setError("Error al obtener datos de habitaciones");
      }
    );

    return () => {
      unsubscribeStaff();
      unsubscribeRooms();
    };
  }, [hotelId]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Efecto para actualizar estadísticas
  useEffect(() => {
    if (camareras.length > 0 || habitaciones.length > 0) {
      const nuevasEstadisticas = calcularEstadisticas(habitaciones, camareras);
      setEstadisticasGlobales(nuevasEstadisticas);
    }
  }, [habitaciones, camareras, calcularEstadisticas]);

  return {
    camareras,
    habitaciones,
    estadisticasGlobales,
    loading,
    error,
  };
};
