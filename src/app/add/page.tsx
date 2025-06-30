'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Edit, Trash2, X, AlertCircle, Calendar, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { getWorkoutsByDateRange, deleteWorkout, createWorkout, type Workout, type Block } from '@/lib/supabase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function ManageWorkoutsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  
  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date())
  const [currentWeek, setCurrentWeek] = useState(dateParam ? new Date(dateParam) : new Date())
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([])
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: '1',
      letter: '',
      title: '',
      description: '',
      notes: ''
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  const handleDeleteWorkout = async (workoutId: string) => {
    setWorkoutToDelete(workoutId)
  }

  const confirmDeleteWorkout = async () => {
    if (!workoutToDelete) return

    try {
      await deleteWorkout(workoutToDelete)
      toast.success('Entrenamiento eliminado')
      loadWeekWorkouts()
    } catch {
      toast.error('Error al eliminar el entrenamiento')
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
      console.log('Guardando entrenamiento para:', dateStr)
      console.log('Bloques válidos:', validBlocks)
      
      await createWorkout(dateStr, validBlocks)
      
      // Mostrar toast de éxito
      toast.success('¡Entrenamiento añadido correctamente!', {
        description: `Entrenamiento guardado para el ${format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}`,
        duration: 3000,
      })
      
      console.log('Entrenamiento guardado exitosamente')
      
      // Recargar entrenamientos de la semana
      loadWeekWorkouts()
      
      // Limpiar formulario
      setBlocks([{
        id: Date.now().toString(),
        letter: '',
        title: '',
        description: '',
        notes: ''
      }])
      
      // Cerrar dialog en móvil
      if (isMobile) {
        setIsAddDialogOpen(false)
      }
      
    } catch (error: unknown) {
      console.error('Error adding workout:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el entrenamiento. Inténtalo de nuevo.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addBlock = () => {
    const newBlock: Block = {
      id: Date.now().toString(),
      letter: '',
      title: '',
      description: '',
      notes: ''
    }
    setBlocks(prev => [...prev, newBlock])
  }

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(prev => prev.filter(block => block.id !== id))
    }
  }

  const updateBlock = (id: string, field: keyof Block, value: string) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, [field]: value } : block
    ))
  }

  const changeDate = (direction: 'next' | 'prev') => {
    setSelectedDate(prev => 
      direction === 'next' ? addDays(prev, 1) : subDays(prev, 1)
    )
  }

  const handleEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout)
    setSelectedDate(new Date(workout.date))
    setBlocks(workout.blocks || [{
      id: '1',
      letter: '',
      title: '',
      description: '',
      notes: ''
    }])
    setIsEditDialogOpen(true)
  }

  const handleUpdateWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingWorkout) return
    
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
      
      // Actualizar en Supabase
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      console.log('Actualizando entrenamiento:', editingWorkout.id)
      console.log('Nuevos bloques:', validBlocks)
      
      // Primero eliminar el entrenamiento existente
      await deleteWorkout(editingWorkout.id)
      
      // Luego crear el nuevo entrenamiento
      await createWorkout(dateStr, validBlocks)
      
      // Mostrar toast de éxito
      toast.success('¡Entrenamiento actualizado correctamente!', {
        description: `Entrenamiento actualizado para el ${format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}`,
        duration: 3000,
      })
      
      console.log('Entrenamiento actualizado exitosamente')
      
      // Recargar entrenamientos de la semana
      loadWeekWorkouts()
      
      // Cerrar dialog
      setIsEditDialogOpen(false)
      setEditingWorkout(null)
      
    } catch (error: unknown) {
      console.error('Error updating workout:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el entrenamiento. Inténtalo de nuevo.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cargar entrenamientos de la semana cuando cambie la semana
  useEffect(() => {
    loadWeekWorkouts()
  }, [currentWeek, loadWeekWorkouts])

  // Contar bloques válidos
  const validBlocksCount = blocks.filter(block => 
    block.letter.trim() && block.title.trim()
  ).length

  // Renderizar calendario de escritorio
  const renderDesktopCalendar = () => (
    <div className="h-[500px] overflow-y-auto">
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayWorkouts = weekWorkouts.filter(workout => 
            workout && workout.date && isSameDay(new Date(workout.date), day)
          )
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div key={day.toISOString()} className="space-y-3">
              <div 
                className={`text-center cursor-pointer p-3 rounded-lg transition-colors border ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : isToday 
                      ? 'bg-muted border-muted-foreground/20' 
                      : 'hover:bg-muted/50 border-border'
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className="text-xl font-bold">
                  {format(day, 'd')}
                </div>
                {dayWorkouts.length > 0 && (
                  <div className="text-xs mt-1 opacity-80">
                    {dayWorkouts.length} entrenamiento{dayWorkouts.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {dayWorkouts.map((workout) => (
                  <Card key={workout.id} className="p-3">
                    <div className="space-y-2">
                      {workout.blocks?.map((block) => (
                        <div key={block.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-bold text-primary text-sm">{block.letter}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate text-sm cursor-default">
                                  {block.title.length > 20 ? `${block.title.substring(0, 20)}...` : block.title}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{block.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditWorkout(workout)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => handleDeleteWorkout(workout.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // Renderizar feed móvil
  const renderMobileFeed = () => (
    <div className="space-y-4">
      {weekDays.map((day) => {
        const dayWorkouts = weekWorkouts.filter(workout => 
          workout && workout.date && isSameDay(new Date(workout.date), day)
        )
        const isToday = isSameDay(day, new Date())

        return (
          <Card key={day.toISOString()} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-center p-2 rounded-lg min-w-[60px] ${
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <div className="text-xs font-medium">
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className="text-lg font-bold">
                      {format(day, 'd')}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {format(day, 'EEEE, d MMMM', { locale: es })}
                    </h3>
                    {dayWorkouts.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {dayWorkouts.length} entrenamiento{dayWorkouts.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(day)
                    setIsAddDialogOpen(true)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            {dayWorkouts.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {dayWorkouts.map((workout) => (
                    <div key={workout.id} className="border rounded-lg p-3 bg-card">
                      <div className="space-y-2">
                        {workout.blocks?.map((block) => (
                          <div key={block.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-bold text-primary text-lg">{block.letter}</span>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{block.title}</h4>
                                {block.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {block.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
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
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => handleDeleteWorkout(workout.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

  // Renderizar formulario
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selector de fecha */}
      <div className="space-y-2">
        <Label>Fecha</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => changeDate('prev')}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            value={format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
            disabled
            className="bg-muted text-center font-medium text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => changeDate('next')}
            disabled={isSubmitting}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bloques */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Bloques</Label>
          <span className="text-xs text-muted-foreground">
            {validBlocksCount} válido{validBlocksCount !== 1 ? 's' : ''}
          </span>
        </div>

        {blocks.map((block, index) => (
          <div key={block.id} className="space-y-3 p-3 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">
                Bloque {index + 1}
              </h4>
              {blocks.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBlock(block.id)}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Letra y Título */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`letter-${block.id}`} className="text-xs">Letra *</Label>
                <Input
                  id={`letter-${block.id}`}
                  value={block.letter}
                  onChange={(e) => updateBlock(block.id, 'letter', e.target.value)}
                  placeholder="A"
                  maxLength={1}
                  className="text-center font-bold text-lg"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor={`title-${block.id}`} className="text-xs">Título *</Label>
                <Input
                  id={`title-${block.id}`}
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                  placeholder="Ej: WOD Fran"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1">
              <Label htmlFor={`description-${block.id}`} className="text-xs">Descripción</Label>
              <Textarea
                id={`description-${block.id}`}
                value={block.description}
                onChange={(e) => updateBlock(block.id, 'description', e.target.value)}
                placeholder="Describe el entrenamiento..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <Label htmlFor={`notes-${block.id}`} className="text-xs">Notas (opcional)</Label>
              <Textarea
                id={`notes-${block.id}`}
                value={block.notes}
                onChange={(e) => updateBlock(block.id, 'notes', e.target.value)}
                placeholder="Notas adicionales, modificaciones, etc."
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1" 
          size="sm"
          disabled={isSubmitting || validBlocksCount === 0}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Entrenamiento'}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Gestionar Entrenamientos</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {isMobile ? (
          // Layout móvil
          <div className="space-y-6">
            {/* Navegación de semana */}
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

            {/* Feed de entrenamientos */}
            <div className="pb-20">
              {renderMobileFeed()}
            </div>
          </div>
        ) : (
          // Layout de escritorio
          <div className="flex gap-6 h-[calc(100vh-120px)]">
            {/* Panel de Calendario (70%) */}
            <div className="flex-1 space-y-4">
              {/* Navegación de semana */}
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

              {/* Calendario semanal */}
              {renderDesktopCalendar()}
            </div>

            {/* Panel de Formulario (30%) */}
            <div className="w-80 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Añadir Entrenamiento
                  </h3>
                  
                  {/* Mensajes de estado */}
                  {error && (
                    <div className="mb-4 p-3 border border-destructive rounded-lg">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  )}

                  {renderForm()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Dialog para añadir entrenamiento en móvil */}
      {isMobile && (
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setError(null)
            // Reset form to default state
            setBlocks([{
              id: Date.now().toString(),
              letter: '',
              title: '',
              description: '',
              notes: ''
            }])
          }
        }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Añadir Entrenamiento</DialogTitle>
              <DialogDescription>
                Añade un nuevo entrenamiento para el {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
              </DialogDescription>
            </DialogHeader>
            
            {/* Mensajes de estado */}
            {error && (
              <div className="p-3 border border-destructive rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {renderForm()}
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para editar entrenamiento */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingWorkout(null)
          setError(null)
          // Reset form to default state
          setBlocks([{
            id: Date.now().toString(),
            letter: '',
            title: '',
            description: '',
            notes: ''
          }])
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Entrenamiento</DialogTitle>
            <DialogDescription>
              Edita el entrenamiento para el {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          
          {/* Mensajes de estado */}
          {error && (
            <div className="p-3 border border-destructive rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdateWorkout} className="space-y-4">
            {/* Selector de fecha */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => changeDate('prev')}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  value={format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
                  disabled
                  className="bg-muted text-center font-medium text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => changeDate('next')}
                  disabled={isSubmitting}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bloques */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Bloques</Label>
                <span className="text-xs text-muted-foreground">
                  {validBlocksCount} válido{validBlocksCount !== 1 ? 's' : ''}
                </span>
              </div>

              {blocks.map((block, index) => (
                <div key={block.id} className="space-y-3 p-3 border rounded-lg bg-card">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Bloque {index + 1}
                    </h4>
                    {blocks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlock(block.id)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Letra y Título */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`edit-letter-${block.id}`} className="text-xs">Letra *</Label>
                      <Input
                        id={`edit-letter-${block.id}`}
                        value={block.letter}
                        onChange={(e) => updateBlock(block.id, 'letter', e.target.value)}
                        placeholder="A"
                        maxLength={1}
                        className="text-center font-bold text-lg"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label htmlFor={`edit-title-${block.id}`} className="text-xs">Título *</Label>
                      <Input
                        id={`edit-title-${block.id}`}
                        value={block.title}
                        onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                        placeholder="Ej: WOD Fran"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1">
                    <Label htmlFor={`edit-description-${block.id}`} className="text-xs">Descripción</Label>
                    <Textarea
                      id={`edit-description-${block.id}`}
                      value={block.description}
                      onChange={(e) => updateBlock(block.id, 'description', e.target.value)}
                      placeholder="Describe el entrenamiento..."
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Notas */}
                  <div className="space-y-1">
                    <Label htmlFor={`edit-notes-${block.id}`} className="text-xs">Notas (opcional)</Label>
                    <Textarea
                      id={`edit-notes-${block.id}`}
                      value={block.notes}
                      onChange={(e) => updateBlock(block.id, 'notes', e.target.value)}
                      placeholder="Notas adicionales, modificaciones, etc."
                      rows={3}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1" 
                size="sm"
                disabled={isSubmitting || validBlocksCount === 0}
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar Entrenamiento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
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
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>}>
      <ManageWorkoutsContent />
    </Suspense>
  )
} 