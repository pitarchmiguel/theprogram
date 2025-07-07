'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { clearAllSessions } from '@/lib/supabaseClient'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Cache del perfil para evitar múltiples llamadas a la base de datos
const profileCache = new Map<string, { role: 'master' | 'athlete', timestamp: number }>()
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'master' | 'athlete'>('athlete')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const mountedRef = useRef(true)
  const maxRetries = 3

  // Función para obtener el perfil del usuario (simplificada)
  const fetchUserProfile = useCallback(async (userId: string, retryCount = 0): Promise<'master' | 'athlete'> => {
    console.log('🔍 [useAuth] Obteniendo perfil para:', userId, retryCount > 0 ? `(retry ${retryCount})` : '')
    
    // Verificar cache
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      console.log('📋 [useAuth] Usando perfil desde cache:', cached.role)
      return cached.role
    }

    try {
      // Timeout específico para consulta de perfil
      const profilePromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 10000) // 10s para perfil
      })

      const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise])

      if (profileError) {
        console.error('❌ [useAuth] Error fetching profile:', profileError)
        
        // Retry logic para errores de red
        if (retryCount < 2 && (
          profileError.message?.includes('network') || 
          profileError.message?.includes('timeout') ||
          profileError.message?.includes('PROFILE_TIMEOUT')
        )) {
          console.log(`🔁 [useAuth] Reintentando perfil en ${1000 * (retryCount + 1)}ms...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return fetchUserProfile(userId, retryCount + 1)
        }
        
        return 'athlete'
      }

      const role = (profile?.role as 'master' | 'athlete') || 'athlete'
      console.log('✅ [useAuth] Perfil obtenido:', role)
      
      // Actualizar cache
      profileCache.set(userId, { role, timestamp: Date.now() })
      
      return role
    } catch (error) {
      console.error('❌ [useAuth] Error en fetchUserProfile:', error)
      
      // Retry logic para errores de conexión
      if (retryCount < 2) {
        console.log(`🔁 [useAuth] Reintentando perfil en ${1000 * (retryCount + 1)}ms...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return fetchUserProfile(userId, retryCount + 1)
      }
      
      return 'athlete'
    }
  }, [])

  // Función simplificada de inicialización
  const performInitialization = useCallback(async (attempt = 1): Promise<void> => {
    console.log(`🚀 [useAuth] Intento de inicialización ${attempt}/${maxRetries}`)
    
    try {
      // Paso 1: Obtener sesión (timeout más largo para producción)
      console.log('🔐 [useAuth] Obteniendo sesión...')
      
      const sessionPromise = supabase.auth.getSession()
      const sessionTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 20000) // 20s para sesión
      })

      const { data: sessionData, error: sessionError } = await Promise.race([
        sessionPromise, 
        sessionTimeoutPromise
      ])
      
      if (sessionError) {
        console.error('❌ [useAuth] Error obteniendo sesión:', sessionError)
        throw sessionError
      }

      if (!mountedRef.current) return

      if (sessionData?.session?.user) {
        console.log('👤 [useAuth] Usuario encontrado:', sessionData.session.user.email)
        setUser(sessionData.session.user)
        
        // Paso 2: Obtener rol del usuario (asíncrono, no bloquea)
        console.log('📝 [useAuth] Obteniendo rol de usuario...')
        fetchUserProfile(sessionData.session.user.id)
          .then(role => {
            if (mountedRef.current) {
              console.log('🎭 [useAuth] Rol establecido:', role)
              setUserRole(role)
            }
          })
          .catch(error => {
            console.error('❌ [useAuth] Error obteniendo rol (no crítico):', error)
            if (mountedRef.current) {
              setUserRole('athlete')
            }
          })
      } else {
        console.log('🚫 [useAuth] No hay sesión activa')
        setUser(null)
        setUserRole('athlete')
      }
      
      // Marcar como cargado independientemente del perfil
      setError(null)
      setLoading(false)
      console.log(`✅ [useAuth] Inicialización exitosa en intento ${attempt}`)
      
    } catch (error) {
      console.error(`❌ [useAuth] Error en intento ${attempt}:`, error)
      
      if (!mountedRef.current) return
      
      if (attempt < maxRetries) {
        // Esperar antes del siguiente intento (backoff exponencial)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ [useAuth] Esperando ${delay}ms antes del siguiente intento...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
        if (mountedRef.current) {
          return performInitialization(attempt + 1)
        }
      } else {
        // Todos los intentos fallaron
        console.error('💀 [useAuth] Todos los intentos de inicialización fallaron')
        
        setUser(null)
        setUserRole('athlete')
        setError('Error de conexión. Por favor, recarga la página.')
        setLoading(false)
      }
    }
  }, [fetchUserProfile, maxRetries])

  useEffect(() => {
    console.log('🔧 [useAuth] Montando hook...')
    mountedRef.current = true

    // Inicializar auth de forma simple
    performInitialization()

    // Listener para cambios de autenticación
    console.log('👂 [useAuth] Configurando listener de auth state...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return
        
        console.log('🔄 [useAuth] Auth state change:', event, !!session)
        
        if (session?.user) {
          setUser(session.user)
          setError(null)
          setLoading(false)
          
          // Obtener rol del usuario (asíncrono)
          fetchUserProfile(session.user.id)
            .then(role => {
              if (mountedRef.current) {
                setUserRole(role)
              }
            })
            .catch(error => {
              console.error('❌ [useAuth] Error obteniendo rol en auth change:', error)
              if (mountedRef.current) {
                setUserRole('athlete')
              }
            })
        } else {
          console.log('🚪 [useAuth] Usuario desconectado')
          setUser(null)
          setUserRole('athlete')
          setError(null)
          setLoading(false)
          
          // Limpiar cache cuando se cierre sesión
          profileCache.clear()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
        }
      }
    )

    return () => {
      console.log('🧹 [useAuth] Cleanup')
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [performInitialization, fetchUserProfile])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (error) return { data: null, error }

      if (data.user) {
        // Obtener rol del usuario
        try {
          const role = await fetchUserProfile(data.user.id)
          setUserRole(role)
          router.push('/workouts')
        } catch (error) {
          console.error('Failed to fetch profile after login:', error)
          setUserRole('athlete')
          router.push('/workouts')
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
      
      // Limpiar sesiones locales
      await clearAllSessions()
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
      
      // Limpiar estados locales
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

  const validateSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        return false
      }
      
      return true
    } catch (error) {
      console.error('Session validation failed:', error)
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