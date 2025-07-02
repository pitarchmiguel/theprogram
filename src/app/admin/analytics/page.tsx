'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Clock,
  Filter,
} from 'lucide-react'
import { format, subWeeks, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  getCategoryStats, 
  getUserStats, 
  getDashboardMetrics,
  getWorkoutsByDateRange,
  type CategoryStats,
  type UserStats,
  type DashboardMetrics,
  type Workout
} from '@/lib/supabase'
import { AdvancedFilter, type AdvancedFilterOptions } from '@/components/advanced-filter'

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AdvancedFilterOptions>({
    categories: [],
    startDate: undefined,
    endDate: undefined
  })

  // Períodos predefinidos
  const PERIODS = [
    {
      label: 'Última semana',
      getRange: () => {
        const end = new Date()
        const start = subWeeks(end, 1)
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        }
      }
    },
    {
      label: 'Último mes',
      getRange: () => {
        const end = new Date()
        const start = subMonths(end, 1)
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        }
      }
    },
    {
      label: 'Últimos 3 meses',
      getRange: () => {
        const end = new Date()
        const start = subMonths(end, 3)
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        }
      }
    },
  ]

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [
        metricsData,
        categoriesData,
        usersData,
        workoutsData
      ] = await Promise.all([
        getDashboardMetrics(),
        getCategoryStats(filters.startDate, filters.endDate),
        getUserStats(),
        getWorkoutsByDateRange(
          filters.startDate || format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
          filters.endDate || format(new Date(), 'yyyy-MM-dd')
        )
      ])

      setMetrics(metricsData)
      setCategoryStats(categoriesData)
      setUserStats(usersData)
      setRecentWorkouts(workoutsData.slice(0, 10))
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  const setPeriod = (period: typeof PERIODS[0]) => {
    const range = period.getRange()
    setFilters(prev => ({
      ...prev,
      ...range
    }))
  }

  const clearFilters = () => {
    setFilters({
      categories: [],
      startDate: undefined,
      endDate: undefined
    })
  }

  const filteredWorkouts = recentWorkouts.filter(workout => {
    if (filters.categories.length === 0) return true
    return workout.blocks?.some(block => 
      block.category && filters.categories.includes(block.category)
    )
  })

  const totalWorkoutsInPeriod = filteredWorkouts.length
  const averageWorkoutsPerWeek = totalWorkoutsInPeriod / (
    filters.startDate && filters.endDate 
      ? Math.max(1, Math.ceil((new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
      : 12 // Default 3 months = 12 weeks
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas y Analytics</h1>
          <p className="text-muted-foreground">
            Análisis detallado del uso del sistema
          </p>
        </div>
      </div>

      {/* Filtros y períodos rápidos */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <Button
              key={period.label}
              variant="outline"
              size="sm"
              onClick={() => setPeriod(period)}
            >
              {period.label}
            </Button>
          ))}
          {(filters.startDate || filters.endDate || filters.categories.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        
        <AdvancedFilter
          filters={filters}
          onFiltersChange={setFilters}
          compact={true}
          showStats={false}
        />
      </div>

      {/* Resumen del período */}
      {(filters.startDate || filters.endDate) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                Período: {filters.startDate && filters.endDate 
                  ? `${format(new Date(filters.startDate), 'dd/MM/yyyy')} - ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`
                  : filters.startDate 
                    ? `Desde ${format(new Date(filters.startDate), 'dd/MM/yyyy')}`
                    : `Hasta ${format(new Date(filters.endDate!), 'dd/MM/yyyy')}`
                }
              </span>
              {filters.categories.length > 0 && (
                <>
                  <span>•</span>
                  <span>Categorías: {filters.categories.join(', ')}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas del período */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Entrenamientos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkoutsInPeriod}</div>
            <p className="text-xs text-muted-foreground">
              en el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promedio Semanal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageWorkoutsPerWeek.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              entrenamientos por semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categorías Activas
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.length}</div>
            <p className="text-xs text-muted-foreground">
              categorías utilizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Usuarios
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              usuarios registrados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Estadísticas por categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Entrenamientos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryStats.length > 0 ? (
              <>
                {categoryStats.map((stat, index) => (
                  <div key={stat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                        <span className="font-medium">{stat.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{stat.count}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {((stat.count / totalWorkoutsInPeriod) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total</span>
                    <span>{categoryStats.reduce((sum, stat) => sum + stat.count, 0)} entrenamientos</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay datos de categorías para el período seleccionado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resumen de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userStats.length > 0 ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Total usuarios:</span>
                    <span className="font-medium">{userStats.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Administradores:</span>
                    <span className="font-medium">
                      {userStats.filter(u => u.role === 'master').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Atletas:</span>
                    <span className="font-medium">
                      {userStats.filter(u => u.role === 'athlete').length}
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Usuarios recientes</h4>
                  <div className="space-y-2">
                    {userStats.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{user.full_name || user.email}</span>
                        <Badge variant={user.role === 'master' ? 'default' : 'secondary'} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay datos de usuarios disponibles
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entrenamientos recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Entrenamientos Recientes
            {filters.categories.length > 0 && (
              <Badge variant="outline" className="ml-2">
                Filtrado por categorías
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWorkouts.length > 0 ? (
            <div className="space-y-3">
              {filteredWorkouts.map((workout) => (
                <div key={workout.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {format(new Date(workout.date), 'EEEE, d MMMM', { locale: es })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {workout.blocks?.length || 0} bloques
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {workout.blocks?.map((block, index) => (
                        <span key={index} className="text-xs text-muted-foreground">
                          {block.letter}) {block.title}
                          {index < workout.blocks!.length - 1 && ' • '}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(workout.created_at), 'dd/MM')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay entrenamientos para mostrar con los filtros actuales
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 