'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { user, userRole, loading, error } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Solo redirigir cuando no esté cargando, no haya error, y no hayamos redirigido ya
    if (!loading && !error && !hasRedirected) {
      setHasRedirected(true)
      
      if (!user) {
        // Sin usuario, redirigir al login
        console.log('🏠 [Home] Sin usuario, redirigiendo a login...')
        router.push('/login')
      } else {
        // Usuario autenticado - redirigir según rol
        if (userRole === 'master') {
          console.log('🏠 [Home] Usuario master, redirigiendo a admin...')
          router.push('/admin')
        } else {
          console.log('🏠 [Home] Usuario athlete, redirigiendo a workouts...')
          router.push('/workouts')
        }
      }
    }
  }, [loading, user, userRole, error, router, hasRedirected])

  // Función para recargar la página cuando hay error
  const handleRetry = () => {
    console.log('🔄 [Home] Recargando página...')
    window.location.reload()
  }

  // Mostrar error si la conexión falla
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900">
            Error de Conexión
          </h1>
          <p className="text-gray-600">
            {error}
          </p>
          <Button 
            onClick={handleRetry}
            className="mt-4"
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // Mostrar loading mientras se verifica usuario y rol
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-gray-600 mt-4">
          {user ? 'Verificando permisos...' : 'Verificando usuario...'}
        </p>
        {user && (
          <p className="text-sm text-gray-500">
            Usuario: {user.email}
          </p>
        )}
      </div>
    </div>
  )
}