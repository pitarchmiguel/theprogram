'use client'

import { useState, useEffect } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabaseClient'
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
          setUser(null)
          setUserRole('athlete')
          setLoading(false)
          return
        }

        setUser(data.session.user)
        
        // Obtener rol
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single()
          
          const role = (profile?.role as 'master' | 'athlete') || 'athlete'
          setUserRole(role)
          
          // Guardar en localStorage para futuras cargas
          if (typeof window !== 'undefined') {
            localStorage.setItem('userRole', role)
          }
          
        } catch {
          // Si falla obtener el perfil, usar localStorage o fallback
          const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null) as 'master' | 'athlete' || 'athlete'
          setUserRole(storedRole)
          console.log('Profile fetch failed, using stored role:', storedRole)
        }
        
      } catch (sessionError) {
        console.log('Session initialization failed:', sessionError instanceof Error ? sessionError.message : 'Unknown error')
        if (mounted) {
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
          
          // Obtener rol de forma no-bloqueante
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
            
            const role = (profile?.role as 'master' | 'athlete') || 'athlete'
            setUserRole(role)
            if (typeof window !== 'undefined') {
              localStorage.setItem('userRole', role)
            }
          } catch {
            // Si falla, mantener rol actual o usar fallback
            const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null) as 'master' | 'athlete' || 'athlete'
            setUserRole(storedRole)
          }
        } else {
          setUser(null)
          setUserRole('athlete')
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
        // Obtener rol de forma rápida
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()
          
          const role = (profile?.role as 'master' | 'athlete') || 'athlete'
          setUserRole(role)
          if (typeof window !== 'undefined') {
            localStorage.setItem('userRole', role)
          }
          
          // Redirección basada en rol
          if (role === 'master') {
            router.push('/workouts')
          } else {
            router.push('/')
          }
        } catch {
          // Si falla obtener perfil, asumir athlete y continuar
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
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userRole')
      }
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Forzar logout local
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userRole')
      }
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

  return {
    user,
    userRole,
    loading,
    signIn,
    signOut,
    requireAuth,
  }
} 