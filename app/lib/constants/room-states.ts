// src/lib/constants/room-states.ts
import { Clock, BedDouble, Paintbrush, AlertTriangle, CheckCircle, Trash2, Home, Sparkles, UserCheck, Moon } from 'lucide-react';

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
  'checkout': {
    label: 'Check-out',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    group: 'reception',
    autoTransition: 'need_cleaning',
    notifyGroup: 'housekeeping'
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
  'inspection': {
    label: 'Inspección',
    icon: CheckCircle,
    color: 'bg-cyan-100 text-cyan-800',
    group: 'cleaning'
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
    'occupied': ['checkout'],
    'clean_occupied': ['checkout'],
    'checkout': ['in_house'],
    'in_house': ['occupied'],
    'inspection': ['occupied', 'in_house'],
    'need_cleaning': [] // Solo lectura
  },
  housekeeper: {
    'need_cleaning': ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'],
    'cleaning_occupied': ['clean_occupied', 'do_not_disturb'],
    'cleaning_checkout': ['inspection'],
    'cleaning_touch': ['inspection'],
    'do_not_disturb': ['cleaning_occupied', 'cleaning_checkout'] // Poder volver a cleaning cuando el huésped ya no está
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