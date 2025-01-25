// src/lib/constants/room-states.ts
import { Clock, BedDouble, Paintbrush, AlertTriangle, CheckCircle, Trash2, Home, Sparkles } from 'lucide-react';

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
   group: 'basic'
 },
 'need_cleaning': {
   label: 'Necesita Limpieza',
   icon: Clock,
   color: 'bg-yellow-100 text-yellow-800',
   group: 'cleaning'
 },
 'cleaning_occupied': {
    label: 'Iniciando Limpieza Ocupada',
    icon: Paintbrush,
    color: 'bg-yellow-100 text-yellow-800',
    group: 'cleaning',
  },
  'clean_occupied': {
    label: 'Finalizar Limpieza Ocupada',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    group: 'cleaning',
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
 },
 'public_areas': {
   label: 'Áreas Públicas',
   icon: Trash2,
   color: 'bg-orange-100 text-orange-800',
   group: 'cleaning'
 }
} as const;

export type RoomStatus = keyof typeof ROOM_STATES;

// Flujo de limpieza según tipo
export const CLEANING_FLOWS = {
    'cleaning_occupied': ['need_cleaning', 'cleaning_occupied', 'clean_occupied'],
    'cleaning_checkout': ['need_cleaning', 'cleaning_checkout', 'inspection', 'available'],
    'cleaning_touch': ['need_cleaning', 'cleaning_touch', 'inspection', 'available']
  } as const;

// Roles y estados permitidos
export const ALLOWED_TRANSITIONS = {
  housekeeper: ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch', 'public_areas'],
  supervisor: ['inspection', 'available'],
  maintenance: ['maintenance', 'available'],
  receptionist: ['available', 'occupied']
} as const;