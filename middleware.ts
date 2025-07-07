import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Permitir acceso a rutas públicas y archivos estáticos
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Permitir acceso a archivos estáticos
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico')) {
    return response
  }

  // Permitir acceso a la página principal (será manejada por useAuth)
  if (pathname === '/') {
    return response
  }

  try {
    // Verificar la sesión del usuario
    const { data: { session }, error } = await supabase.auth.getSession()

    // Si no hay sesión válida y la ruta no es pública, redirigir a login
    if ((!session || error) && !isPublicRoute) {
      console.log('🛡️ [Middleware] Sin sesión, redirigiendo a login:', pathname)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // ✅ CAMBIO CRÍTICO: Eliminadas verificaciones de rol admin
    // Dejar que useAuth + AdminLayout manejen la autorización de roles
    // Esto elimina los conflictos de redirección
    
    // Si el usuario tiene sesión pero accede a login, redirigir a página principal
    if (session && pathname === '/login') {
      console.log('🛡️ [Middleware] Usuario autenticado en /login, redirigiendo a home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('🛡️ [Middleware] Permitiendo acceso a:', pathname)

    return response
  } catch (error) {
    console.error('❌ [Middleware] Error:', error)
    // En caso de error, permitir acceso a rutas públicas pero redirigir otras a login
    if (!isPublicRoute && pathname !== '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 