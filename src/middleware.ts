import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { nextUrl } = request

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/login', '/test-connection']
  const isPublicRoute = publicRoutes.some(route => nextUrl.pathname === route)

  // Si es una ruta pública, permitir acceso
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Proteger solo las rutas de administración
  if (nextUrl.pathname.startsWith('/add')) {
    // Por ahora, permitir acceso a todas las rutas
    // La autenticación se manejará en el lado del cliente
    return NextResponse.next()
  }

  // Permitir acceso a todas las demás rutas
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