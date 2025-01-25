// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';

// Tipos de usuarios
export type UserRole = 'super_admin' | 'hotel_admin' | 'staff';
export type StaffRole = 'housekeeper' | 'maintenance' | 'manager';
export type UserStatus = 'active' | 'inactive';

// Tipos de habitaciones
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning';
export type RoomType = 'single' | 'double' | 'suite' | 'presidential';

// Tipos para mantenimiento
export type MaintenanceType = 'preventive' | 'corrective';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed';
export type MaintenancePriority = 'low' | 'medium' | 'high';
export type MaintenanceCategory = 'room' | 'common_area' | 'equipment' | 'facility';

// Interfaces principales
export interface Hotel {
  id: string;
  hotelName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  status: 'trial' | 'active' | 'suspended';
  trialEndsAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    checkInTime: string;
    checkOutTime: string;
    timezone: string;
  };
}

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
  features: string[];
  lastCleaned: Timestamp;
  lastMaintenance: Timestamp;
  currentGuest?: {
    name: string;
    checkIn: Timestamp;
    checkOut: Timestamp;
  };
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  phone: string;
  status: UserStatus;
  createdAt: Timestamp;
  assignedAreas?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hotelId?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  status: UserStatus;
}

// Actualizamos la interfaz de Maintenance con los nuevos campos
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
  timeSpent?: number; // en minutos
  notes?: string;
  images?: string[];
  rating?: number; // 1-5
  feedback?: string;
}

// Nueva interfaz para métricas de desempeño
export interface StaffPerformanceMetrics {
  totalTasks: number;
  completedTasks: number;
  averageTimePerTask: number; // en minutos
  averageRating: number;
  responseTime: number; // en minutos
  tasksThisMonth: number;
  completionRate: number; // porcentaje
}