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
  '/housekeeping'
]

// Rutas públicas
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password'
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

  // Verificar rutas de nivel 1 (requieren authToken)
  if (LEVEL_1_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Aquí podrías agregar verificación adicional del rol si es necesario
  }

  // Verificar rutas de nivel 2 (aceptan authToken o staffAccess)
  if (LEVEL_2_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken && !staffAccess) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Registrar el acceso por PIN si existe staffAccess
  if (staffAccess) {
    // Aquí podrías implementar la lógica para registrar el acceso
    // Por ejemplo, haciendo una llamada a tu API
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