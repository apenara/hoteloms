// src/lib/types/housekeeping.ts
import { Dispatch, SetStateAction } from "react";
import { Staff, Room } from "@/lib/types"; // Asegúrate que la ruta sea correcta

export interface EstadisticasGlobales {
  habitacionesLimpias: number;
  habitacionesPendientes: number;
  tiempoPromedioLimpieza: number;
}

export interface HousekeepingStaffListProps {
  camareras: Staff[];
  habitaciones: Room[];
  searchTerm: string;
}

export interface HousekeepingStatsProps {
  estadisticasGlobales: EstadisticasGlobales;
  selectedDate: Date;
  onDateChange: Dispatch<SetStateAction<Date>>;
}

export interface CombinedHousekeepingProps
  extends HousekeepingStaffListProps,
    HousekeepingStatsProps {
  // Props adicionales si las necesitas
}
