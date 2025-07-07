'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Plus,
  ArrowRight,
  Tag,
  Weight,
  Trophy,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { getDashboardMetrics, getCategoryStats, type DashboardMetrics, type CategoryStats } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [metricsData, categoriesData] = await Promise.all([
          getDashboardMetrics(),
          getCategoryStats()
        ])
        setMetrics(metricsData)
        setCategoryStats(categoriesData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workout_created':
        return <Calendar className="h-4 w-4 text-blue-500" />
      case 'user_registered':
        return <Users className="h-4 w-4 text-green-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getRelativeTime = (date: string) => {
    const now = new Date()
    const activityDate = new Date(date)
    const diffInHours = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Hace menos de 1 hora'
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`
    
    return format(activityDate, 'dd/MM/yyyy', { locale: es })
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/workouts">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Entrenamiento
            </Link>
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Entrenamientos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalWorkouts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.workoutsThisWeek || 0} esta semana
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Este Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.workoutsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              entrenamientos programados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categorías Activas
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.categoriesUsed || 0}</div>
            <p className="text-xs text-muted-foreground">
              categorías en uso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total RM
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPersonalRecords || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.personalRecordsThisMonth || 0} este mes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
              categoryStats.slice(0, 5).map((stat) => (
                <div key={stat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                    <span className="font-medium">{stat.label}</span>
                  </div>
                  <Badge variant="secondary">{stat.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay entrenamientos registrados aún
              </p>
            )}
            {categoryStats.length > 5 && (
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/admin/analytics/categories">
                  Ver todas las categorías
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Ejercicios más populares con RM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight className="h-5 w-5" />
              Ejercicios RM Populares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics?.topExercises && metrics.topExercises.length > 0 ? (
              metrics.topExercises.map((exercise) => (
                <div key={exercise.exercise_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="font-medium text-sm">{exercise.exercise_name}</span>
                  </div>
                  <Badge variant="secondary">{exercise.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay RM registrados aún
              </p>
            )}
            {metrics?.heaviestRecord && (
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-2">RM más pesado:</p>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{metrics.heaviestRecord.exercise_name}</span>
                  <Badge variant="default">{metrics.heaviestRecord.weight_kg}kg</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
              metrics.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTime(activity.date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay actividad reciente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/workouts">
                <Calendar className="h-6 w-6" />
                <span>Gestionar Entrenamientos</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/users">
                <Users className="h-6 w-6" />
                <span>Gestionar Usuarios</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/categories">
                <Tag className="h-6 w-6" />
                <span>Gestionar Categorías</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/rm">
                <Trophy className="h-6 w-6" />
                <span>Gestionar RM</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/analytics">
                <BarChart3 className="h-6 w-6" />
                <span>Ver Estadísticas</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 