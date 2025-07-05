'use client'

import { useEffect } from 'react'
import { clearAllSessions } from '@/lib/supabaseClient'
import { validateAuthSession } from '@/lib/auth-guard'

export function SessionCleaner() {
  useEffect(() => {
    const cleanupInvalidSessions = async () => {
      try {
        // Check if there's any authentication data in localStorage
        const hasAuthData = typeof window !== 'undefined' && (
          localStorage.getItem('userRole') ||
          localStorage.getItem('supabase.auth.token') ||
          Object.keys(localStorage).some(key => key.startsWith('supabase') || key.startsWith('sb-'))
        )

        if (hasAuthData) {
          // Validate the current session
          const authResult = await validateAuthSession()
          
          if (!authResult.isAuthenticated) {
            // If session is invalid but we have auth data, clean it up
            console.log('🧹 Cleaning up invalid session data...')
            await clearAllSessions()
            
            // Force a page reload to ensure clean state
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }
        }
      } catch (error) {
        console.error('Error during session cleanup:', error)
        // If there's an error, clean up anyway for security
        await clearAllSessions()
      }
    }

    cleanupInvalidSessions()
  }, [])

  // Don't render anything, this is just for cleanup
  return null
} 