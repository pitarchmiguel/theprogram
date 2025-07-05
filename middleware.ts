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

  // Permitir acceso a rutas públicas
  const publicRoutes = ['/login', '/api/auth', '/']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Permitir acceso a archivos estáticos
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico')) {
    return response
  }

  try {
    // Verificar la sesión del usuario
    const { data: { session }, error } = await supabase.auth.getSession()

    // Si no hay sesión válida y la ruta no es pública, redirigir a login
    if ((!session || error) && !isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Si hay sesión, verificar permisos para rutas administrativas
    if (session && pathname.startsWith('/admin')) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile || profile.role !== 'master') {
          // Redirigir a página principal si no es master
          return NextResponse.redirect(new URL('/workouts', request.url))
        }
      } catch (error) {
        console.error('Error verifying admin access:', error)
        // En caso de error, redirigir por seguridad
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    // Si el usuario tiene sesión pero accede a login, redirigir a dashboard
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/workouts', request.url))
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // En caso de error, permitir acceso a rutas públicas pero redirigir otras a login
    if (!isPublicRoute) {
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