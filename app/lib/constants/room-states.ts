// src/lib/constants/room-states.ts
import { Alert } from '@/app/components/ui/alert';
import { Clock, BedDouble, Paintbrush, AlertTriangle, CheckCircle, Trash2, Home, Sparkles, UserCheck, Moon, ClipboardCheck } from 'lucide-react';


export const MAINTENANCE_REQUEST_TYPES = {
  'corrective': {
    label: 'Correctivo',
    priority: 'medium',
    requiresBlocking: false
  },
  'preventive': {
    label: 'Preventivo',
    priority: 'low',
    requiresBlocking: false
  },
  'emergency': {
    label: 'Emergencia',
    priority: 'high',
    requiresBlocking: true
  },
  'blocked': {
    label: 'Bloqueo por Mantenimiento',
    priority: 'medium',
    requiresBlocking: true,
    changesRoomState: true
  }
} as const;

export const ROOM_STATES = {
  // Estados básicos
  'available': {
    label: 'Disponible',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
    group: 'reception'
  },
  'occupied': {
    label: 'Ocupada',
    icon: BedDouble,
    color: 'bg-sky-100 text-sky-800',
    group: 'reception'
  },
  'occupied_maintenance': {
    label: 'Ocupada con Mantenimiento Pendiente',
    icon: AlertTriangle,
    color: 'bg-amber-100 text-amber-800',
    group: 'reception',
    hasMaintenanceRequest: true
  },
  'checkout': {
    label: 'Check-out',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    group: 'reception',
    autoTransition: 'need_cleaning',
    notifyGroup: 'housekeeping'
  },
  'checkout_today': {
    label: 'Check Out Hoy',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    group: 'reception',
    autoTransition: 'need_cleaning',
    notifyGroup: 'housekeeping'
  },
  'blocked_maintenance': {
    label: 'Bloqueada por Mantenimiento',
    icon: AlertTriangle,
    color: 'bg-rose-100 text-rose-800',
    group: 'maintenance',
    requiresApproval: true
  },
  'in_house': {
    label: 'En Casa',
    icon: UserCheck,
    color: 'bg-violet-100 text-violet-800',
    group: 'reception',
    priority: 'high',
    notifyGroup: 'housekeeping'
  },

  // Estados de Limpieza
  'need_cleaning': {
    label: 'Necesita Limpieza',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800',
    group: 'cleaning'
  },
  'cleaning_occupied': {
    label: 'Limpieza Ocupada',
    icon: Paintbrush,
    color: 'bg-yellow-100 text-yellow-800',
    group: 'cleaning'
  },
  'clean_occupied': {
    label: 'Limpia Ocupada',
    icon: CheckCircle,
    color: 'bg-teal-100 text-teal-800',
    group: 'cleaning'
  },
  'cleaning_checkout': {
    label: 'Limpieza Check-out',
    icon: Home,
    color: 'bg-fuchsia-100 text-fuchsia-800',
    group: 'cleaning',
    requiresInspection: true
  },
  'cleaning_touch': {
    label: 'Retoque',
    icon: Sparkles,
    color: 'bg-indigo-100 text-indigo-800',
    group: 'cleaning',
    requiresInspection: true
  },
  'ready_for_inspection': {
    label: 'Lista para Inspección',
    icon: ClipboardCheck,
    color: 'bg-blue-100 text-blue-800', 
    group: 'cleaning',
    requiresInspection: true,
    notifyGroup: 'supervisor'
  },
  'inspection': {
    label: 'En Inspección',
    icon: CheckCircle,
    color: 'bg-cyan-100 text-cyan-800',
    group: 'cleaning',
    autoTransition: 'available'
  },
  'do_not_disturb': {
    label: 'No Molestar',
    icon: Moon,
    color: 'bg-black-100 text-black-800',
    group: 'cleaning'
  },
  // Estado de Mantenimiento
  'maintenance': {
    label: 'Mantenimiento',
    icon: AlertTriangle,
    color: 'bg-rose-100 text-rose-800',
    group: 'maintenance'
  }
} as const;

export type RoomStatus = keyof typeof ROOM_STATES;

// Flujos de estado permitidos por rol
export const ROLE_STATE_FLOWS = {
  reception: {
    'available': ['occupied'],
    'occupied': ['checkout', 'occupied_maintenance', 'checkout_today'],
    'checkout_today': ['checkout', 'available'],
    'occupied_maintenance': ['checkout'],
    'clean_occupied': ['checkout'],
    'checkout': ['in_house', 'available'],
    'in_house': ['occupied'],
    'inspection': ['occupied', 'in_house'],
    'do_not_disturb': ['checkout'],
    'maintenance': ['available', 'need_cleaning'],
    'need_cleaning': [], // Solo lectura.
    'blocked_maintenance': ['available', 'need_cleaning']
  },
  housekeeper: {
    'need_cleaning': ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'],
    'cleaning_occupied': ['clean_occupied', 'do_not_disturb'],
    'cleaning_checkout': ['ready_for_inspection'],
    'cleaning_touch': ['ready_for_inspection'],
    'do_not_disturb': ['cleaning_occupied', 'cleaning_checkout'] // Poder volver a cleaning cuando el huésped ya no está
  },
  supervisor: {
    'ready_for_inspection': ['inspection'], // Nuevo flujo: de lista para inspección a en inspección
    'inspection': ['available'] // La inspección pasa automáticamente a disponible
  },
  maintenance: {
    'available': ['blocked_maintenance'],
    'blocked_maintenance': ['available', 'need_cleaning']
  }
} as const;

// Esta constante define qué roles pueden ver y modificar cada tipo de estado
export const ROLE_PERMISSIONS = {
  reception: {
    canView: ['available', 'occupied', 'checkout', 'in_house', 'need_cleaning', 'cleaning_checkout', 'inspection', 'maintenance', 'cleaning_touch', 'clean_occupied', 'ready_for_inspection'],
    canModify: ['available', 'occupied', 'checkout', 'in_house']
  },
  housekeeper: {
    canView: ['need_cleaning', 'cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'ready_for_inspection'],
    canModify: ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'ready_for_inspection']
  },
  supervisor: {
    canView: ['ready_for_inspection', 'inspection'],
    canModify: ['inspection', 'available']
  },
  maintenance: {
    canView: ['maintenance'],
    canModify: ['maintenance', 'available']
  }
} as const;

// New constant for state change notifications
export const STATE_NOTIFICATIONS = {
  'in_house': {
    message: 'Habitación {roomNumber} se marcó como In House',
    priority: 'high',
    targetRole: 'housekeeping' // Changed from 'reception' to 'housekeeping'
  },
  'checkout': {
    message: 'Habitación {roomNumber} Check-out',
    priority: 'normal',
    targetRole: 'housekeeping'
  },
  'maintenance': {
    message: 'Habitación {roomNumber} necesita mantenimiento',
    priority: 'high',
    targetRole: 'maintenance'
  },
  'available': {
    message: 'Habitación {roomNumber} ahora disponible',
    priority: 'normal',
    targetRole: ['reception', 'housekeeper']
  },
  'need_cleaning':{
    message: 'Habitación {roomNumber} necesita limpieza',
    priority: 'high',
    targetRole: 'housekeeper'
  },
  'ready_for_inspection':{
    message: 'Habitación {roomNumber} lista para inspección',
    priority: 'normal',
    targetRole: 'supervisor'
  }
} as const;
