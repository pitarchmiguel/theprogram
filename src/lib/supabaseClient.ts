import { createBrowserClient } from '@supabase/ssr'

// Crear una instancia única del cliente para evitar recreaciones
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Reutilizar el cliente existente si ya existe
  if (client) {
    return client
  }

  // Crear nuevo cliente solo si no existe
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'supabase.auth.token',
        storage: {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              return localStorage.getItem(key)
            }
            return null
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, value)
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(key)
            }
          }
        }
      },
      global: {
        headers: {
          'x-client-timeout': '8000' // Timeout de 8 segundos
        },
        fetch: (url, options = {}) => {
          // Configurar timeout personalizado para todas las requests
          const controller = new AbortController()
          const timeout = setTimeout(() => {
            console.warn('⏰ [Supabase] Request timeout, abortando...')
            controller.abort()
          }, 8000) // 8 segundos

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => {
            clearTimeout(timeout)
          })
        }
      }
    }
  )

  // Añadir listener para errores de conexión
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('🌐 [Supabase] Conexión restaurada')
    })
    
    window.addEventListener('offline', () => {
      console.warn('📶 [Supabase] Conexión perdida')
    })
  }

  return client
}

// Función para limpiar completamente la sesión
export async function clearAllSessions() {
  if (typeof window !== 'undefined') {
    // Limpiar localStorage
    const keysToRemove = [
      'supabase.auth.token',
      'userRole',
      'supabase-auth-token',
      'sb-project-auth-token'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Limpiar todo el localStorage relacionado con Supabase
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase') || key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    })
    
    // Limpiar sessionStorage
    sessionStorage.clear()
    
    // Limpiar cookies relacionadas con autenticación
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
      if (name.trim().startsWith('supabase') || name.trim().startsWith('sb-')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      }
    })
  }
}

// Función para forzar logout completo
export async function forceLogout() {
  try {
    // Usar el cliente singleton en lugar de crear uno nuevo
    const supabaseClient = createClient()
    await supabaseClient.auth.signOut()
  } catch (error) {
    console.error('Error during signOut:', error)
  } finally {
    // Limpiar sesiones locales independientemente del resultado
    await clearAllSessions()
    
    // Recargar la página para asegurar que no quede estado residual
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}

// Función para verificar conectividad
export async function checkConnectivity(): Promise<boolean> {
  try {
    const client = createClient()
    const { error } = await client.from('profiles').select('id').limit(1)
    return !error
  } catch (error) {
    console.error('❌ [Connectivity] Error de conectividad:', error)
    return false
  }
} 