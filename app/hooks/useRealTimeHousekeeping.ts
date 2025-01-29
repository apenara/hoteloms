// src/hooks/useRealTimeHousekeeping.ts
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  // Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Staff, Room } from "@/app/lib/types";
import { startOfDay, endOfDay } from "date-fns";

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
        const fecha = h.lastStatusChange.toDate();
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

  // Efecto para las suscripciones en tiempo real
  useEffect(() => {
    if (!hotelId) {
      setError("Hotel ID no proporcionado");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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
        setLoading(false);
      },
      (error) => {
        console.error("Error en snapshot de habitaciones:", error);
        setError("Error al obtener datos de habitaciones");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeStaff();
      unsubscribeRooms();
    };
  }, [hotelId]);

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
