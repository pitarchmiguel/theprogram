/* eslint-disable */
import { createClient } from './supabaseClient'

// Usar el cliente singleton - solo se crea una instancia
const supabase = createClient()

// Exportar el cliente singleton
export { supabase }

// Categorías predefinidas del sistema (no se pueden eliminar)
export const DEFAULT_WORKOUT_CATEGORIES = [
  { value: 'OLY', label: 'Olympic Lifting', color: 'bg-blue-500', isDefault: true },
  { value: 'METCON', label: 'Metabolic Conditioning', color: 'bg-red-500', isDefault: true },
  { value: 'STRENGTH', label: 'Strength', color: 'bg-green-500', isDefault: true },
  { value: 'GYMNASTICS', label: 'Gymnastics', color: 'bg-purple-500', isDefault: true }
] as const

// Tipo para categorías personalizadas
export type CustomCategory = {
  id: string
  value: string
  label: string
  color: string
  isDefault: boolean
  created_at: string
}

// Todas las categorías disponibles (predefinidas + personalizadas)
export let WORKOUT_CATEGORIES: (typeof DEFAULT_WORKOUT_CATEGORIES[number] | CustomCategory)[] = [...DEFAULT_WORKOUT_CATEGORIES]

export type WorkoutCategory = string // Cambiado para permitir categorías dinámicas

// Tipo para estadísticas de categorías
export type CategoryStats = {
  category: WorkoutCategory
  count: number
  label: string
  color: string
}

// Tipo para bloques de entrenamiento
export type Block = {
  id: string
  letter: string
  title: string
  description: string
  notes: string
  category?: WorkoutCategory
  enableRMCalculator?: boolean
}

// Tipo para entrenamientos
export type Workout = {
  id: string
  created_at: string
  updated_at: string
  date: string
  blocks: Block[]
}

// Función para obtener entrenamientos por fecha
export async function getWorkoutsByDate(date: string) {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching workouts:', error)
      throw error
    }

    return (data || []).map((workout: unknown) => ({
      ...(workout as Workout),
      blocks: (workout as Workout).blocks || []
    }))
  } catch (error) {
    console.error('Error in getWorkoutsByDate:', error)
    throw error
  }
}

// Función para obtener entrenamientos por rango de fechas
export async function getWorkoutsByDateRange(startDate: string, endDate: string) {
  try {
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

    return (data || []).map((workout: unknown) => ({
      ...(workout as Workout),
      blocks: (workout as Workout).blocks || []
    }))
  } catch (error) {
    console.error('Error in getWorkoutsByDateRange:', error)
    throw error
  }
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
      notes: block.notes || '',
      category: block.category
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
    // Proporcionar un mensaje de error más específico
    if (error.code === '23505') {
      throw new Error('Ya existe un entrenamiento para esta fecha')
    } else if (error.code === '23502') {
      throw new Error('Faltan campos requeridos')
    } else if (error.code === '42P01') {
      throw new Error('La tabla workouts no existe')
    } else if (error.code === 'PGRST116') {
      throw new Error('Entrenamiento no encontrado')
    } else {
      throw new Error(`Error al actualizar entrenamiento: ${error.message || 'Error desconocido'}`)
    }
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
    // Proporcionar un mensaje de error más específico
    if (error.code === 'PGRST116') {
      throw new Error('Entrenamiento no encontrado')
    } else if (error.code === '42P01') {
      throw new Error('La tabla workouts no existe')
    } else {
      throw new Error(`Error al eliminar entrenamiento: ${error.message || 'Error desconocido'}`)
    }
  }
}

// Función para obtener entrenamientos por categoría
export async function getWorkoutsByCategory(category: WorkoutCategory, startDate?: string, endDate?: string) {
  let query = supabase
    .from('workouts')
    .select('*')
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching workouts by category:', error)
    throw error
  }

  // Filtrar workouts que tengan al menos un bloque con la categoría especificada
  const filteredWorkouts = (data || []).filter((workout: any) => {
    const blocks = workout.blocks || []
    return blocks.some((block: Block) => block.category === category)
  })

  return filteredWorkouts.map((workout: any) => ({
    ...workout,
    blocks: workout.blocks || []
  }))
}

