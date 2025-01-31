// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que requieren autenticación de nivel 1 (usuarios administrativos)
const LEVEL_1_ROUTES = [
  '/dashboard',
  '/hotels',
  '/settings',
  '/staff-management',
  '/subscriptions'
]

// Rutas que requieren autenticación de nivel 2 (personal operativo)
const LEVEL_2_ROUTES = [
  '/rooms',
  '/housekeeping'
]

// Rutas específicas para mantenimiento
const MAINTENANCE_ROUTES = [
  '/maintenance/staff'
]

// Rutas públicas
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/maintenance/login'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si es una ruta pública
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Obtener tokens de autenticación
  const authToken = request.cookies.get('authToken')?.value
  const staffAccess = request.cookies.get('staffAccess')?.value

  // Verificar rutas de mantenimiento
  if (MAINTENANCE_ROUTES.some(route => pathname.startsWith(route))) {
    if (!staffAccess) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    try {
      // Verificar que sea personal de mantenimiento
      const staffData = staffAccess ? JSON.parse(staffAccess) : null
      if (!staffData || staffData.role !== 'maintenance') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Verificar rutas de nivel 1 (requieren authToken)
  if (LEVEL_1_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Verificar rutas de nivel 2 (aceptan authToken o staffAccess)
  if (LEVEL_2_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken && !staffAccess) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}