import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export type AuthGuardResult = {
  isAuthenticated: boolean
  user: User | null
  userRole: 'master' | 'athlete' | null
  error?: string
}

/**
 * Validates the current session and returns authentication status
 */
export async function validateAuthSession(): Promise<AuthGuardResult> {
  try {
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session validation error:', sessionError)
      return {
        isAuthenticated: false,
        user: null,
        userRole: null,
        error: 'Session validation failed'
      }
    }
    
    if (!session?.user) {
      return {
        isAuthenticated: false,
        user: null,
        userRole: null,
        error: 'No active session'
      }
    }
    
    // Get user profile and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return {
        isAuthenticated: false,
        user: null,
        userRole: null,
        error: 'Failed to fetch user profile'
      }
    }
    
    const userRole = (profile?.role as 'master' | 'athlete') || 'athlete'
    
    return {
      isAuthenticated: true,
      user: session.user,
      userRole,
    }
    
  } catch (error) {
    console.error('Authentication validation error:', error)
    return {
      isAuthenticated: false,
      user: null,
      userRole: null,
      error: 'Authentication validation failed'
    }
  }
}

/**
 * Validates if the current user has the required role
 */
export async function validateUserRole(requiredRole: 'master' | 'athlete'): Promise<AuthGuardResult> {
  const authResult = await validateAuthSession()
  
  if (!authResult.isAuthenticated) {
    return authResult
  }
  
  if (authResult.userRole !== requiredRole) {
    return {
      isAuthenticated: false,
      user: null,
      userRole: null,
      error: `Required role: ${requiredRole}, current role: ${authResult.userRole}`
    }
  }
  
  return authResult
}

/**
 * Validates if the current user is a master
 */
export async function validateMasterRole(): Promise<AuthGuardResult> {
  return validateUserRole('master')
}

/**
 * Hook-like function to validate auth and redirect if needed
 */
export async function requireAuth(requiredRole?: 'master'): Promise<AuthGuardResult> {
  const authResult = requiredRole 
    ? await validateUserRole(requiredRole)
    : await validateAuthSession()
  
  if (!authResult.isAuthenticated) {
    // Force logout and redirect to login
    await supabase.auth.signOut()
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
  
  return authResult
}

/**
 * Validates authentication for API routes
 */
export async function validateApiAuth(request: Request): Promise<AuthGuardResult> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      user: null,
      userRole: null,
      error: 'Missing or invalid authorization header'
    }
  }
  
  const token = authHeader.split(' ')[1]
  
  if (!token) {
    return {
      isAuthenticated: false,
      user: null,
      userRole: null,
      error: 'Missing token'
    }
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return {
        isAuthenticated: false,
        user: null,
        userRole: null,
        error: 'Invalid token or user not found'
      }
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      return {
        isAuthenticated: false,
        user: null,
        userRole: null,
        error: 'Failed to fetch user profile'
      }
    }
    
    const userRole = (profile?.role as 'master' | 'athlete') || 'athlete'
    
    return {
      isAuthenticated: true,
      user,
      userRole,
    }
    
  } catch (error) {
    console.error('API auth validation error:', error)
    return {
      isAuthenticated: false,
      user: null,
      userRole: null,
      error: 'API authentication failed'
    }
  }
} 