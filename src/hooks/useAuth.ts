'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { clearAllSessions } from '@/lib/supabaseClient'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Cache del perfil para evitar múltiples llamadas a la base de datos
const profileCache = new Map<string, { role: 'master' | 'athlete', timestamp: number }>()
const PROFILE_CACHE_DURATION = 10 * 60 * 1000 // 10 minutos (aumentado)

// Control de promesas pendientes para evitar duplicados
const pendingProfileFetches = new Map<string, Promise<'master' | 'athlete'>>()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [userRole, setUserRole] = useState<'master' | 'athlete'>('athlete')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const mountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastAuthEventRef = useRef<{ event: AuthChangeEvent; userId?: string; timestamp: number } | null>(null)

  // Función para obtener el perfil del usuario (optimizada con control de duplicados)
  const fetchUserProfile = useCallback(async (userId: string): Promise<'master' | 'athlete'> => {
    console.log('🔍 [useAuth] Obteniendo perfil para:', userId)
    
    // Verificar cache primero
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      console.log('📋 [useAuth] Usando perfil desde cache:', cached.role)
      return cached.role
    }

    // Verificar si ya hay una promesa pendiente para este usuario
    const pendingFetch = pendingProfileFetches.get(userId)
    if (pendingFetch) {
      console.log('⏳ [useAuth] Esperando fetch pendiente...')
      return pendingFetch
    }

    // Crear nueva promesa y almacenarla
    const fetchPromise = (async (): Promise<'master' | 'athlete'> => {
      try {
        console.log('🌐 [useAuth] Realizando consulta a base de datos...')
        
        // Consulta con timeout más largo y AbortController
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()
          .abortSignal(controller.signal)

        clearTimeout(timeoutId)

        if (profileError) {
          console.error('❌ [useAuth] Error fetching profile:', profileError)
          throw profileError
        }

        const role = (profile?.role as 'master' | 'athlete') || 'athlete'
        console.log('✅ [useAuth] Perfil obtenido:', role)
        
        // Actualizar cache
        profileCache.set(userId, { role, timestamp: Date.now() })
        
        return role
      } catch (error) {
        console.error('❌ [useAuth] Error en fetchUserProfile:', error)
        
        // Para AbortError o timeouts, intentar obtener del cache expirado como fallback
        const expiredCache = profileCache.get(userId)
        if (expiredCache) {
          console.log('🔄 [useAuth] Usando cache expirado como fallback:', expiredCache.role)
          return expiredCache.role
        }
        
        // Fallback final: athlete
        console.warn('⚠️ [useAuth] Asignando rol athlete por defecto')
        return 'athlete'
      } finally {
        // Limpiar la promesa pendiente
        pendingProfileFetches.delete(userId)
      }
    })()

    // Almacenar la promesa pendiente
    pendingProfileFetches.set(userId, fetchPromise)
    
    return fetchPromise
  }, [])

  // Función para manejar cambios de auth con debounce
  const handleAuthChange = useCallback(async (event: AuthChangeEvent, session: Session | null) => {
    if (!mountedRef.current) return
    
    const now = Date.now()
    const lastEvent = lastAuthEventRef.current
    
    // Evitar eventos duplicados muy rápidos
    if (lastEvent && 
        lastEvent.event === event && 
        lastEvent.userId === session?.user?.id && 
        now - lastEvent.timestamp < 1000) {
      console.log('🚫 [useAuth] Evento duplicado ignorado:', event)
      return
    }
    
    // Actualizar referencia del último evento
    lastAuthEventRef.current = { event, userId: session?.user?.id, timestamp: now }
    
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
      
      // Limpiar cache y promesas pendientes
      profileCache.clear()
      pendingProfileFetches.clear()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userRole')
      }
    }
  }, [fetchUserProfile])

  // Función debounced para auth changes
  const debouncedAuthChange = useCallback((event: AuthChangeEvent, session: Session | null) => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Para eventos críticos, no hacer debounce
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      handleAuthChange(event, session)
      return
    }
    
    // Para otros eventos, hacer debounce de 300ms
    debounceTimerRef.current = setTimeout(() => {
      handleAuthChange(event, session)
    }, 300)
  }, [handleAuthChange])

  useEffect(() => {
    console.log('🔧 [useAuth] Montando hook...')
    mountedRef.current = true

    // Función de inicialización
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
          setRoleLoading(true)
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

    // Listener para cambios de autenticación con debounce
    console.log('👂 [useAuth] Configurando listener de auth state...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(debouncedAuthChange)

    return () => {
      console.log('🧹 [useAuth] Cleanup')
      mountedRef.current = false
      subscription.unsubscribe()
      
      // Limpiar timers y promesas pendientes
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      pendingProfileFetches.clear()
    }
  }, [fetchUserProfile, debouncedAuthChange])

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
      // Limpiar cache y promesas pendientes
      profileCache.clear()
      pendingProfileFetches.clear()
      
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
      pendingProfileFetches.clear()
      await clearAllSessions()
      setUser(null)
      setUserRole('athlete')
      setError(null)
      setRoleLoading(false)
      router.push('/login')
    }
  }

  const requireAuth = (requiredRole?: 'master') => {
    // Si está cargando el usuario, esperar
    if (loading) return false
    
    // Si no hay usuario, redirigir a login
    if (!user) {
      router.push('/login')
      return false
    }

    // Si está cargando el rol pero ya pasó mucho tiempo, permitir acceso con rol por defecto
    if (roleLoading) {
      console.warn('⚠️ [useAuth] Rol aún cargando, pero permitiendo acceso temporal')
      // Solo permitir acceso a rutas que no requieren master si el rol está cargando
      if (requiredRole === 'master') {
        console.log('🛡️ [useAuth] Acceso master denegado mientras carga rol')
        router.push('/')
        return false
      }
      // Para rutas que no requieren master, permitir acceso
      return true
    }

    // Verificación normal de rol
    if (requiredRole === 'master' && userRole !== 'master') {
      console.log('🛡️ [useAuth] Usuario no es master, redirigiendo')
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