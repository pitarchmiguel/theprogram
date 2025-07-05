'use client'

import { useState, useEffect } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient, clearAllSessions } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'master' | 'athlete'>('athlete')
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Obtener sesión
        const { data, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error || !data.session?.user) {
          // Limpiar cualquier dato de sesión local
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
          setUser(null)
          setUserRole('athlete')
          setLoading(false)
          return
        }

        setUser(data.session.user)
        
        // Obtener rol SIEMPRE desde la base de datos - NO usar localStorage
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile:', profileError)
            // Si no se puede obtener el perfil, cerrar sesión por seguridad
            await supabase.auth.signOut()
            setUser(null)
            setUserRole('athlete')
            setLoading(false)
            return
          }
          
          const role = (profile?.role as 'master' | 'athlete') || 'athlete'
          setUserRole(role)
          
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
          // Por seguridad, cerrar sesión si no se puede verificar el rol
          await supabase.auth.signOut()
          setUser(null)
          setUserRole('athlete')
        }
        
      } catch (sessionError) {
        console.error('Session initialization failed:', sessionError)
        if (mounted) {
          // Limpiar datos locales en caso de error
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
          setUser(null)
          setUserRole('athlete')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          
          // Obtener rol SIEMPRE desde la base de datos
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('Error fetching profile on auth change:', profileError)
              // Si no se puede obtener el perfil, cerrar sesión
              await supabase.auth.signOut()
              return
            }
            
            const role = (profile?.role as 'master' | 'athlete') || 'athlete'
            setUserRole(role)
            
          } catch (error) {
            console.error('Failed to fetch profile on auth change:', error)
            // Por seguridad, cerrar sesión si no se puede verificar el rol
            await supabase.auth.signOut()
          }
        } else {
          setUser(null)
          setUserRole('athlete')
          // Limpiar datos locales cuando se cierre sesión
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole')
          }
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (error) return { data: null, error }

      if (data.user) {
        // Obtener rol de forma segura desde la base de datos
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile after login:', profileError)
            return { data: null, error: new Error('No se pudo verificar el perfil del usuario') }
          }
          
          const role = (profile?.role as 'master' | 'athlete') || 'athlete'
          setUserRole(role)
          
          // Redirección basada en rol
          if (role === 'master') {
            router.push('/workouts')
          } else {
            router.push('/')
          }
        } catch (error) {
          console.error('Failed to fetch profile after login:', error)
          return { data: null, error: new Error('Error al verificar el perfil del usuario') }
        }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      // Limpiar sesiones locales ANTES de cerrar sesión
      await clearAllSessions()
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
      
      // Asegurarse de que los estados locales se limpien
      setUser(null)
      setUserRole('athlete')
      
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Forzar logout local incluso si falla el logout remoto
      await clearAllSessions()
      setUser(null)
      setUserRole('athlete')
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

  // Función para verificar la sesión actual de forma segura
  const validateSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        await signOut()
        return false
      }
      
      // Verificar que el perfil aún existe y es válido
      const { error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (profileError) {
        await signOut()
        return false
      }
      
      return true
    } catch (error) {
      console.error('Session validation failed:', error)
      await signOut()
      return false
    }
  }

  return {
    user,
    userRole,
    loading,
    signIn,
    signOut,
    requireAuth,
    validateSession,
  }
} 