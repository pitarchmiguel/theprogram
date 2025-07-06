'use client'

import { useEffect, useRef } from 'react'

export function SessionCleaner() {
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Temporalmente deshabilitado para evitar conflictos
    // El useAuth optimizado ya maneja la limpieza de sesiones correctamente
    console.log('🔧 SessionCleaner temporalmente deshabilitado - usando useAuth optimizado')
    
    // Prevenir múltiples ejecuciones
    if (hasRunRef.current) return
    hasRunRef.current = true
  }, [])

  // Don't render anything, this is just for cleanup
  return null
} 