// Función para obtener todas las categorías únicas usadas
export async function getUsedCategories(): Promise<WorkoutCategory[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('blocks')

  if (error) {
    console.error('Error fetching used categories:', error)
    throw error
  }

  const categoriesSet = new Set<WorkoutCategory>()
  
  data?.forEach((workout: any) => {
    const blocks = workout.blocks || []
    blocks.forEach((block: Block) => {
      if (block.category) {
        categoriesSet.add(block.category)
      }
    })
  })

  return Array.from(categoriesSet)
}

// Función para obtener estadísticas de categorías
export async function getCategoryStats(startDate?: string, endDate?: string): Promise<CategoryStats[]> {
  let query = supabase
    .from('workouts')
    .select('blocks, date')

  if (startDate) {
    query = query.gte('date', startDate)
  }
  
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching category stats:', error)
    throw error
  }

  const categoryCount = new Map<WorkoutCategory, number>()
  
  data?.forEach((workout: any) => {
    const blocks = workout.blocks || []
    const categoriesInWorkout = new Set<WorkoutCategory>()
    
    blocks.forEach((block: Block) => {
      if (block.category && !categoriesInWorkout.has(block.category)) {
        categoriesInWorkout.add(block.category)
        categoryCount.set(block.category, (categoryCount.get(block.category) || 0) + 1)
      }
    })
  })

  // Cargar categorías personalizadas
  await loadCustomCategories()

  const stats: CategoryStats[] = Array.from(categoryCount.entries()).map(([category, count]) => {
    const categoryInfo = WORKOUT_CATEGORIES.find(cat => cat.value === category)
    return {
      category,
      count,
      label: categoryInfo?.label || category,
      color: categoryInfo?.color || 'bg-gray-500'
    }
  })

  return stats.sort((a, b) => b.count - a.count)
}

// Función para cargar categorías personalizadas desde la base de datos
export async function loadCustomCategories(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('custom_categories')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      // Si la tabla no existe (código 42P01), no es un error crítico
      if (error.code === '42P01') {
        console.info('Custom categories table does not exist yet. Using default categories only.')
        WORKOUT_CATEGORIES = [...DEFAULT_WORKOUT_CATEGORIES]
        return
      }
      console.error('Error loading custom categories:', error)
      // En caso de otros errores, usar solo categorías por defecto
      WORKOUT_CATEGORIES = [...DEFAULT_WORKOUT_CATEGORIES]
      return
    }

    const customCategories: CustomCategory[] = (data || []).map((cat: any) => ({
      ...cat,
      isDefault: false
    }))

    WORKOUT_CATEGORIES = [...DEFAULT_WORKOUT_CATEGORIES, ...customCategories]
  } catch (error) {
    console.error('Error loading custom categories:', error)
    // En caso de error, usar solo categorías por defecto
    WORKOUT_CATEGORIES = [...DEFAULT_WORKOUT_CATEGORIES]
  }
}

// Función para crear una nueva categoría personalizada
export async function createCustomCategory(value: string, label: string, color: string): Promise<CustomCategory> {
  // Verificar que no exista ya
  const existingCategory = WORKOUT_CATEGORIES.find(cat => 
    cat.value.toLowerCase() === value.toLowerCase()
  )
  
  if (existingCategory) {
    throw new Error('Ya existe una categoría con ese nombre')
  }

  const categoryData = {
    value: value.toUpperCase(),
    label,
    color
  }

  const { data, error } = await supabase
    .from('custom_categories')
    .insert([categoryData])
    .select()
    .single()

  if (error) {
    console.error('Error creating custom category:', error)
    if (error.code === '42P01') {
      throw new Error('La tabla de categorías personalizadas no existe. Por favor, ejecuta el script de configuración de la base de datos.')
    }
    throw new Error(`Error al crear categoría: ${error.message}`)
  }

  const newCategory: CustomCategory = {
    ...data,
    isDefault: false
  }

  // Actualizar la lista local
  WORKOUT_CATEGORIES.push(newCategory)

  return newCategory
}

// Función para eliminar una categoría personalizada
export async function deleteCustomCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('custom_categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting custom category:', error)
    if (error.code === '42P01') {
      throw new Error('La tabla de categorías personalizadas no existe.')
    }
    throw new Error(`Error al eliminar categoría: ${error.message}`)
  }

  // Actualizar la lista local
  WORKOUT_CATEGORIES = WORKOUT_CATEGORIES.filter(cat => 
    'id' in cat ? cat.id !== id : true
  )
}

