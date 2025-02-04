// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'super_admin' | 'hotel_admin' | 'supervisor';

export type StaffRole = 'reception' | 'housekeeper' | 'maintenance' | 'manager';

// Tipos para mantenimiento
export type MaintenanceType = 'preventive' | 'corrective';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed';
export type MaintenancePriority = 'low' | 'medium' | 'high';
export type MaintenanceCategory = 'room' | 'common_area' | 'equipment' | 'facility';


export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  hotelId?: string;
  status: 'active' | 'inactive' | 'pending_activation';
}

export interface Staff {
  id: string;
  name: string;
  email?: string;
  pin?: string;
  role: StaffRole;
  hotelId: string;
  status: 'active' | 'inactive';
  assignedAreas?: string[];
  lastLogin?: Timestamp;
  lastLoginType?: 'pin' | 'email';
  efficiency?: number;
  assignedTasks?: number;
}

export interface Room {
  id: string;
  number: string;
  type: string;
  floor: number;
  status: RoomStatus;
  features?: string[];
  cleaningStartTime?: Timestamp;
  lastStatusChange?: Timestamp;
  lastCleaned?: Timestamp;
  lastMaintenance?: Timestamp;
  assignedTo?: string;
  currentMaintenance?: {
    status: 'pending' | 'in_progress' | 'completed';
    description: string;
    createdAt: Timestamp;
  };
}

// Estados de habitación actualizados para incluir los estados de recepción
export type RoomStatus = 
  | 'available'
  | 'occupied'
  | 'checkout'
  | 'in_house'
  | 'need_cleaning'
  | 'cleaning_occupied'
  | 'cleaning_checkout'
  | 'cleaning_touch'
  | 'inspection'
  | 'maintenance'
  | 'clean_occupied';

export interface AccessLog {
  userId: string;
  userName: string;
  role: UserRole | StaffRole;
  accessType: 'pin' | 'email';
  timestamp: Timestamp;
  hotelId: string;
  action?: string;
}

export interface Hotel {
  id: string;
  name: string;
  adminId?: string;
  status: 'active' | 'inactive';
  subscription?: {
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'expired' | 'cancelled';
    expiresAt: Timestamp;
  };
  features?: {
    maxRooms: number;
    maxStaff: number;
    modules: string[];
  };
}

// Tipos base para notificaciones
export interface BaseNotification {
  id: string;
  type: string;
  timestamp: Timestamp;
  status: 'unread' | 'read';
  priority: 'low' | 'normal' | 'high';
  targetRole: StaffRole | UserRole;
  message?: string;
}

export interface CleaningMetrics {
  averageTime: number;
  completedToday: number;
  pendingCount: number;
  efficiency: number;
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
  timeSpent?: number; // en minutos
  notes?: string;
  images?: string[];
  rating?: number; // 1-5
  feedback?: string;
}


export interface MaintenanceRequest {
  id: string;
  roomId: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  priority: 'low' | 'normal' | 'high';
  createdAt: Timestamp;
  assignedTo?: string;
  completedAt?: Timestamp;
  notes?: string[];
}