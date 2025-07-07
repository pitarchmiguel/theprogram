'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PersonalRecord, PersonalRecordInput, createPersonalRecord, updatePersonalRecord, getPopularExercises } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PersonalRecordFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingRecord?: PersonalRecord | null
  defaultExercise?: string
}

// Lista de ejercicios predefinidos comunes en CrossFit
const COMMON_EXERCISES = [
  'Back Squat',
  'Front Squat',
  'Overhead Squat',
  'Deadlift',
  'Sumo Deadlift',
  'Romanian Deadlift',
  'Bench Press',
  'Overhead Press',
  'Push Press',
  'Jerk',
  'Clean',
  'Snatch',
  'Clean & Jerk',
  'Thruster',
  'Wall Ball',
  'Kettlebell Swing',
  'Turkish Get-up',
  'Pull-up',
  'Strict Pull-up',
  'Muscle-up',
  'Handstand Push-up',
  'Box Jump',
  'Burpee (max in time)',
  'Double Under (max)',
  'Pistol Squat',
  'Air Squat (max in time)'
]

export function PersonalRecordForm({ isOpen, onClose, onSuccess, editingRecord, defaultExercise }: PersonalRecordFormProps) {
  const [exerciseName, setExerciseName] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [dateAchieved, setDateAchieved] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [popularExercises, setPopularExercises] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Cargar ejercicios populares al montar el componente
  useEffect(() => {
    const loadPopularExercises = async () => {
      try {
        const popular = await getPopularExercises()
        setPopularExercises(popular)
      } catch (error) {
        console.error('Error loading popular exercises:', error)
      }
    }

    if (isOpen) {
      loadPopularExercises()
    }
  }, [isOpen])

  // Rellenar el formulario cuando se está editando
  useEffect(() => {
    if (editingRecord) {
      setExerciseName(editingRecord.exercise_name)
      setWeightKg(editingRecord.weight_kg.toString())
      setDateAchieved(editingRecord.date_achieved)
      setNotes(editingRecord.notes || '')
      
      // Si el ejercicio no está en las listas comunes, mostrar input personalizado
      const isInCommon = COMMON_EXERCISES.includes(editingRecord.exercise_name)
      const isInPopular = popularExercises.includes(editingRecord.exercise_name)
      setShowCustomInput(!isInCommon && !isInPopular)
    } else {
      // Limpiar formulario para nuevo RM o usar ejercicio predeterminado
      setExerciseName(defaultExercise || '')
      setWeightKg('')
      setDateAchieved(format(new Date(), 'yyyy-MM-dd'))
      setNotes('')
      
      // Si hay ejercicio predeterminado, verificar si necesita input personalizado
      if (defaultExercise) {
        const isInPopular = popularExercises.includes(defaultExercise)
        setShowCustomInput(!isInPopular)
      } else {
        setShowCustomInput(false)
      }
    }
  }, [editingRecord, popularExercises, defaultExercise])

  // Obtener todas las opciones de ejercicios combinadas y únicas
  const allExercises = useMemo(() => 
    Array.from(new Set([...popularExercises, ...COMMON_EXERCISES])).sort(), 
    [popularExercises]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!exerciseName.trim()) {
      toast.error('El nombre del ejercicio es requerido')
      return
    }

    if (!weightKg || parseFloat(weightKg) <= 0) {
      toast.error('El peso debe ser mayor a 0')
      return
    }

    if (!dateAchieved) {
      toast.error('La fecha es requerida')
      return
    }

    setIsSubmitting(true)

    try {
      const recordData: PersonalRecordInput = {
        exercise_name: exerciseName.trim(),
        weight_kg: parseFloat(weightKg),
        date_achieved: dateAchieved,
        notes: notes.trim() || undefined
      }

      if (editingRecord) {
        await updatePersonalRecord(editingRecord.id, recordData)
        toast.success('RM actualizado correctamente')
      } else {
        await createPersonalRecord(recordData)
        toast.success('RM añadido correctamente')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving personal record:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar el RM')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExerciseChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true)
      setExerciseName('')
    } else {
      setShowCustomInput(false)
      setExerciseName(value)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? 'Editar RM' : 'Añadir RM'}
          </DialogTitle>
          <DialogDescription>
            {editingRecord 
              ? 'Modifica tu récord máximo' 
              : 'Añade un nuevo récord máximo a tu historial'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exercise">Ejercicio</Label>
            {!showCustomInput ? (
              <Select value={exerciseName} onValueChange={handleExerciseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ejercicio" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allExercises.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                      {popularExercises.includes(exercise) && (
                        <span className="ml-2 text-xs text-blue-600">Popular</span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Ejercicio personalizado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input
                  id="exercise"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="Nombre del ejercicio"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomInput(false)}
                  className="text-xs"
                >
                  Elegir de la lista
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.25"
              min="0.25"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej: 100.5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Fecha del RM</Label>
            <Input
              id="date"
              type="date"
              value={dateAchieved}
              onChange={(e) => setDateAchieved(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Con cinturón, nueva técnica, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                editingRecord ? 'Actualizar' : 'Añadir RM'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 