// Función para obtener entrenamientos con filtros avanzados
export async function getWorkoutsWithFilters(options: {
  startDate?: string
  endDate?: string
  categories?: WorkoutCategory[]
  date?: string
}): Promise<Workout[]> {
  let query = supabase
    .from('workouts')
    .select('*')
    .order('date', { ascending: false })

  if (options.date) {
    query = query.eq('date', options.date)
  } else {
    if (options.startDate) {
      query = query.gte('date', options.startDate)
    }
    
    if (options.endDate) {
      query = query.lte('date', options.endDate)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching workouts with filters:', error)
    throw error
  }

  let workouts = (data || []).map((workout: any) => ({
    ...workout,
    blocks: workout.blocks || []
  }))

  // Filtrar por categorías si se especifican
  if (options.categories && options.categories.length > 0) {
    workouts = workouts.filter((workout: any) => {
      const blocks = workout.blocks || []
      return blocks.some((block: Block) => 
        block.category && options.categories!.includes(block.category)
      )
    })
  }

  return workouts
}

// Tipos para métricas del dashboard
export type DashboardMetrics = {
  totalWorkouts: number
  totalUsers: number
  workoutsThisWeek: number
  workoutsThisMonth: number
  activeUsersThisWeek: number
  categoriesUsed: number
  recentActivity: RecentActivity[]
  // Métricas de RM
  totalPersonalRecords: number
  personalRecordsThisMonth: number
  heaviestRecord?: PersonalRecord
  recentPersonalRecords: PersonalRecord[]
  topExercises: { exercise_name: string; count: number }[]
}

export type RecentActivity = {
  id: string
  type: 'workout_created' | 'user_registered'
  description: string
  date: string
  user?: string
}

export type UserStats = {
  id: string
  email: string
  full_name?: string
  role: string
  created_at: string
  last_workout?: string
  total_workouts: number
}

// Tipo para récords máximos (RM)
export type PersonalRecord = {
  id: string
  user_id: string
  exercise_name: string
  weight_kg: number
  date_achieved: string
  notes?: string
  created_at: string
  updated_at: string
}

// Tipo extendido para RM con información de historial
export type PersonalRecordWithHistory = PersonalRecord & {
  weight_rank: number
  date_rank: number
  total_records: number
  previous_weight?: number
  is_current_weight_pr: boolean
  is_latest_attempt: boolean
  is_improvement: boolean
  improvement_percentage: number
}

// Tipo para agrupar RM por ejercicio con historial
export type ExerciseHistory = {
  exercise_name: string
  current_pr: PersonalRecord
  latest_attempt: PersonalRecord
  total_attempts: number
  records: PersonalRecord[]
  progression: {
    weight_improvement: number
    weight_improvement_percentage: number
    days_since_last_pr: number
  }
}

// Tipo para crear/actualizar RM (sin campos automáticos)
export type PersonalRecordInput = {
  exercise_name: string
  weight_kg: number
  date_achieved: string
  notes?: string
}

// Tipo para estadísticas de RM
export type PersonalRecordStats = {
  total_records: number
  latest_record?: PersonalRecord
  heaviest_record?: PersonalRecord
  recent_improvements: PersonalRecord[]
  exercises_tracked: string[]
}

// Función para obtener métricas del dashboard
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Total de entrenamientos
    const { count: totalWorkouts } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })

    // Total de usuarios
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Entrenamientos esta semana
    const { count: workoutsThisWeek } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .gte('date', weekStart.toISOString().split('T')[0])

    // Entrenamientos este mes
    const { count: workoutsThisMonth } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .gte('date', monthStart.toISOString().split('T')[0])

    // Categorías utilizadas
    const categoriesUsed = await getUsedCategories()

    // Actividad reciente
    const recentActivity = await getRecentActivity()

    // Estadísticas de RM
    const rmStats = await getAdminPersonalRecordStats()

    return {
      totalWorkouts: totalWorkouts || 0,
      totalUsers: totalUsers || 0,
      workoutsThisWeek: workoutsThisWeek || 0,
      workoutsThisMonth: workoutsThisMonth || 0,
      activeUsersThisWeek: 0, // Por implementar
      categoriesUsed: categoriesUsed.length,
      recentActivity,
      totalPersonalRecords: rmStats.totalPersonalRecords,
      personalRecordsThisMonth: rmStats.personalRecordsThisMonth,
      heaviestRecord: rmStats.heaviestRecord,
      recentPersonalRecords: rmStats.recentPersonalRecords,
      topExercises: rmStats.topExercises
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return {
      totalWorkouts: 0,
      totalUsers: 0,
      workoutsThisWeek: 0,
      workoutsThisMonth: 0,
      activeUsersThisWeek: 0,
      categoriesUsed: 0,
      recentActivity: [],
      totalPersonalRecords: 0,
      personalRecordsThisMonth: 0,
      heaviestRecord: undefined,
      recentPersonalRecords: [],
      topExercises: []
    }
  }
}

