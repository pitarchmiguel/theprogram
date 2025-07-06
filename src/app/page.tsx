'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Sin usuario, redirigir al login
        router.push('/login')
      } else {
        // Usuario autenticado (master o athlete), redirigir a workouts
        router.push('/workouts')
      }
    }
  }, [loading, user, router])

  // Mostrar loading mientras se verifica
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}