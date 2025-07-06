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

    return {
      totalWorkouts: totalWorkouts || 0,
      totalUsers: totalUsers || 0,
      workoutsThisWeek: workoutsThisWeek || 0,
      workoutsThisMonth: workoutsThisMonth || 0,
      activeUsersThisWeek: 0, // Por implementar
      categoriesUsed: categoriesUsed.length,
      recentActivity
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
      recentActivity: []
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