// Función para obtener estadísticas de usuarios
export async function getUserStats(): Promise<UserStats[]> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const userStats: UserStats[] = []
    
    for (const profile of profiles || []) {
      // Obtener último entrenamiento y total de entrenamientos para cada usuario
      // Nota: Esta es una implementación básica, se puede optimizar
      const { data: workouts } = await supabase
        .from('workouts')
        .select('date, created_at')
        .order('date', { ascending: false })
        .limit(1)

      userStats.push({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        last_workout: workouts?.[0]?.date,
        total_workouts: 0 // Por implementar con conteo específico por usuario si es necesario
      })
    }

    return userStats
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return []
  }
}

// Función para obtener actividad reciente
export async function getRecentActivity(): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = []

    // Últimos entrenamientos creados
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('id, date, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    recentWorkouts?.forEach((workout: any) => {
      activities.push({
        id: workout.id,
        type: 'workout_created',
        description: `Entrenamiento programado para ${new Date(workout.date).toLocaleDateString('es-ES')}`,
        date: workout.created_at
      })
    })

    // Últimos usuarios registrados
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    recentUsers?.forEach((user: any) => {
      activities.push({
        id: user.id,
        type: 'user_registered',
        description: `Nuevo usuario registrado: ${user.full_name || user.email}`,
        date: user.created_at,
        user: user.full_name || user.email
      })
    })

    // Ordenar por fecha más reciente
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

// =============================================================================
// FUNCIONES PARA GESTIONAR RÉCORDS MÁXIMOS (RM)
// =============================================================================

// Funciones de administración para RM

