'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'

import { PersonalRecordForm } from '@/components/personal-record-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ExerciseHistory, getPersonalRecordsGroupedByExercise } from '@/lib/supabase'
import { ExerciseHistoryCard } from '@/components/exercise-history-card'
import { toast } from 'sonner'
import { Plus, Target, Trophy, ChevronLeft } from 'lucide-react'

export default function PersonalRecordsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [exerciseHistories, setExerciseHistories] = useState<ExerciseHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Verificar autenticación
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Cargar RM y estadísticas
  const loadData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Cargar RM agrupados
      const exerciseHistoriesData = await getPersonalRecordsGroupedByExercise()

      setExerciseHistories(exerciseHistoriesData)
    } catch (error) {
      console.error('Error loading personal records:', error)
      setError('Error al cargar los récords máximos')
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Cargar datos cuando el usuario esté disponible
  useEffect(() => {
    if (user && !authLoading) {
      loadData()
    }
  }, [user, authLoading, loadData])

  // Mostrar loading mientras se verifica autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Verificando autenticación...</span>
        </div>
      </div>
    )
  }

  // Si no hay usuario, no mostrar nada (redirect en curso)
  if (!user) {
    return null
  }

  const handleFormSuccess = () => {
    loadData() // Recargar datos después de añadir/editar
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push('/workouts')}
        className="text-muted-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Workouts
      </Button>
      <Button onClick={() => setIsFormOpen(true)} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Add RM
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="RM" actions={headerActions} />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Spinner />
              <span>Cargando récords máximos...</span>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <Target className="h-12 w-12 text-destructive opacity-50" />
                <p className="text-destructive">{error}</p>
                <Button onClick={loadData} variant="outline" className="mt-2">
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>


            {/* Lista de RM agrupados por ejercicio */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Ejercicios</h2>
                {exerciseHistories.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {exerciseHistories.length} {exerciseHistories.length === 1 ? 'ejercicio' : 'ejercicios'}
                  </p>
                )}
              </div>
              
              <div className="space-y-4">
                {exerciseHistories.map((exerciseHistory) => (
                  <ExerciseHistoryCard
                    key={exerciseHistory.exercise_name}
                    exerciseHistory={exerciseHistory}
                    onRecordsChange={loadData}
                  />
                ))}
              </div>
            </div>

            {/* Mensaje inicial si no hay RM */}
            {exerciseHistories.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-4">
                      <Trophy className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">¡Registra tu primer RM!</h3>
                      <p className="text-muted-foreground max-w-md">
                        Los récords máximos te ayudan a seguir tu progreso y establecer objetivos. 
                        Comienza registrando tus mejores marcas en tus ejercicios favoritos.
                      </p>
                    </div>
                    <Button onClick={() => setIsFormOpen(true)} size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir mi primer RM
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Formulario para añadir RM */}
      <PersonalRecordForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
} 