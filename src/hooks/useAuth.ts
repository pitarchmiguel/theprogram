'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'master' | 'athlete' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  console.log('🔧 useAuth hook initialized')

  // Función para obtener el rol desde la tabla profiles
  const getRoleFromProfile = useCallback(async (userId: string): Promise<'master' | 'athlete' | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('❌ Error fetching profile:', error)
        return null
      }
      
      console.log('📋 Profile role from database:', profile?.role)
      return profile?.role as 'master' | 'athlete' || null
    } catch (error) {
      console.error('❌ Exception fetching profile:', error)
      return null
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    console.log('🚀 useAuth useEffect started')

    // Función para obtener el rol desde localStorage como fallback
    const getRoleFromStorage = (): 'master' | 'athlete' => {
      if (typeof window !== 'undefined') {
        const storedRole = localStorage.getItem('userRole')
        return (storedRole as 'master' | 'athlete') || 'athlete'
      }
      return 'athlete'
    }

    // Función para guardar el rol en localStorage
    const saveRoleToStorage = (role: 'master' | 'athlete') => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('userRole', role)
      }
    }

    // Función simple para obtener la sesión
    const getSession = async () => {
      try {
        console.log('🔄 Getting session...')

        // Llama directamente a supabase.auth.getSession()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Session error:', error)
          // Usar fallback
          const fallbackRole = getRoleFromStorage()
          if (mounted) {
            setUserRole(fallbackRole)
            setLoading(false)
          }
          return
        }

        console.log('📋 Session data:', data.session ? 'exists' : 'none')

        if (!mounted) return

        if (data.session?.user) {
          console.log('👤 User found:', data.session.user.email)
          setUser(data.session.user)

          // Intentar obtener el rol desde la tabla profiles primero
          const profileRole = await getRoleFromProfile(data.session.user.id)
          console.log('🎭 Profile role:', profileRole)

          // Si no hay rol en profile, usar user_metadata como fallback
          const role = profileRole || data.session.user.user_metadata?.role || getRoleFromStorage()
          console.log('🎭 Final role:', role)
          setUserRole(role)
          saveRoleToStorage(role)
        } else {
          console.log('❌ No user in session')
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('❌ Exception in getSession:', error)
        // Usar fallback en caso de error
        const fallbackRole = getRoleFromStorage()
        if (mounted) {
          setUserRole(fallbackRole)
          setLoading(false)
        }
      } finally {
        if (mounted) {
          console.log('✅ Setting loading to false')
          setLoading(false)
        }
      }
    }

    // Ejecutar inmediatamente
    getSession()

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth change:', event, session ? 'with user' : 'no user')
        
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          
          // Intentar obtener el rol desde la tabla profiles primero
          const profileRole = await getRoleFromProfile(session.user.id)
          console.log('🎭 Profile role from auth change:', profileRole)
          
          // Si no hay rol en profile, usar user_metadata como fallback
          const role = profileRole || session.user.user_metadata?.role || getRoleFromStorage()
          console.log('🎭 Final role from auth change:', role)
          setUserRole(role)
          saveRoleToStorage(role)
        } else {
          setUser(null)
          setUserRole(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      console.log('🧹 useAuth cleanup')
      mounted = false
      subscription.unsubscribe()
    }
  }, [getRoleFromProfile, supabase.auth])

  console.log('🔧 useAuth current state:', { user: user?.email, userRole, loading })

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Intentar obtener el rol desde la tabla profiles primero
        const profileRole = await getRoleFromProfile(data.user.id)
        console.log('🎭 Profile role from signIn:', profileRole)
        
        // Si no hay rol en profile, usar user_metadata como fallback
        const role = profileRole || data.user.user_metadata?.role || 'athlete'
        console.log('🎭 Final role from signIn:', role)
        setUserRole(role)
        
        // Guardar en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('userRole', role)
        }
        
        if (role === 'master') {
          router.push('/workouts')
        } else {
          router.push('/')
        }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      console.log('🔴 signOut: start');
      const { error } = await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userRole');
      }
      if (error) throw error;
      console.log('🔴 signOut: before redirect');
      router.push('/login');
      console.log('🔴 signOut: after redirect');
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userRole');
      }
      router.push('/login');
      console.error('Error signing out:', error);
    }
  }

  const requireAuth = (requiredRole?: 'master') => {
    console.log('🔒 requireAuth called:', { loading, user: !!user, userRole, requiredRole })
    
    if (loading) {
      console.log('⏳ Still loading, returning false')
      return false
    }
    
    if (!user) {
      console.log('❌ No user, redirecting to login')
      router.push('/login')
      return false
    }

    if (requiredRole === 'master' && userRole !== 'master') {
      console.log('❌ User is not master, redirecting to home')
      router.push('/')
      return false
    }

    console.log('✅ Auth check passed')
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