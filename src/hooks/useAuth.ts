'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient, clearAllSessions } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

const supabase = createClient()

// Cache del perfil para evitar múltiples llamadas a la base de datos
const profileCache = new Map<string, { role: 'master' | 'athlete', timestamp: number }>()
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'master' | 'athlete'>('athlete')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const initializationRef = useRef(false)
  const retryCount = useRef(0)
  const maxRetries = 3

  // Función para obtener el perfil con cache y timeout
  const fetchUserProfile = useCallback(async (userId: string): Promise<'master' | 'athlete'> => {
    // Verificar cache
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      return cached.role
    }

    // Timeout para la consulta
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        // En caso de error, usar el rol por defecto pero no cerrar sesión
        return 'athlete'
      }

      const role = (profile?.role as 'master' | 'athlete') || 'athlete'
      
      // Actualizar cache
      profileCache.set(userId, { role, timestamp: Date.now() })
      
      return role
         } catch (error: any) {
       clearTimeout(timeoutId)
       if (error.name === 'AbortError') {
         console.error('Profile fetch timed out')
       } else {
         console.error('Failed to fetch user profile:', error)
       }
       // En caso de error, usar el rol por defecto
       return 'athlete'
     }
  }, [])

  // Función para manejar errores con retry logic
  const handleAuthError = useCallback((error: any, context: string) => {
    console.error(`Auth error in ${context}:`, error)
    
    // Solo incrementar retry count para errores de red
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      retryCount.current++
      if (retryCount.current < maxRetries) {
        setError(`Problemas de conexión. Reintentando... (${retryCount.current}/${maxRetries})`)
        return false // No cerrar sesión, reintentar
      }
    }
    
    // Resetear retry count en otros errores
    retryCount.current = 0
    setError(null)
    return true // Proceder con el manejo normal del error
  }, [])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      // Prevenir múltiples inicializaciones
      if (initializationRef.current) return
      initializationRef.current = true

      try {
        // Timeout para la inicialización completa
        timeoutId = setTimeout(() => {
          if (mounted) {
            setError('La verificación de usuario está tardando demasiado. Por favor, recarga la página.')
            setLoading(false)
          }
        }, 15000) // 15 segundos timeout

        // Obtener sesión
        const { data, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error || !data.session?.user) {
          // Limpiar datos locales sin mostrar error
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
          setUser(null)
          setUserRole('athlete')
          setError(null)
          setLoading(false)
          clearTimeout(timeoutId)
          return
        }

        setUser(data.session.user)
        
        // Obtener rol con cache y timeout
        try {
          const role = await fetchUserProfile(data.session.user.id)
          if (mounted) {
            setUserRole(role)
            setError(null)
            retryCount.current = 0 // Resetear retry count en éxito
          }
        } catch (error) {
          if (mounted && handleAuthError(error, 'profile fetch')) {
            // Solo usar rol por defecto, no cerrar sesión
            setUserRole('athlete')
            console.warn('Using default role due to profile fetch error')
          }
        }
        
      } catch (sessionError) {
        if (mounted && handleAuthError(sessionError, 'session initialization')) {
          // Limpiar datos locales en caso de error crítico
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
          setUser(null)
          setUserRole('athlete')
        }
      } finally {
        if (mounted) {
          setLoading(false)
          clearTimeout(timeoutId)
        }
      }
    }

    initializeAuth()

    // Suscripción a cambios de auth con debounce
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          setError(null)
          
          // Obtener rol con cache
          try {
            const role = await fetchUserProfile(session.user.id)
            if (mounted) {
              setUserRole(role)
              retryCount.current = 0
            }
          } catch (error) {
            if (mounted && handleAuthError(error, 'auth state change')) {
              // Solo usar rol por defecto, no cerrar sesión
              setUserRole('athlete')
              console.warn('Using default role due to auth state change error')
            }
          }
        } else {
          setUser(null)
          setUserRole('athlete')
          setError(null)
          // Limpiar cache cuando se cierre sesión
          profileCache.clear()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      initializationRef.current = false
    }
  }, [fetchUserProfile, handleAuthError])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (error) return { data: null, error }

      if (data.user) {
        // Obtener rol con timeout
        try {
          const role = await fetchUserProfile(data.user.id)
          setUserRole(role)
          
          // Redirección basada en rol
          if (role === 'master') {
            router.push('/workouts')
          } else {
            router.push('/')
          }
        } catch (error) {
          console.error('Failed to fetch profile after login:', error)
          // Continuar con rol por defecto en lugar de fallar
          setUserRole('athlete')
          router.push('/')
        }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      // Limpiar cache
      profileCache.clear()
      
      // Limpiar sesiones locales ANTES de cerrar sesión
      await clearAllSessions()
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
      
      // Asegurarse de que los estados locales se limpien
      setUser(null)
      setUserRole('athlete')
      setError(null)
      
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Forzar logout local incluso si falla el logout remoto
      profileCache.clear()
      await clearAllSessions()
      setUser(null)
      setUserRole('athlete')
      setError(null)
      router.push('/login')
    }
  }

  const requireAuth = (requiredRole?: 'master') => {
    if (loading) return false
    
    if (!user) {
      router.push('/login')
      return false
    }

    if (requiredRole === 'master' && userRole !== 'master') {
      router.push('/')
      return false
    }

    return true
  }

  // Función para verificar la sesión actual de forma segura con timeout
  const validateSession = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const { data: { session }, error } = await supabase.auth.getSession()
      clearTimeout(timeoutId)
      
      if (error || !session) {
        return false
      }
      
      return true
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Session validation timed out')
      } else {
        console.error('Session validation failed:', error)
      }
      return false
    }
  }

  return {
    user,
    userRole,
    loading,
    error,
    signIn,
    signOut,
    requireAuth,
    validateSession,
  }
} 