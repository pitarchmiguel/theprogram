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
  const [roleLoading, setRoleLoading] = useState(false)
  const [userRole, setUserRole] = useState<'master' | 'athlete'>('athlete')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const mountedRef = useRef(true)

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

  useEffect(() => {
    console.log('🔧 [useAuth] Montando hook...')
    mountedRef.current = true

    // Función de inicialización inline para evitar dependencias
    const initializeAuth = async () => {
      try {
        console.log('🚀 [useAuth] Iniciando autenticación...')
        setLoading(true)
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !sessionData?.session?.user) {
          console.log('🚫 [useAuth] No hay sesión activa')
          if (mountedRef.current) {
            setUser(null)
            setUserRole('athlete')
            setError(null)
            setLoading(false)
            setRoleLoading(false)
          }
          return
        }

        const user = sessionData.session.user
        console.log('👤 [useAuth] Usuario encontrado:', user.email)
        
        if (mountedRef.current) {
          setUser(user)
          setError(null)
          setLoading(false)
          setRoleLoading(true) // Comenzar carga del rol
        }

        // Obtener rol en background
        try {
          const role = await fetchUserProfile(user.id)
          if (mountedRef.current) {
            setUserRole(role)
            setRoleLoading(false)
            console.log('✅ [useAuth] Rol cargado completamente:', role)
          }
        } catch (error) {
          console.error('❌ [useAuth] Error obteniendo rol:', error)
          if (mountedRef.current) {
            setUserRole('athlete')
            setRoleLoading(false)
          }
        }
      } catch (error) {
        console.error('❌ [useAuth] Error en inicialización:', error)
        if (mountedRef.current) {
          setUser(null)
          setUserRole('athlete')
          setError('Error de conexión')
          setLoading(false)
          setRoleLoading(false)
        }
      }
    }

    // Inicializar
    initializeAuth()

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
          setRoleLoading(true)
          
          // Obtener rol del usuario (asíncrono)
          try {
            const role = await fetchUserProfile(session.user.id)
            if (mountedRef.current) {
              setUserRole(role)
              setRoleLoading(false)
              console.log('✅ [useAuth] Rol cargado en auth change:', role)
            }
          } catch (error) {
            console.error('❌ [useAuth] Error obteniendo rol en auth change:', error)
            if (mountedRef.current) {
              setUserRole('athlete')
              setRoleLoading(false)
            }
          }
        } else {
          console.log('🚪 [useAuth] Usuario desconectado')
          setUser(null)
          setUserRole('athlete')
          setError(null)
          setLoading(false)
          setRoleLoading(false)
          
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
  }, [fetchUserProfile]) // Incluir fetchUserProfile como dependencia

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
          setRoleLoading(true)
          const role = await fetchUserProfile(data.user.id)
          setUserRole(role)
          setRoleLoading(false)
          
          // Todos los usuarios van a /workouts después del login
          console.log('🔄 [useAuth] Usuario autenticado, redirigiendo a workouts')
          router.push('/workouts')
        } catch (error) {
          console.error('Failed to fetch profile after login:', error)
          setUserRole('athlete')
          setRoleLoading(false)
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
      setRoleLoading(false)
      
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Forzar logout local incluso si falla el logout remoto
      profileCache.clear()
      await clearAllSessions()
      setUser(null)
      setUserRole('athlete')
      setError(null)
      setRoleLoading(false)
      router.push('/login')
    }
  }

  const requireAuth = (requiredRole?: 'master') => {
    if (loading || roleLoading) return false
    
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
    roleLoading,
    error,
    signIn,
    signOut,
    requireAuth,
    validateSession,
  }
} 