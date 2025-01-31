// src/lib/constants/permissions.ts
import type { UserRole, StaffRole } from '@/lib/types'

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
    canAccessOperationalPages: true
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

// Tipos de registro de acceso
export interface AccessLog {
  userId: string
  userName: string
  role: UserRole | StaffRole
  accessType: 'pin' | 'email'
  timestamp: Date
  hotelId: string
  roomId?: string
  action?: string
}