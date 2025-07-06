'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/spinner'

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
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">Redirigiendo al panel de administración...</p>
      </div>
    </div>
  )
} 