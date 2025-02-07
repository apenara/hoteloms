// src/lib/constants/permissions.ts
import type { UserRole, StaffRole } from '@/app/lib/types';

export const ROLE_PERMISSIONS = {
  super_admin: {
    canAccessDashboard: true,
    canManageHotels: true,
    canManageSubscriptions: true,
    canManageUsers: true,
    canAccessAllHotels: true,
    canAccessOperationalPages: true
  },
  hotel_admin: {
    canAccessDashboard: true,
    canManageStaff: true,
    canManageRooms: true,
    canManageSettings: true,
    canGenerateQR: true,
    canViewReports: true,
    canAccessOperationalPages: true,
    canChangeRoomStatus: true,
    canViewAllRooms: true,
    canApproveCleanings: true,
    canCreateRequests: true,
    canUpdateMaintenanceRequests: true,
    canAssignTasks: true,
    allowedStatuses: [
      'available', 'occupied', 'checkout', 'in_house',
      'need_cleaning', 'cleaning_occupied', 'cleaning_checkout', 
      'cleaning_touch', 'ready_for_inspection', 'inspection',
      'maintenance', 'do_not_disturb', 'clean_occupied'
    ],
    priorityLevels: ['low', 'normal', 'high', 'urgent']
  },
  supervisor: {
    canAccessDashboard: true,
    canViewReports: true,
    canManageRooms: true,
    canApproveCleanings: true,
    canAccessOperationalPages: true
  }
} as const;

export const STAFF_PERMISSIONS = {
  reception: {
    canChangeRoomStatus: true,
    canViewAllRooms: true,
    allowedStatuses: ['available', 'occupied', 'checkout', 'in_house'],
    canViewCleaningProgress: true,
    canCreateRequests: true,
    canViewNotifications: true,
    canUpdateOccupancyInfo: true,
    priorityLevels: ['normal', 'high'],
    canAccessDashboard: true
  },
  housekeeper: {
    canChangeRoomStatus: true,
    allowedStatuses: ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'need_cleaning'],
    canCreateRequests: true
  },
  maintenance: {
    canChangeRoomStatus: true,
    allowedStatuses: ['maintenance', 'available'],
    canCreateRequests: true,
    canUpdateMaintenanceRequests: true
  },
  manager: {
    canChangeRoomStatus: true,
    canApproveCleanings: true,
    canCreateRequests: true,
    canAssignTasks: true
  }
} as const;

// Tipos de acciones permitidas por rol
export const ROLE_ACTIONS = {
  reception: {
    roomStatusChanges: {
      'available': ['occupied', 'maintenance'],
      'occupied': ['checkout'],
      'checkout': ['need_cleaning'],
      'in_house': ['occupied'],
      'need_cleaning': [] // Solo lectura
    },
    notifications: {
      canView: ['room_ready', 'cleaning_completed', 'maintenance_completed', 'cleaning_delayed'],
      canCreate: ['priority_cleaning']
    }
  }
} as const;

export function hasPermission(
  role: UserRole | StaffRole,
  permission: string
): boolean {
  if (role in ROLE_PERMISSIONS) {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS][permission] || false
  }
  if (role in STAFF_PERMISSIONS) {
    return STAFF_PERMISSIONS[role as keyof typeof STAFF_PERMISSIONS][permission] || false
  }
  return false
}

export function getAllowedStatuses(role: StaffRole): string[] {
  return STAFF_PERMISSIONS[role]?.allowedStatuses || []
}

export function canChangeStatus(
  role: StaffRole,
  currentStatus: string,
  newStatus: string
): boolean {
  if (role === 'reception') {
    const allowedChanges = ROLE_ACTIONS.reception.roomStatusChanges[currentStatus];
    return allowedChanges?.includes(newStatus) || false;
  }
  return STAFF_PERMISSIONS[role]?.allowedStatuses?.includes(newStatus) || false;
}

export function canViewStatus(role: StaffRole, status: string): boolean {
  if (role === 'reception' && STAFF_PERMISSIONS.reception.canViewAllRooms) {
    return true;
  }
  return STAFF_PERMISSIONS[role]?.allowedStatuses?.includes(status) || false;
}

export function getPriorityLevels(role: StaffRole): string[] {
  return STAFF_PERMISSIONS[role]?.priorityLevels || ['normal'];
}

// Tipos de registro de acceso
export interface AccessLog {
  userId: string;
  userName: string;
  role: UserRole | StaffRole;
  accessType: 'pin' | 'email';
  timestamp: Date;
  hotelId: string;
  roomId?: string;
  action?: string;
}

// Verificar si un usuario puede realizar una acción específica en una habitación
export function canPerformRoomAction(
  role: StaffRole,
  action: string,
  currentStatus?: string,
  newStatus?: string
): boolean {
  const permissions = STAFF_PERMISSIONS[role];
  
  if (!permissions) return false;

  switch (action) {
    case 'change_status':
      if (!currentStatus || !newStatus) return false;
      return canChangeStatus(role, currentStatus, newStatus);
      
    case 'view_cleaning_progress':
      return !!permissions.canViewCleaningProgress;
      
    case 'update_occupancy':
      return !!permissions.canUpdateOccupancyInfo;
      
    case 'set_priority':
      return Array.isArray(permissions.priorityLevels) && 
             permissions.priorityLevels.length > 0;
      
    default:
      return false;
  }
}