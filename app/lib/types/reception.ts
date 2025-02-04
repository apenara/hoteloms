// src/lib/types/reception.ts
import { Timestamp } from 'firebase/firestore';

export interface ReceptionStaff {
  id: string;
  name: string;
  email?: string;
  pin: string;
  role: 'reception';
  status: 'active' | 'inactive';
  hotelId: string;
  lastLogin?: Timestamp;
  lastLoginType?: 'pin' | 'email';
}

export interface RoomStatusChange {
  previousStatus: string;
  newStatus: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  notes?: string;
}

export interface CheckoutInfo {
  timestamp: Timestamp;
  processedBy: {
    id: string;
    name: string;
  };
  notes?: string;
}

export interface OccupancyInfo {
  checkIn?: Timestamp;
  checkOut?: Timestamp;
  guestName?: string;
  guestId?: string;
  reservationId?: string;
  status: 'occupied' | 'checkout' | 'in_house';
}

export interface CleaningProgress {
  status: 'pending' | 'in_progress' | 'completed';
  startTime?: Timestamp;
  estimatedCompletionTime?: Timestamp;
  assignedTo?: {
    id: string;
    name: string;
  };
}

export interface ReceptionNotification {
  id: string;
  type: 'room_ready' | 'cleaning_completed' | 'maintenance_completed' | 'cleaning_delayed';
  roomId: string;
  roomNumber: string;
  timestamp: Timestamp;
  status: 'unread' | 'read';
  priority: 'low' | 'normal' | 'high';
  message?: string;
  details?: {
    completedBy?: string;
    estimatedTime?: number;
    delay?: number;
  };
}

// Extender los tipos existentes

import { Room as BaseRoom } from '@/lib/types';

export interface ReceptionRoom extends BaseRoom {
  occupancyInfo?: OccupancyInfo;
  cleaningProgress?: CleaningProgress;
  lastCheckout?: CheckoutInfo;
  priority?: 'low' | 'normal' | 'high';
  notes?: string[];
}

// Tipos para el contexto de recepción
export interface ReceptionContext {
  hotelId: string;
  notifications: ReceptionNotification[];
  unreadCount: number;
  rooms: ReceptionRoom[];
  refreshData: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

// Tipos para filtros y ordenamiento
export interface RoomFilters {
  status?: string[];
  floor?: number;
  priority?: 'low' | 'normal' | 'high';
  cleaning?: 'pending' | 'in_progress' | 'completed';
  searchTerm?: string;
}

export interface SortOptions {
  field: 'number' | 'status' | 'lastUpdate' | 'priority';
  direction: 'asc' | 'desc';
}

// Enums para estados específicos de recepción
export enum ReceptionRoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  CHECKOUT = 'checkout',
  IN_HOUSE = 'in_house',
  NEED_CLEANING = 'need_cleaning',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance'
}

// Tipos para las acciones de recepción
export type ReceptionAction = 
  | { type: 'CHECKOUT'; payload: { roomId: string; notes?: string } }
  | { type: 'OCCUPY'; payload: { roomId: string; guestInfo: Partial<OccupancyInfo> } }
  | { type: 'MARK_IN_HOUSE'; payload: { roomId: string; guestInfo: Partial<OccupancyInfo> } }
  | { type: 'UPDATE_CLEANING_PRIORITY'; payload: { roomId: string; priority: 'high' | 'normal' } }
  | { type: 'ADD_NOTE'; payload: { roomId: string; note: string } };