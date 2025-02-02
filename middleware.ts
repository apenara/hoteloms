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
  '/maintenance',
  '/housekeeping',
  '/reception'
]

// Rutas públicas
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password'
]

// Rutas de acceso de personal
const STAFF_ACCESS_ROUTES = [
  '/rooms/[hotelId]/[roomId]/staff',
  '/maintenance/[hotelId]/staff',
  '/reception/[hotelId]/staff'
]

// Rutas de login de personal
const STAFF_LOGIN_ROUTES = [
  '/rooms/[hotelId]/[roomId]/login',
  '/maintenance/[hotelId]/login',
  '/reception/[hotelId]/login'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si es una ruta pública
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar si es una ruta de login de personal
  if (STAFF_LOGIN_ROUTES.some(route => pathname.includes(route))) {
    return NextResponse.next()
  }

  // Obtener tokens de autenticación
  const authToken = request.cookies.get('authToken')?.value
  const staffAccess = request.cookies.get('staffAccess')?.value
  const staffSession = request.cookies.get('currentStaffSession')?.value

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

  // Verificar rutas de acceso de personal
  if (STAFF_ACCESS_ROUTES.some(route => pathname.includes(route))) {
    // Si no hay sesión de staff o authToken, redirigir al login correspondiente
    if (!staffSession && !authToken) {
      // Extraer la ruta base para redirigir al login correspondiente
      const baseRoute = pathname.split('/staff')[0]
      return NextResponse.redirect(new URL(`${baseRoute}/login`, request.url))
    }
  }

  // Si hay staffAccess, verificar que la sesión no haya expirado
  if (staffAccess) {
    try {
      const session = JSON.parse(staffSession || '{}')
      const sessionStart = new Date(session.sessionStart || 0).getTime()
      const now = new Date().getTime()
      const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 horas

      if (now - sessionStart > SESSION_DURATION) {
        // Limpiar cookies de sesión expirada
        const response = NextResponse.redirect(new URL('/', request.url))
        response.cookies.delete('staffAccess')
        response.cookies.delete('currentStaffSession')
        return response
      }
    } catch (error) {
      console.error('Error verificando sesión:', error)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}