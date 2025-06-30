'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Eye, EyeOff, XCircle, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getWorkoutsByDate, type Workout } from '@/lib/supabase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleNotes, setVisibleNotes] = useState<Set<string>>(new Set())

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const workoutsForSelectedDate = workouts.filter(workout => 
    workout && workout.date && isSameDay(new Date(workout.date), selectedDate)
  )

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))

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

  // Cargar entrenamientos cuando cambie la fecha seleccionada
  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        setLoading(true)
        setError(null)
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const data = await getWorkoutsByDate(dateStr)
        setWorkouts(data || [])
      } catch (error) {
        console.error('Error loading workouts:', error)
        setError('Error al cargar los entrenamientos')
        setWorkouts([])
      } finally {
        setLoading(false)
      }
    }

    loadWorkouts()
  }, [selectedDate])

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-4 max-w-md mx-auto">
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
                  <div className={`
                    relative w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : isToday 
                        ? 'bg-muted text-foreground' 
                        : 'hover:bg-muted/50 text-foreground'
                    }
                  `}>
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

        {/* Lista de Entrenamientos */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold">
            {format(selectedDate, 'EEEE, d MMMM', { locale: es })}
          </h3>
          
          {error ? (
            <Card className="p-6 text-center border-destructive">
              <div className="text-destructive">
                <XCircle className="h-12 w-12 mx-auto mb-4" />
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Reintentar
                </Button>
              </div>
            </Card>
          ) : loading ? (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Cargando entrenamientos...</p>
              </div>
            </Card>
          ) : workoutsForSelectedDate.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay entrenamientos programados para este día</p>
              </div>
            </Card>
          ) : (
            workoutsForSelectedDate.map((workout) => {
              // Verificar que el workout y sus bloques sean válidos
              if (!workout || !workout.blocks) {
                return null
              }

              const blocks = Array.isArray(workout.blocks) ? workout.blocks : []
              
              return (
                <Card key={workout.id} className="overflow-hidden">
                  <CardContent className="space-y-24 pt-2">
                    {blocks.length > 0 ? (
                      blocks.map((block) => {
                        if (!block || !block.id) return null
                        
                        const isNotesVisible = visibleNotes.has(block.id)
                        
                        return (
                          <div key={block.id} className="space-y-2">
                            <div className="flex items-center gap-2">
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
            }).filter(Boolean)
          )}
        </div>
      </main>
    </div>
  )
}