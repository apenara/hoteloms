// src/lib/constants/room-states.ts
import { Clock, BedDouble, Paintbrush, AlertTriangle, CheckCircle, Trash2, Home, Sparkles, UserCheck } from 'lucide-react';

export const ROOM_STATES = {
  // Estados básicos
  'available': {
    label: 'Disponible',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    group: 'basic'
  },
  'occupied': {
    label: 'Ocupada',
    icon: BedDouble,
    color: 'bg-blue-100 text-blue-800',
    group: 'reception'
  },
  'checkout': {
    label: 'Check-out',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    group: 'reception',
    autoTransition: 'need_cleaning',  // Indica que debe pasar automáticamente a need_cleaning
    notifyGroup: 'housekeeping'       // Indica a qué grupo notificar
  },
  'in_house': {
    label: 'En Casa',
    icon: UserCheck,
    color: 'bg-purple-100 text-purple-800',
    group: 'reception',
    priority: 'high',                 // Indica prioridad alta para limpieza
    notifyGroup: 'housekeeping'       // Indica a qué grupo notificar
  },
  'need_cleaning': {
    label: 'Necesita Limpieza',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800',
    group: 'cleaning'
  },
  'cleaning_occupied': {
    label: 'Limpieza Ocupada',
    icon: Paintbrush,
    color: 'bg-yellow-100 text-yellow-800',
    group: 'cleaning'
  },'clean_occupied': {
    label: 'Limpia Ocupada',
    icon: CheckCircle,
    color: 'bg-yellow-100 text-yellow-800',
    group: 'cleaning'
  },
  'cleaning_checkout': {
    label: 'Limpieza Check-out',
    icon: Home,
    color: 'bg-purple-100 text-purple-800',
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
  'inspection': {
    label: 'Inspección',
    icon: CheckCircle,
    color: 'bg-cyan-100 text-cyan-800',
    group: 'cleaning'
  },
  'maintenance': {
    label: 'Mantenimiento',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800',
    group: 'maintenance'
  }
} as const;

export type RoomStatus = keyof typeof ROOM_STATES;

// Flujos de estado permitidos por rol
export const ROLE_STATE_FLOWS = {
  reception: {
    'available': ['occupied', 'in_house'],
    'occupied': ['checkout'],
    'clean_occupied': ['checkout'],
    // 'checkout': ['need_cleaning'],
    'in_house': ['occupied'],
    'inspection': ['occupied', 'in_house'],
    'need_cleaning': [] // Solo lectura
  },
  housekeeper: {
    'need_cleaning': ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'],
    'cleaning_occupied': ['clean_occupied'],
    'cleaning_checkout': ['inspection'],
    'cleaning_touch': ['inspection']
  },
  supervisor: {
    'inspection': ['available']
  },
  maintenance: {
    'maintenance': ['available', 'need_cleaning']
  }
} as const;

// Esta constante define qué roles pueden ver y modificar cada tipo de estado
export const ROLE_PERMISSIONS = {
  reception: {
    canView: ['available', 'occupied', 'checkout', 'in_house', 'need_cleaning', 'cleaning_checkout', 'inspection', 'maintenance', 'cleaning_touch', 'clean_occupied'], // Estados que puede ver,
    canModify: ['available', 'occupied', 'checkout', 'in_house']
  },
  housekeeper: {
    canView: ['need_cleaning', 'cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'],
    canModify: ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch']
  },
  supervisor: {
    canView: ['inspection'],
    canModify: ['inspection', 'available']
  },
  maintenance: {
    canView: ['maintenance'],
    canModify: ['maintenance', 'available']
  }
} as const;