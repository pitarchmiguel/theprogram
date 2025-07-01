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
        flowType: 'pkce'
      }
    }
  )

  return client
} 