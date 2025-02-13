// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from 'firebase-admin'
import { initAdmin } from '@/lib/firebase/admin-config'

// Inicializar Firebase Admin
initAdmin()

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
  const firebaseToken = request.cookies.get('firebase-token')?.value

  // Verificar token de Firebase si existe
  let decodedToken = null
  if (firebaseToken) {
    try {
      decodedToken = await auth().verifyIdToken(firebaseToken)
    } catch (error) {
      console.error('Error verificando token:', error)
      // Si el token es inválido, limpiar cookies
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('staffAccess')
      response.cookies.delete('firebase-token')
      return response
    }
  }

  // Verificar rutas de nivel 1 (requieren authToken)
  if (LEVEL_1_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Verificar rutas de nivel 2 (aceptan authToken o staffAccess con token válido)
  if (LEVEL_2_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken && (!staffAccess || !decodedToken)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Verificar rutas de acceso de personal
  if (STAFF_ACCESS_ROUTES.some(route => pathname.includes(route))) {
    if (!decodedToken && !authToken) {
      // Extraer la ruta base para redirigir al login correspondiente
      const baseRoute = pathname.split('/staff')[0]
      return NextResponse.redirect(new URL(`${baseRoute}/login`, request.url))
    }

    // Verificar que el token corresponda al hotel correcto
    if (decodedToken) {
      const hotelIdFromPath = pathname.split('/')[2] // Extraer hotelId de la URL
      if (decodedToken.hotelId !== hotelIdFromPath) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  // Si hay staffAccess, verificar que la sesión no haya expirado
  if (staffAccess && decodedToken) {
    const tokenExp = decodedToken.exp * 1000 // Convertir a milisegundos
    const now = Date.now()

    if (now >= tokenExp) {
      // Limpiar cookies de sesión expirada
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('staffAccess')
      response.cookies.delete('firebase-token')
      return response
    }
  }

  // Clonar y modificar los headers para pasar información del token
  if (decodedToken) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-role', decodedToken.role)
    requestHeaders.set('x-user-hotel', decodedToken.hotelId)
    requestHeaders.set('x-access-type', decodedToken.accessType)

    // Devolver la respuesta con los headers modificados
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
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