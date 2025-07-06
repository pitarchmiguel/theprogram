'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, ChevronLeft, ChevronRight, Edit, Trash2, X, AlertCircle, Calendar, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { getWorkoutsByDateRange, deleteWorkout, createWorkout, updateWorkout, type Workout, type Block } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CategorySelector, CategoryBadge } from '@/components/category-selector'
import { Spinner } from '@/components/ui/spinner'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function ManageWorkoutsContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const { } = useAuth()
  
  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date())
  const [currentWeek, setCurrentWeek] = useState(dateParam ? new Date(dateParam) : new Date())
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([])
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: '1',
      letter: '',
      title: '',
      description: '',
      notes: '',
      category: undefined
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [showWeekends, setShowWeekends] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const allWeekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  // Filtrar días según si se muestran fines de semana
  const weekDays = showWeekends 
    ? allWeekDays 
    : allWeekDays.filter(day => {
        const dayOfWeek = day.getDay()
        return dayOfWeek !== 0 && dayOfWeek !== 6 // Excluir domingo (0) y sábado (6)
      })

  const loadWeekWorkouts = useCallback(async () => {
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd')
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')
      const data = await getWorkoutsByDateRange(startDate, endDate)
      setWeekWorkouts(data || [])
    } catch (error) {
      console.error('Error loading week workouts:', error)
    }
  }, [weekStart])

  // Cargar entrenamientos de la semana cuando cambie la semana
  useEffect(() => {
    loadWeekWorkouts()
  }, [currentWeek, loadWeekWorkouts])

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))

  const handleDeleteWorkout = async (workoutId: string) => {
    setWorkoutToDelete(workoutId)
  }

  const confirmDeleteWorkout = async () => {
    if (!workoutToDelete) return

    try {
      await deleteWorkout(workoutToDelete)
      toast.success('Entrenamiento eliminado')
      loadWeekWorkouts()
    } catch (error: unknown) {
      console.error('Error deleting workout:', error)
      let errorMessage = 'Error al eliminar el entrenamiento'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      toast.error(errorMessage)
    } finally {
      setWorkoutToDelete(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Limpiar estados anteriores
    setError(null)
    
    // Filtrar bloques que tengan al menos letra y título
    const validBlocks = blocks.filter(block => 
      block.letter.trim() && block.title.trim()
    )
    
    if (validBlocks.length === 0) {
      setError('Debes añadir al menos un bloque con letra y título')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Guardar en Supabase
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      await createWorkout(dateStr, validBlocks)
      
      // Mostrar toast de éxito
      toast.success('¡Entrenamiento añadido correctamente!', {
        description: `Entrenamiento guardado para el ${format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}`,
        duration: 3000,
      })
      
      // Recargar entrenamientos de la semana
      loadWeekWorkouts()
      
      // Limpiar formulario
      setBlocks([{
        id: Date.now().toString(),
        letter: '',
        title: '',
        description: '',
        notes: '',
        category: undefined
      }])
      
      // Cerrar dialog
      setIsAddDialogOpen(false)
      
    } catch (error: unknown) {
      console.error('Error adding workout:', error)
      let errorMessage = 'Error al guardar el entrenamiento. Inténtalo de nuevo.'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(block => block.id !== id))
    }
  }

  const addBlock = () => {
    const newBlock: Block = {
      id: Date.now().toString(),
      letter: '',
      title: '',
      description: '',
      notes: '',
      category: undefined
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (id: string, field: keyof Block, value: string | undefined) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, [field]: value } : block
    ))
  }

  const changeDate = (direction: 'next' | 'prev') => {
    const newDate = direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
    setSelectedDate(newDate)
  }

  const handleEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout)
    setBlocks(workout.blocks || [])
    setIsEditDialogOpen(true)
  }

  const handleUpdateWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingWorkout) return
    
    setError(null)
    
    const validBlocks = blocks.filter(block => 
      block.letter.trim() && block.title.trim()
    )
    
    if (validBlocks.length === 0) {
      setError('Debes tener al menos un bloque con letra y título')
      return
    }

    try {
      setIsSubmitting(true)
      
      await updateWorkout(editingWorkout.id, validBlocks)
      
      toast.success('Entrenamiento actualizado correctamente')
      
      loadWeekWorkouts()
      setIsEditDialogOpen(false)
      setEditingWorkout(null)
      setBlocks([{
        id: Date.now().toString(),
        letter: '',
        title: '',
        description: '',
        notes: '',
        category: undefined
      }])
      
    } catch (error: unknown) {
      console.error('Error updating workout:', error)
      let errorMessage = 'Error al actualizar el entrenamiento'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderDesktopCalendar = () => (
    <div className={`grid gap-2 h-full ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
      {weekDays.map((day, index) => {
        const dayWorkouts = weekWorkouts.filter(workout => 
          isSameDay(new Date(workout.date), day)
        )
        const isToday = isSameDay(day, new Date())
        const isSelected = isSameDay(day, selectedDate)
        
        return (
          <div 
            key={index} 
            className={`border rounded-lg p-2 cursor-pointer transition-all h-full min-h-[200px] flex flex-col
              ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
              ${isToday ? 'border-primary' : 'border-border'}
              hover:bg-muted/50
            `}
            onClick={() => setSelectedDate(day)}
          >
            <div className="text-center mb-2">
              <div className="text-sm font-medium capitalize">
                {format(day, 'EEEE', { locale: es })}
              </div>
              <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto">
              {dayWorkouts.map((workout) => (
                <div 
                  key={workout.id}
                  className="bg-white border rounded p-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      {workout.blocks?.map((block, blockIndex) => (
                        <div key={blockIndex} className="text-xs">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-primary">{block.letter})</span>
                            <span className="font-medium">{block.title}</span>
                            {block.category && (
                              <CategoryBadge category={block.category} size="sm" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditWorkout(workout)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteWorkout(workout.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Botón de añadir en cada día */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedDate(day)
                  setIsAddDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderMobileFeed = () => (
    <div className="space-y-4">
      {weekDays.map((day, index) => {
        const dayWorkouts = weekWorkouts.filter(workout => 
          isSameDay(new Date(workout.date), day)
        )
        const isToday = isSameDay(day, new Date())
        
        return (
          <Card key={index} className={isToday ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold capitalize">
                    {format(day, 'EEEE, d MMMM', { locale: es })}
                  </h3>
                  {isToday && (
                    <span className="text-sm text-primary font-medium">Hoy</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedDate(day)
                    setIsAddDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            {dayWorkouts.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {dayWorkouts.map((workout) => (
                    <div 
                      key={workout.id}
                      className="border rounded-lg p-3 bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Entrenamiento
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditWorkout(workout)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteWorkout(workout.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {workout.blocks?.map((block, blockIndex) => (
                          <div key={blockIndex} className="text-sm">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-primary min-w-[20px]">
                                {block.letter})
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{block.title}</span>
                                  {block.category && (
                                    <CategoryBadge category={block.category} />
                                  )}
                                </div>
                                {block.description && (
                                  <div className="text-muted-foreground mt-1 text-xs line-clamp-2">
                                    {block.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )

  const renderForm = () => (
    <form onSubmit={isEditDialogOpen ? handleUpdateWorkout : handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 border border-destructive rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Fecha seleccionada</Label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => changeDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-4 py-2 bg-muted rounded">
            {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => changeDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Bloques del entrenamiento</Label>
          <Button type="button" variant="outline" size="sm" onClick={addBlock}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir bloque
          </Button>
        </div>

        {blocks.map((block, index) => (
          <Card key={block.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-medium">Bloque {index + 1}</h4>
              {blocks.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBlock(block.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`letter-${block.id}`}>Letra del bloque</Label>
                <Input
                  id={`letter-${block.id}`}
                  value={block.letter}
                  onChange={(e) => updateBlock(block.id, 'letter', e.target.value)}
                  placeholder="A, B, C..."
                  className="uppercase"
                  maxLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`category-${block.id}`}>Categoría</Label>
                <CategorySelector
                  value={block.category}
                  onValueChange={(value) => updateBlock(block.id, 'category', value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`title-${block.id}`}>Título del bloque</Label>
                <Input
                  id={`title-${block.id}`}
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                  placeholder="Ej: Warm Up, Metcon, Strength..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`description-${block.id}`}>Descripción del ejercicio</Label>
                <Textarea
                  id={`description-${block.id}`}
                  value={block.description}
                  onChange={(e) => updateBlock(block.id, 'description', e.target.value)}
                  placeholder="Descripción detallada del ejercicio..."
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`notes-${block.id}`}>Notas adicionales</Label>
                <Textarea
                  id={`notes-${block.id}`}
                  value={block.notes}
                  onChange={(e) => updateBlock(block.id, 'notes', e.target.value)}
                  placeholder="Notas, modificaciones, observaciones..."
                  rows={2}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Spinner size="sm" color="white" className="mr-2" />
              {isEditDialogOpen ? 'Actualizando...' : 'Guardando...'}
            </>
          ) : (
            isEditDialogOpen ? 'Actualizar entrenamiento' : 'Guardar entrenamiento'
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            if (isEditDialogOpen) {
              setIsEditDialogOpen(false)
              setEditingWorkout(null)
            } else {
              setIsAddDialogOpen(false)
            }
            setBlocks([{
              id: Date.now().toString(),
              letter: '',
              title: '',
              description: '',
              notes: '',
              category: undefined
            }])
            setError(null)
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestionar Entrenamientos</h1>
          <p className="text-muted-foreground">
            Programa y gestiona los entrenamientos semanales
          </p>
        </div>
      </div>

      {/* Main Content */}
      {isMobile ? (
        // Layout móvil
        <div className="space-y-6">
          {/* Navegación de semana */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {format(weekStart, 'MMMM yyyy', { locale: es })}
              </h2>
              <Button variant="ghost" size="sm" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeekends(!showWeekends)}
                className="flex items-center gap-2"
              >
                {showWeekends ? <Calendar className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {showWeekends ? 'Ocultar fines de semana' : 'Mostrar fines de semana'}
                </span>
                <span className="sm:hidden">
                  {showWeekends ? 'Solo semana' : 'Incluir S-D'}
                </span>
              </Button>
            </div>
          </div>

          {/* Feed de entrenamientos */}
          <div className="pb-20">
            {renderMobileFeed()}
          </div>
        </div>
      ) : (
        // Layout de escritorio - Calendario de ancho completo
        <div className="space-y-4 h-[calc(100vh-200px)]">
          {/* Navegación de semana */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">
                {format(weekStart, 'MMMM yyyy', { locale: es })}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeekends(!showWeekends)}
                className="flex items-center gap-2"
              >
                {showWeekends ? <Calendar className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                <span className="hidden lg:inline">
                  {showWeekends ? 'Ocultar fines de semana' : 'Mostrar fines de semana'}
                </span>
                <span className="lg:hidden">
                  {showWeekends ? 'Solo semana' : 'Incluir S-D'}
                </span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendario semanal de ancho completo */}
          {renderDesktopCalendar()}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir entrenamiento</DialogTitle>
            <DialogDescription>
              Entrenamiento para el {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar entrenamiento</DialogTitle>
            <DialogDescription>
              Modificar entrenamiento del {editingWorkout && format(new Date(editingWorkout.date), 'EEEE, d MMMM yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!workoutToDelete} onOpenChange={() => setWorkoutToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrenamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El entrenamiento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWorkout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ManageWorkoutsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[200px]">
        <Spinner size="lg" />
      </div>
    }>
      <ManageWorkoutsContent />
    </Suspense>
  )
} 