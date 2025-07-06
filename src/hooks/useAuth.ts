'use client'

import { useState, useEffect, useRef } from 'react'
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
  const initializationRef = useRef(false)

  // Función para obtener el perfil del usuario
  const fetchUserProfile = async (userId: string): Promise<'master' | 'athlete'> => {
    console.log('🔍 [useAuth] Obteniendo perfil para:', userId)
    
    // Verificar cache
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      console.log('📋 [useAuth] Usando perfil desde cache:', cached.role)
      return cached.role
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('❌ [useAuth] Error fetching profile:', profileError)
        return 'athlete'
      }

      const role = (profile?.role as 'master' | 'athlete') || 'athlete'
      console.log('✅ [useAuth] Perfil obtenido:', role)
      
      // Actualizar cache
      profileCache.set(userId, { role, timestamp: Date.now() })
      
      return role
    } catch (error) {
      console.error('❌ [useAuth] Error en fetchUserProfile:', error)
      return 'athlete'
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      // Prevenir múltiples inicializaciones
      if (initializationRef.current) {
        console.log('⚠️ [useAuth] Inicialización ya en progreso, omitiendo...')
        return
      }
      
      initializationRef.current = true
      console.log('🚀 [useAuth] Iniciando autenticación...')

      try {
        // Timeout de seguridad
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.error('⏰ [useAuth] TIMEOUT: La verificación tardó más de 10 segundos')
            setError('La verificación está tardando demasiado. Intenta recargar la página.')
            setLoading(false)
          }
        }, 10000) // Reducido a 10 segundos

        // Obtener sesión actual
        console.log('🔐 [useAuth] Obteniendo sesión...')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (sessionError) {
          console.error('❌ [useAuth] Error obteniendo sesión:', sessionError)
          setUser(null)
          setUserRole('athlete')
          setError(null)
          setLoading(false)
          clearTimeout(timeoutId)
          return
        }

        if (sessionData?.session?.user) {
          console.log('👤 [useAuth] Usuario encontrado:', sessionData.session.user.email)
          setUser(sessionData.session.user)
          
          // Obtener rol del usuario
          try {
            const role = await fetchUserProfile(sessionData.session.user.id)
            if (mounted) {
              setUserRole(role)
              setError(null)
            }
          } catch (error) {
            console.error('❌ [useAuth] Error obteniendo rol:', error)
            if (mounted) {
              setUserRole('athlete')
            }
          }
        } else {
          console.log('🚫 [useAuth] No hay sesión activa')
          setUser(null)
          setUserRole('athlete')
          setError(null)
        }
        
        if (mounted) {
          setLoading(false)
          clearTimeout(timeoutId)
        }
      } catch (error) {
        console.error('❌ [useAuth] Error en inicialización:', error)
        if (mounted) {
          setUser(null)
          setUserRole('athlete')
          setError(null)
          setLoading(false)
          clearTimeout(timeoutId)
        }
      }
    }

    // Inicializar auth
    initializeAuth()

    // Listener para cambios de autenticación
    console.log('👂 [useAuth] Configurando listener de auth state...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        
        console.log('🔄 [useAuth] Auth state change:', event, !!session)
        
        if (session?.user) {
          setUser(session.user)
          setError(null)
          
          // Obtener rol del usuario
          try {
            const role = await fetchUserProfile(session.user.id)
            if (mounted) {
              setUserRole(role)
            }
          } catch (error) {
            console.error('❌ [useAuth] Error obteniendo rol en auth change:', error)
            if (mounted) {
              setUserRole('athlete')
            }
          }
        } else {
          console.log('🚪 [useAuth] Usuario desconectado')
          setUser(null)
          setUserRole('athlete')
          setError(null)
          // Limpiar cache cuando se cierre sesión
          profileCache.clear()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('🧹 [useAuth] Cleanup')
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      initializationRef.current = false
    }
  }, []) // Sin dependencias para evitar bucles infinitos

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