// Función para obtener estadísticas globales de RM (solo para administradores)
export async function getAdminPersonalRecordStats(): Promise<{
  totalPersonalRecords: number
  personalRecordsThisMonth: number
  heaviestRecord?: PersonalRecord
  recentPersonalRecords: PersonalRecord[]
  topExercises: { exercise_name: string; count: number }[]
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Verificar si es administrador
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'master') {
      throw new Error('Solo los administradores pueden acceder a estas estadísticas')
    }

    // Obtener todos los RM del sistema
    const { data: allRecords, error } = await supabase
      .from('personal_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const records = allRecords || []

    // Calcular métricas
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const totalPersonalRecords = records.length
    
    const personalRecordsThisMonth = records.filter((record: PersonalRecord) => 
      new Date(record.created_at) >= firstDayOfMonth
    ).length

    // RM más pesado
    const heaviestRecord = records.reduce((heaviest: PersonalRecord | null, current: PersonalRecord) => {
      if (!heaviest || current.weight_kg > heaviest.weight_kg) {
        return current
      }
      return heaviest
    }, null as PersonalRecord | null)

    // RM más recientes (últimos 5)
    const recentPersonalRecords = records.slice(0, 5)

    // Ejercicios más populares
    const exerciseCounts = records.reduce((counts: Record<string, number>, record: PersonalRecord) => {
      counts[record.exercise_name] = (counts[record.exercise_name] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const topExercises = Object.entries(exerciseCounts)
      .map(([exercise_name, count]) => ({ exercise_name, count: count as number }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 5)

    return {
      totalPersonalRecords,
      personalRecordsThisMonth,
      heaviestRecord: heaviestRecord || undefined,
      recentPersonalRecords,
      topExercises
    }
  } catch (error) {
    console.error('Error in getAdminPersonalRecordStats:', error)
    return {
      totalPersonalRecords: 0,
      personalRecordsThisMonth: 0,
      recentPersonalRecords: [],
      topExercises: []
    }
  }
}

// =============================================================================

// Función para obtener todos los RM de un usuario
export async function getPersonalRecords(userId?: string): Promise<PersonalRecord[]> {
  try {
    let query = supabase
      .from('personal_records')
      .select('*')
      .order('exercise_name', { ascending: true })

    // Si se especifica userId, filtrar por ese usuario (solo masters pueden ver RM de otros)
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching personal records:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getPersonalRecords:', error)
    throw error
  }
}

// Función para obtener un RM específico por ejercicio
export async function getPersonalRecordByExercise(exerciseName: string, userId?: string): Promise<PersonalRecord | null> {
  try {
    let query = supabase
      .from('personal_records')
      .select('*')
      .eq('exercise_name', exerciseName)
      .single()

    // Si se especifica userId, filtrar por ese usuario
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado
        return null
      }
      console.error('Error fetching personal record:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in getPersonalRecordByExercise:', error)
    throw error
  }
}

// Función para crear un nuevo RM
export async function createPersonalRecord(record: PersonalRecordInput): Promise<PersonalRecord> {
  try {
    // Validaciones
    if (!record.exercise_name || !record.exercise_name.trim()) {
      throw new Error('El nombre del ejercicio es requerido')
    }

    if (!record.weight_kg || record.weight_kg <= 0) {
      throw new Error('El peso debe ser mayor a 0')
    }

    if (!record.date_achieved) {
      throw new Error('La fecha es requerida')
    }

    // Obtener el usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Error de autenticación:', authError)
      throw new Error('Error de autenticación')
    }

    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Preparar datos para insertar (incluyendo user_id)
    const recordData = {
      user_id: user.id,
      exercise_name: record.exercise_name.trim(),
      weight_kg: record.weight_kg,
      date_achieved: record.date_achieved,
      notes: record.notes?.trim() || null
    }

    console.log('Insertando personal record con datos completos:', recordData)

    const { data, error } = await supabase
      .from('personal_records')
      .insert([recordData])
      .select()
      .single()

    if (error) {
      console.error('Error completo de Supabase:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      if (error.code === '23502') {
        throw new Error('Faltan campos requeridos')
      } else if (error.code === '42P01') {
        throw new Error('La tabla de récords personales no existe')
      } else if (error.code === '42501') {
        throw new Error('Sin permisos para crear RM')
      } else {
        throw new Error(`Error al crear RM: ${error.message || 'Error desconocido'}`)
      }
    }

    console.log('Personal record creado exitosamente:', data)
    return data
  } catch (error) {
    console.error('Error in createPersonalRecord:', error)
    throw error
  }
}

// Función para actualizar un RM existente
export async function updatePersonalRecord(id: string, record: PersonalRecordInput): Promise<PersonalRecord> {
  try {
    // Validaciones
    if (!record.exercise_name || !record.exercise_name.trim()) {
      throw new Error('El nombre del ejercicio es requerido')
    }

    if (!record.weight_kg || record.weight_kg <= 0) {
      throw new Error('El peso debe ser mayor a 0')
    }

    if (!record.date_achieved) {
      throw new Error('La fecha es requerida')
    }

    const updateData = {
      exercise_name: record.exercise_name.trim(),
      weight_kg: record.weight_kg,
      date_achieved: record.date_achieved,
      notes: record.notes?.trim() || null
    }

    const { data, error } = await supabase
      .from('personal_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating personal record:', error)
      if (error.code === '23505') {
        throw new Error(`Ya tienes un RM registrado para ${record.exercise_name}`)
      } else if (error.code === 'PGRST116') {
        throw new Error('RM no encontrado')
      } else {
        throw new Error(`Error al actualizar RM: ${error.message}`)
      }
    }

    return data
  } catch (error) {
    console.error('Error in updatePersonalRecord:', error)
    throw error
  }
}

// Función para eliminar un RM
export async function deletePersonalRecord(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('personal_records')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting personal record:', error)
      if (error.code === 'PGRST116') {
        throw new Error('RM no encontrado')
      } else {
        throw new Error(`Error al eliminar RM: ${error.message}`)
      }
    }
  } catch (error) {
    console.error('Error in deletePersonalRecord:', error)
    throw error
  }
}

