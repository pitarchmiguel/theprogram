'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createWorkout, type Block } from '@/lib/supabase'

export default function AddWorkoutFormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  
  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date())
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
      
      // Redirigir a la página de gestión
      router.push('/add')
      
    } catch (error: any) {
      console.error('Error adding workout:', error)
      setError(error.message || 'Error al guardar el entrenamiento. Inténtalo de nuevo.')
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

  // Contar bloques válidos
  const validBlocksCount = blocks.filter(block => 
    block.letter.trim() && block.title.trim()
  ).length

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
            <h1 className="text-lg font-semibold">Añadir Entrenamiento</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            {/* Mensajes de estado */}
            {error && (
              <div className="mb-6 p-4 border border-destructive rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de fecha */}
              <div className="space-y-3">
                <Label>Fecha</Label>
                <div className="flex items-center gap-3">
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
                    className="bg-muted text-center font-medium"
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Bloques</Label>
                  <span className="text-sm text-muted-foreground">
                    {validBlocksCount} válido{validBlocksCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {blocks.map((block, index) => (
                  <div key={block.id} className="space-y-4 p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-muted-foreground">
                        Bloque {index + 1}
                      </h3>
                      {blocks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlock(block.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Letra y Título */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
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
                      <div className="col-span-2 space-y-2">
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
                    <div className="space-y-2">
                      <Label htmlFor={`description-${block.id}`} className="text-xs">Descripción</Label>
                      <Textarea
                        id={`description-${block.id}`}
                        value={block.description}
                        onChange={(e) => updateBlock(block.id, 'description', e.target.value)}
                        placeholder="Describe el entrenamiento..."
                        rows={6}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${block.id}`} className="text-xs">Notas (opcional)</Label>
                      <Textarea
                        id={`notes-${block.id}`}
                        value={block.notes}
                        onChange={(e) => updateBlock(block.id, 'notes', e.target.value)}
                        placeholder="Notas adicionales, modificaciones, etc."
                        rows={4}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                ))}

                {/* Botón Añadir Bloque */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBlock}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Bloque
                </Button>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-6">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  size="lg"
                  disabled={isSubmitting || validBlocksCount === 0}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Entrenamiento'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 