import { auth } from "@/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/login', '/test-connection']
  const isPublicRoute = publicRoutes.some(route => nextUrl.pathname === route)

  // Si es una ruta pública, permitir acceso
  if (isPublicRoute) {
    // Si está logueado y va a login, redirigir a /add
    if (isLoggedIn && nextUrl.pathname === '/login') {
      return Response.redirect(new URL('/add', nextUrl))
    }
    return null
  }

  // Proteger solo las rutas de administración
  if (nextUrl.pathname.startsWith('/add')) {
    if (!isLoggedIn) {
      // Guardar la URL original para redirigir después del login
      const loginUrl = new URL('/login', nextUrl)
      loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
      return Response.redirect(loginUrl)
    }
  }

  // Permitir acceso a todas las demás rutas
  return null
})

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