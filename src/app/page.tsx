'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Eye, EyeOff, XCircle, Dumbbell, RefreshCw, CalendarDays } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getWorkoutsByDate, getWorkoutsWithFilters, type Workout } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { CategoryBadge } from '@/components/category-selector'
import { AdvancedFilter, type AdvancedFilterOptions } from '@/components/advanced-filter'
import { CategoryStatsDisplay } from '@/components/category-stats'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleNotes, setVisibleNotes] = useState<Set<string>>(new Set())
  const [isTimeout, setIsTimeout] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterOptions>({
    categories: []
  })
  const { requireAuth, loading: authLoading, userRole } = useAuth()

  // Check authentication and redirect master users
  useEffect(() => {
    if (!authLoading) {
      requireAuth()
      // Redirect master users to workouts page
      if (userRole === 'master') {
        router.push('/workouts')
      }
    }
  }, [authLoading, requireAuth, userRole, router])

  // Cargar entrenamientos cuando cambien los filtros o la fecha seleccionada
  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        setLoading(true)
        setError(null)
        setIsTimeout(false)
        
        // Timeout visual de 15 segundos
        const timeoutId = setTimeout(() => {
          setIsTimeout(true)
          setError('La carga está tardando más de lo normal. Verifica tu conexión a internet.')
        }, 15000)
        
        // Si hay filtros avanzados activos, usarlos
        if (advancedFilters.categories.length > 0 || advancedFilters.startDate || advancedFilters.endDate) {
          const data = await getWorkoutsWithFilters({
            ...advancedFilters,
            categories: advancedFilters.categories.length > 0 ? advancedFilters.categories : undefined
          })
          setWorkouts(data || [])
        } else {
          // Solo filtrar por fecha seleccionada
          const dateStr = format(selectedDate, 'yyyy-MM-dd')
          const data = await getWorkoutsByDate(dateStr)
          setWorkouts(data || [])
        }
        
        clearTimeout(timeoutId)
        
      } catch (error) {
        console.error('Error loading workouts:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error al cargar los entrenamientos'
        setError(errorMessage)
        setWorkouts([])
      } finally {
        setLoading(false)
        setIsTimeout(false)
      }
    }

    if (!authLoading) {
      loadWorkouts()
    }
  }, [selectedDate, advancedFilters, authLoading])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Si hay filtros avanzados activos, usar todos los workouts filtrados
  // Si no, filtrar solo por fecha seleccionada
  const workoutsForSelectedDate = (advancedFilters.categories.length > 0 || advancedFilters.startDate || advancedFilters.endDate)
    ? workouts
    : workouts.filter(workout => 
        workout && workout.date && isSameDay(new Date(workout.date), selectedDate)
      )

  // Ordenar entrenamientos por fecha (más reciente primero) y luego por letra del primer bloque
  const sortedWorkoutsForSelectedDate = [...workoutsForSelectedDate].sort((a, b) => {
    // Primero ordenar por fecha
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dateComparison !== 0) return dateComparison
    
    // Luego por letra del primer bloque
    const aLetter = a.blocks && a.blocks[0] && a.blocks[0].letter ? a.blocks[0].letter.toUpperCase() : '';
    const bLetter = b.blocks && b.blocks[0] && b.blocks[0].letter ? b.blocks[0].letter.toUpperCase() : '';
    return aLetter.localeCompare(bLetter, 'es');
  });

  const toggleNotes = (blockId: string) => {
    setVisibleNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }

  const handleRetry = () => {
    setError(null)
    setIsTimeout(false)
    // Trigger reload by changing selectedDate slightly then back
    const currentDate = selectedDate
    setSelectedDate(new Date(selectedDate.getTime() + 1))
    setTimeout(() => setSelectedDate(currentDate), 100)
  }

  const hasActiveFilters = advancedFilters.categories.length > 0 || advancedFilters.startDate || advancedFilters.endDate

  // Filtro para el header
  const headerActions = (
    <div className="relative">
      <AdvancedFilter
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        showStats={false}
        compact={true}
      />
    </div>
  )

  // Show enhanced loading while checking auth or loading data
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>{authLoading ? 'Verificando usuario...' : 'Cargando entrenamientos...'}</span>
          {isTimeout && (
            <div className="text-center text-sm text-muted-foreground max-w-xs">
              <p>La carga está tardando más de lo normal.</p>
              <div className="flex gap-2 mt-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reintentar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/test-connection')}
                >
                  Diagnóstico
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))

  return (
    <div className="min-h-screen bg-background">
      {/* Header with navigation */}
      <AppHeader actions={headerActions} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-6 max-w-md mx-auto">
        {/* Estadísticas cuando hay filtros activos */}
        {hasActiveFilters && (
          <CategoryStatsDisplay 
            startDate={advancedFilters.startDate}
            endDate={advancedFilters.endDate}
            compact={true}
          />
        )}

        {/* Calendario Semanal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold">
              {format(weekStart, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="ghost" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const dayWorkouts = workouts.filter(workout => 
                workout && workout.date && isSameDay(new Date(workout.date), day)
              )
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <div
                  key={day.toISOString()}
                  className="relative p-2 text-center cursor-pointer"
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className={cn(
                    "relative w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "bg-muted text-foreground",
                    !isSelected && !isToday && "hover:bg-muted/50 text-foreground"
                  )}>
                    {format(day, 'd')}
                    
                    {/* Indicador de entrenamientos */}
                    {dayWorkouts.length > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <Badge variant="secondary" className="h-4 w-4 p-0 text-xs flex items-center justify-center min-w-0">
                          {dayWorkouts.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filtros activos en vista móvil */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {/* Filtro de fecha */}
            {(advancedFilters.startDate || advancedFilters.endDate) && (
              <Badge variant="outline" className="gap-1">
                <CalendarDays className="h-3 w-3" />
                {advancedFilters.startDate && advancedFilters.endDate 
                  ? `${format(new Date(advancedFilters.startDate), 'dd/MM', { locale: es })} - ${format(new Date(advancedFilters.endDate), 'dd/MM', { locale: es })}`
                  : advancedFilters.startDate 
                    ? `Desde ${format(new Date(advancedFilters.startDate), 'dd/MM', { locale: es })}`
                    : `Hasta ${format(new Date(advancedFilters.endDate!), 'dd/MM', { locale: es })}`
                }
              </Badge>
            )}
            
            {/* Filtros de categoría */}
            {advancedFilters.categories.map((category) => (
              <CategoryBadge key={category} category={category} />
            ))}
          </div>
        )}

        {/* Lista de Entrenamientos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {hasActiveFilters
                ? "Entrenamientos filtrados"
                : format(selectedDate, 'EEEE, d MMMM', { locale: es })
              }
            </h3>
            {sortedWorkoutsForSelectedDate.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {sortedWorkoutsForSelectedDate.length} entrenamientos
              </span>
            )}
          </div>
          
          {/* Contenido de entrenamientos */}
          {error ? (
            <Card className="p-6 text-center border-destructive">
              <div className="text-destructive">
                <XCircle className="h-12 w-12 mx-auto mb-4" />
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="mt-4"
                >
                  Reintentar
                </Button>
              </div>
            </Card>
          ) : sortedWorkoutsForSelectedDate.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {hasActiveFilters
                    ? "No se encontraron entrenamientos con los filtros seleccionados"
                    : "No hay entrenamientos programados para este día"
                  }
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedWorkoutsForSelectedDate.map((workout) => {
                // Verificar que el workout y sus bloques sean válidos
                if (!workout || !workout.blocks) {
                  return null
                }

                const blocks = Array.isArray(workout.blocks) ? workout.blocks : []
                
                return (
                  <Card key={workout.id} className="overflow-hidden">
                    <CardContent className="space-y-4 pt-4">
                      {blocks.length > 0 ? (
                        blocks.map((block) => {
                          if (!block || !block.id) return null
                          
                          const isNotesVisible = visibleNotes.has(block.id)
                          
                          return (
                            <div key={block.id} className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-primary text-lg">{block.letter || '?'}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium text-sm cursor-default">
                                      {block.title && block.title.length > 25 ? `${block.title.substring(0, 25)}...` : (block.title || 'Sin título')}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{block.title || 'Sin título'}</p>
                                  </TooltipContent>
                                </Tooltip>
                                {block.category && <CategoryBadge category={block.category} />}
                              </div>
                              {block.description && (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {block.description}
                                </div>
                              )}
                              {block.notes && block.notes.trim() && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleNotes(block.id)}
                                    className="h-6 text-xs hover:bg-transparent p-0"
                                  >
                                    {isNotesVisible ? (
                                      <>
                                        Ocultar notas
                                        <EyeOff className="h-3 w-3 ml-1" />
                                      </>
                                    ) : (
                                      <>
                                        Ver notas
                                        <Eye className="h-3 w-3 ml-1" />
                                      </>
                                    )}
                                  </Button>
                                  {isNotesVisible && (
                                    <div className="text-xs text-muted-foreground italic bg-muted p-2 rounded whitespace-pre-wrap">
                                      {block.notes}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No hay bloques definidos para este entrenamiento
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              }).filter(Boolean)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}