// Función para obtener estadísticas de RM de un usuario
export async function getPersonalRecordStats(userId?: string): Promise<PersonalRecordStats> {
  try {
    const records = await getPersonalRecords(userId)

    if (records.length === 0) {
      return {
        total_records: 0,
        latest_record: undefined,
        heaviest_record: undefined,
        recent_improvements: [],
        exercises_tracked: []
      }
    }

    // Último RM por fecha
    const latestRecord = records.reduce((latest, current) => 
      new Date(current.date_achieved) > new Date(latest.date_achieved) ? current : latest
    )

    // RM más pesado
    const heaviestRecord = records.reduce((heaviest, current) => 
      current.weight_kg > heaviest.weight_kg ? current : heaviest
    )

    // Mejoras recientes (últimos 30 días)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentImprovements = records.filter(record => 
      new Date(record.date_achieved) >= thirtyDaysAgo
    ).sort((a, b) => new Date(b.date_achieved).getTime() - new Date(a.date_achieved).getTime())

    // Ejercicios únicos
    const exercisesTracked = [...new Set(records.map(record => record.exercise_name))].sort()

    return {
      total_records: records.length,
      latest_record: latestRecord,
      heaviest_record: heaviestRecord,
      recent_improvements: recentImprovements,
      exercises_tracked: exercisesTracked
    }
  } catch (error) {
    console.error('Error getting personal record stats:', error)
    return {
      total_records: 0,
      latest_record: undefined,
      heaviest_record: undefined,
      recent_improvements: [],
      exercises_tracked: []
    }
  }
}

// Función para obtener ejercicios más comunes (para sugerencias)
export async function getPopularExercises(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select('exercise_name')
      .order('exercise_name')

    if (error) {
      console.error('Error fetching popular exercises:', error)
      return []
    }

    // Contar ocurrencias de cada ejercicio
    const exerciseCounts = data.reduce((counts: Record<string, number>, record: any) => {
      const name = record.exercise_name
      counts[name] = (counts[name] || 0) + 1
      return counts
    }, {})

    // Ordenar por popularidad y retornar los nombres
    return Object.entries(exerciseCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([name]) => name)
      .slice(0, 20) // Top 20 ejercicios más populares
  } catch (error) {
    console.error('Error in getPopularExercises:', error)
    return []
  }
}

// Función para obtener el historial completo agrupado por ejercicio
export async function getPersonalRecordsGroupedByExercise(userId?: string): Promise<ExerciseHistory[]> {
  try {
    const records = await getPersonalRecords(userId)
    
    if (records.length === 0) {
      return []
    }

    // Agrupar por ejercicio
    const groupedByExercise = records.reduce((groups: Record<string, PersonalRecord[]>, record) => {
      if (!groups[record.exercise_name]) {
        groups[record.exercise_name] = []
      }
      groups[record.exercise_name].push(record)
      return groups
    }, {})

    // Convertir a formato ExerciseHistory
    const exerciseHistories: ExerciseHistory[] = Object.entries(groupedByExercise).map(([exerciseName, exerciseRecords]) => {
      // Ordenar por fecha descendente
      const sortedRecords = exerciseRecords.sort((a, b) => 
        new Date(b.date_achieved).getTime() - new Date(a.date_achieved).getTime()
      )

      // Encontrar RM actual (más pesado) y último intento
      const currentPr = exerciseRecords.reduce((max, current) => 
        current.weight_kg > max.weight_kg ? current : max
      )
      const latestAttempt = sortedRecords[0] // Más reciente por fecha

      // Calcular progresión
      const firstRecord = sortedRecords[sortedRecords.length - 1]
      const weightImprovement = currentPr.weight_kg - firstRecord.weight_kg
      const weightImprovementPercentage = firstRecord.weight_kg > 0 
        ? Math.round((weightImprovement / firstRecord.weight_kg) * 100 * 100) / 100 
        : 0

      const daysSinceLastPr = Math.floor(
        (Date.now() - new Date(currentPr.date_achieved).getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        exercise_name: exerciseName,
        current_pr: currentPr,
        latest_attempt: latestAttempt,
        total_attempts: exerciseRecords.length,
        records: sortedRecords,
        progression: {
          weight_improvement: weightImprovement,
          weight_improvement_percentage: weightImprovementPercentage,
          days_since_last_pr: daysSinceLastPr
        }
      }
    })

    // Ordenar por nombre de ejercicio
    return exerciseHistories.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
  } catch (error) {
    console.error('Error in getPersonalRecordsGroupedByExercise:', error)
    throw error
  }
}

// Función para obtener el historial de un ejercicio específico
export async function getExerciseHistory(exerciseName: string, userId?: string): Promise<PersonalRecord[]> {
  try {
    let query = supabase
      .from('personal_records')
      .select('*')
      .eq('exercise_name', exerciseName)
      .order('date_achieved', { ascending: false })

    // Si se especifica userId, filtrar por ese usuario
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching exercise history:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getExerciseHistory:', error)
    throw error
  }
} 