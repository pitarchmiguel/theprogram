'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AddRedirectPage() {
  const router = useRouter()
  const { user, userRole, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user || userRole !== 'master') {
        router.push('/workouts')
      } else {
        router.push('/admin/workouts')
      }
    }
  }, [user, userRole, loading, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirigiendo al panel de administración...</p>
      </div>
    </div>
  )
} 