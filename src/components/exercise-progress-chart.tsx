'use client'

import { PersonalRecord } from "@/lib/supabase"

interface ExerciseProgressChartProps {
  records: PersonalRecord[]
  exerciseName: string
  compact?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExerciseProgressChart({ records: _records, exerciseName: _exerciseName, compact: _compact = false }: ExerciseProgressChartProps) {
  // Componente temporalmente deshabilitado debido a problemas de tipos en shadcn chart
  // Se rehabilitará cuando se resuelvan los problemas de compatibilidad de tipos
  return null
} 