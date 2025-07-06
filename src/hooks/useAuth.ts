'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { clearAllSessions } from '@/lib/supabaseClient'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Cache del perfil para evitar múltiples llamadas a la base de datos
const profileCache = new Map<string, { role: 'master' | 'athlete', timestamp: number }>()
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Sistema de bloqueo global para prevenir múltiples inicializaciones
let globalAuthInitialization = false
let globalAuthPromise: Promise<void> | null = null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'master' | 'athlete'>('athlete')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const initializationRef = useRef(false)
  const retryCount = useRef(0)
  const maxRetries = 3

  // Función simplificada para obtener el perfil
  const fetchUserProfile = useCallback(async (userId: string): Promise<'master' | 'athlete'> => {
    console.log('🔍 [useAuth] Iniciando fetchUserProfile para:', userId)
    
    // Verificar cache
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      console.log('📋 [useAuth] Usando perfil desde cache:', cached.role)
      return cached.role
    }

    try {
      console.log('🌐 [useAuth] Consultando perfil en base de datos...')
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('❌ [useAuth] Error fetching profile:', profileError)
        console.log('🔧 [useAuth] Usando rol por defecto: athlete')
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
  }, [])

  // Función simplificada para manejar errores
  const handleAuthError = useCallback((error: unknown, context: string) => {
    console.error(`❌ [useAuth] Error en ${context}:`, error)
    
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : null
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Solo incrementar retry count para errores de red
    if (errorCode === 'NETWORK_ERROR' || errorMessage?.includes('network')) {
      retryCount.current++
      if (retryCount.current < maxRetries) {
        console.log(`🔄 [useAuth] Reintentando... (${retryCount.current}/${maxRetries})`)
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
      console.log('🚀 [useAuth] Iniciando initializeAuth...')
      
      // Prevenir múltiples inicializaciones locales
      if (initializationRef.current) {
        console.log('⚠️ [useAuth] Inicialización local ya en progreso, omitiendo...')
        return
      }
      
      // Verificar si ya hay una inicialización global en progreso
      if (globalAuthInitialization) {
        console.log('⚠️ [useAuth] Inicialización global ya en progreso, esperando...')
        if (globalAuthPromise) {
          try {
            await globalAuthPromise
            console.log('✅ [useAuth] Inicialización global completada, obteniendo estado...')
            
            // Obtener estado actual después de la inicialización global
            const { data } = await supabase.auth.getSession()
            if (mounted && data.session?.user) {
              setUser(data.session.user)
              try {
                const role = await fetchUserProfile(data.session.user.id)
                if (mounted) {
                  setUserRole(role)
                  setError(null)
                }
              } catch {
                if (mounted) {
                  setUserRole('athlete')
                  console.warn('⚠️ [useAuth] Usando rol por defecto en inicialización global')
                }
              }
            }
            if (mounted) {
              setLoading(false)
            }
          } catch (error) {
            console.error('❌ [useAuth] Error esperando inicialización global:', error)
            if (mounted) {
              setLoading(false)
            }
          }
        }
        return
      }

      // Marcar inicialización global como activa
      globalAuthInitialization = true
      initializationRef.current = true

      // Crear promesa global
      globalAuthPromise = (async () => {
        try {
          console.log('⏰ [useAuth] Configurando timeout de 15 segundos...')
          
          // Timeout para la inicialización completa
          timeoutId = setTimeout(() => {
            if (mounted) {
              console.error('⏰ [useAuth] TIMEOUT: La verificación tardó más de 15 segundos')
              setError('La verificación de usuario está tardando demasiado. Por favor, recarga la página.')
              setLoading(false)
            }
          }, 15000) // 15 segundos timeout

          // Pequeño delay para asegurar que Supabase esté completamente listo
          console.log('⏳ [useAuth] Esperando 100ms para que Supabase se inicialice...')
          await new Promise(resolve => setTimeout(resolve, 100))

          console.log('🔐 [useAuth] Obteniendo sesión de Supabase...')
          
          // Obtener sesión con retry si falla
          let sessionData
          let sessionError
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`🔄 [useAuth] Intento ${attempt}/3 de obtener sesión...`)
              const result = await supabase.auth.getSession()
              sessionData = result.data
              sessionError = result.error
              
              if (!sessionError) {
                console.log('✅ [useAuth] Sesión obtenida exitosamente')
                break
              } else {
                console.warn(`⚠️ [useAuth] Error en intento ${attempt}:`, sessionError)
                if (attempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 500 * attempt)) // delay incremental
                }
              }
            } catch (err) {
              console.error(`❌ [useAuth] Error en intento ${attempt}:`, err)
              sessionError = err
              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 500 * attempt))
              }
            }
          }
          
          if (!mounted) {
            console.log('🚫 [useAuth] Componente desmontado, abortando...')
            return
          }
          
          console.log('📊 [useAuth] Resultado de getSession:', {
            hasData: !!sessionData,
            hasSession: !!sessionData?.session,
            hasUser: !!sessionData?.session?.user,
            error: sessionError?.message
          })
          
          if (sessionError || !sessionData?.session?.user) {
            console.log('🧹 [useAuth] No hay sesión válida, limpiando estado...')
            
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

          console.log('👤 [useAuth] Usuario encontrado:', sessionData.session.user.email)
          setUser(sessionData.session.user)
          
          // Obtener rol del usuario
          console.log('📋 [useAuth] Obteniendo rol del usuario...')
          try {
            const role = await fetchUserProfile(sessionData.session.user.id)
            if (mounted) {
              console.log('✅ [useAuth] Rol establecido:', role)
              setUserRole(role)
              setError(null)
              retryCount.current = 0 // Resetear retry count en éxito
            }
          } catch (error) {
            console.error('❌ [useAuth] Error obteniendo rol:', error)
            if (mounted && handleAuthError(error, 'profile fetch')) {
              // Solo usar rol por defecto, no cerrar sesión
              setUserRole('athlete')
              console.warn('⚠️ [useAuth] Usando rol por defecto debido a error en perfil')
            }
          }
          
        } catch (sessionError) {
          console.error('❌ [useAuth] Error en inicialización de sesión:', sessionError)
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
            console.log('🏁 [useAuth] Finalizando inicialización, loading = false')
            setLoading(false)
            clearTimeout(timeoutId)
          }
          
          // Liberar bloqueo global
          globalAuthInitialization = false
          globalAuthPromise = null
        }
      })()

      await globalAuthPromise
    }

    console.log('🎬 [useAuth] useEffect ejecutándose...')
    
    // Delay inicial para evitar problemas de hidratación
    const initDelayTimeout = setTimeout(() => {
      if (mounted) {
        initializeAuth()
      }
    }, 50) // 50ms delay inicial

    // Suscripción a cambios de auth simplificada
    console.log('👂 [useAuth] Configurando listener de auth state...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        
        console.log('🔄 [useAuth] Auth state change:', event, !!session)
        
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
              console.warn('⚠️ [useAuth] Usando rol por defecto en auth state change')
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
        
        setLoading(false)
      }
    )

    return () => {
      console.log('🧹 [useAuth] Cleanup: desmontando useAuth')
      mounted = false
      clearTimeout(timeoutId)
      clearTimeout(initDelayTimeout)
      subscription.unsubscribe()
      initializationRef.current = false
      
      // Si este componente era el responsable de la inicialización global, limpiar
      if (globalAuthInitialization) {
        globalAuthInitialization = false
        globalAuthPromise = null
      }
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
          
          // Todos los usuarios van a workouts
          router.push('/workouts')
        } catch (error) {
          console.error('Failed to fetch profile after login:', error)
          // Continuar con rol por defecto en lugar de fallar
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
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