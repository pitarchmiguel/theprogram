import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipo para bloques de entrenamiento
export type Block = {
  id: string
  letter: string
  title: string
  description: string
  notes: string
}

// Tipo para entrenamientos
export type Workout = {
  id: string
  created_at: string
  date: string
  blocks: Block[]
}

// Función para obtener entrenamientos por fecha
export async function getWorkoutsByDate(date: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching workouts:', error)
    throw error
  }

  // Asegurar que cada workout tenga blocks como array
  return (data || []).map(workout => ({
    ...workout,
    blocks: workout.blocks || []
  }))
}

// Función para obtener entrenamientos por rango de fechas
export async function getWorkoutsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching workouts:', error)
    throw error
  }

  // Asegurar que cada workout tenga blocks como array
  return (data || []).map(workout => ({
    ...workout,
    blocks: workout.blocks || []
  }))
}

// Función para crear un nuevo entrenamiento
export async function createWorkout(date: string, blocks: Block[]) {
  // Validaciones
  if (!date) {
    throw new Error('La fecha es requerida')
  }
  
  if (!blocks || blocks.length === 0) {
    throw new Error('Debe haber al menos un bloque')
  }

  // Validar que cada bloque tenga los campos requeridos
  const validBlocks = blocks.filter(block => 
    block && 
    block.letter && 
    block.letter.trim() && 
    block.title && 
    block.title.trim()
  )

  if (validBlocks.length === 0) {
    throw new Error('Debe haber al menos un bloque con letra y título')
  }

  // Preparar los datos para insertar
  const workoutData = {
    date,
    blocks: validBlocks.map(block => ({
      id: block.id || `block-${Date.now()}-${Math.random()}`,
      letter: block.letter.trim(),
      title: block.title.trim(),
      description: block.description || '',
      notes: block.notes || ''
    }))
  }

  console.log('Insertando workout:', workoutData)

  const { data, error } = await supabase
    .from('workouts')
    .insert([workoutData])
    .select()
    .single()

  if (error) {
    console.error('Error creating workout:', error)
    // Proporcionar un mensaje de error más específico
    if (error.code === '23505') {
      throw new Error('Ya existe un entrenamiento para esta fecha')
    } else if (error.code === '23502') {
      throw new Error('Faltan campos requeridos')
    } else if (error.code === '42P01') {
      throw new Error('La tabla workouts no existe')
    } else {
      throw new Error(`Error al crear entrenamiento: ${error.message}`)
    }
  }

  console.log('Workout creado exitosamente:', data)
  return data
}

// Función para actualizar un entrenamiento
export async function updateWorkout(id: string, blocks: Block[]) {
  const { data, error } = await supabase
    .from('workouts')
    .update({ blocks })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating workout:', error)
    throw error
  }

  return data
}

// Función para eliminar un entrenamiento
export async function deleteWorkout(id: string) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting workout:', error)
    throw error
  }
} 