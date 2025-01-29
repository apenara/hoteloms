// src/lib/types.ts
import { Timestamp } from "firebase/firestore";
import { ROOM_STATES, CLEANING_FLOWS } from "./constants/room-states";

// Tipos de usuarios
export type UserRole = "super_admin" | "hotel_admin" | "staff";
export type StaffRole =
  | "housekeeper"
  | "maintenance"
  | "manager"
  | "supervisor";
export type UserStatus = "active" | "inactive";

// Tipos de habitaciones
export type RoomStatus = keyof typeof ROOM_STATES;
export type RoomType = "single" | "double" | "suite" | "presidential";
export type CleaningFlow = keyof typeof CLEANING_FLOWS;

// Tipos para mantenimiento
export type MaintenanceType = "preventive" | "corrective";
export type MaintenanceStatus = "pending" | "in_progress" | "completed";
export type MaintenancePriority = "low" | "medium" | "high";
export type MaintenanceCategory =
  | "room"
  | "common_area"
  | "equipment"
  | "facility";

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
  features: string[];
  lastCleaned: Timestamp;
  lastMaintenance: Timestamp;
  lastStatusChange: Timestamp;
  assignedTo?: string;
  currentGuest?: {
    name: string;
    checkIn: Timestamp;
    checkOut: Timestamp;
  };
  lastUpdatedBy?: {
    id: string;
    name: string;
    role: StaffRole;
  };
  tiempoLimpieza?: number;
  requiresInspection?: boolean;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  phone: string;
  status: UserStatus;
  estado: RoomStatus;
  createdAt: Timestamp;
  assignedAreas?: string[];
  efficiency?: number;
  tiempoPromedio?: number;
  habitacionesCompletadas?: number;
}

// Las demás interfaces se mantienen igual
export interface Hotel {
  id: string;
  hotelName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  status: "trial" | "active" | "suspended";
  trialEndsAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    checkInTime: string;
    checkOutTime: string;
    timezone: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hotelId: string; // Asegúrate de que hotelId esté definido aquí
  createdAt: Timestamp;
  lastLogin: Timestamp;
  status: UserStatus;
}

export interface Maintenance {
  id: string;
  roomId: string;
  staffId: string;
  type: MaintenanceType;
  category: MaintenanceCategory;
  description: string;
  location: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  scheduledFor: Timestamp;
  timeSpent?: number;
  notes?: string;
  images?: string[];
  rating?: number;
  feedback?: string;
  assignedTo?: string;
}

export interface StaffPerformanceMetrics {
  totalTasks: number;
  completedTasks: number;
  averageTimePerTask: number;
  averageRating: number;
  responseTime: number;
  tasksThisMonth: number;
  completionRate: number;
}
