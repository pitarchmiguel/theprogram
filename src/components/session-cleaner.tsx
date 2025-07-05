'use client'

import { useEffect, useRef } from 'react'
import { clearAllSessions } from '@/lib/supabaseClient'
import { validateAuthSession } from '@/lib/auth-guard'

export function SessionCleaner() {
  const hasRunRef = useRef(false)
  const lastCleanupRef = useRef<number>(0)
  const CLEANUP_COOLDOWN = 60000 // 1 minuto entre limpiezas

  useEffect(() => {
    // Prevenir múltiples ejecuciones
    if (hasRunRef.current) return
    hasRunRef.current = true

    const cleanupInvalidSessions = async () => {
      try {
        // Verificar si ya se hizo una limpieza reciente
        const now = Date.now()
        if (now - lastCleanupRef.current < CLEANUP_COOLDOWN) {
          console.log('🚫 Limpieza de sesión omitida - cooldown activo')
          return
        }

        // Check if there's any authentication data in localStorage
        const hasAuthData = typeof window !== 'undefined' && (
          localStorage.getItem('userRole') ||
          localStorage.getItem('supabase.auth.token') ||
          Object.keys(localStorage).some(key => key.startsWith('supabase') || key.startsWith('sb-'))
        )

        if (hasAuthData) {
          console.log('🔍 Verificando sesión existente...')
          
          // Timeout para la validación de sesión
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos

          try {
            // Validate the current session with timeout
            const authResult = await Promise.race([
              validateAuthSession(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Session validation timeout')), 10000)
              )
            ]) as any

            clearTimeout(timeoutId)
            
            if (!authResult.isAuthenticated) {
              console.log('🧹 Sesión inválida detectada - limpiando datos...')
              await clearAllSessions()
              lastCleanupRef.current = now
              
              // En lugar de recargar inmediatamente, esperar un poco
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  // Verificar si aún hay datos inválidos antes de recargar
                  const stillHasAuthData = localStorage.getItem('userRole') ||
                    localStorage.getItem('supabase.auth.token') ||
                    Object.keys(localStorage).some(key => key.startsWith('supabase') || key.startsWith('sb-'))
                  
                  if (stillHasAuthData) {
                    console.log('🔄 Recargando página para limpiar estado...')
                    window.location.reload()
                  }
                }
              }, 1000) // Esperar 1 segundo antes de recargar
            } else {
              console.log('✅ Sesión válida - no se requiere limpieza')
            }
          } catch (error: any) {
            clearTimeout(timeoutId)
            console.error('Error durante validación de sesión:', error)
            
            // Solo limpiar en caso de timeout o errores críticos
            if (error.message === 'Session validation timeout' || 
                error.message?.includes('network') ||
                error.code === 'NETWORK_ERROR') {
              console.log('🧹 Error de red - limpiando datos por seguridad...')
              await clearAllSessions()
              lastCleanupRef.current = now
              
              // No recargar en errores de red para evitar bucles infinitos
              console.log('⚠️ Error de red detectado - no se recargará la página')
            }
          }
        } else {
          console.log('✅ No hay datos de autenticación - no se requiere limpieza')
        }
      } catch (error) {
        console.error('Error durante cleanup de sesiones:', error)
        // Solo limpiar en caso de errores críticos, no recargar
        if (typeof window !== 'undefined') {
          const now = Date.now()
          if (now - lastCleanupRef.current >= CLEANUP_COOLDOWN) {
            console.log('🧹 Error crítico - limpiando datos por seguridad...')
            await clearAllSessions()
            lastCleanupRef.current = now
          }
        }
      }
    }

    // Ejecutar limpieza con un pequeño delay para evitar conflictos
    const timeoutId = setTimeout(cleanupInvalidSessions, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [])

  // Don't render anything, this is just for cleanup
  return null
} 