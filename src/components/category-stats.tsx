'use client'

import { useEffect, useState } from 'react'
import { getCategoryStats, type CategoryStats } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CategoryStatsDisplayProps {
  startDate?: string
  endDate?: string
  className?: string
  title?: string
  compact?: boolean
}

export function CategoryStatsDisplay({ 
  startDate, 
  endDate, 
  className,
  title = "Estadísticas por Categoría",
  compact = false
}: CategoryStatsDisplayProps) {
  const [stats, setStats] = useState<CategoryStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getCategoryStats(startDate, endDate)
        setStats(data)
      } catch (err) {
        console.error('Error loading category stats:', err)
        setError('Error al cargar estadísticas')
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [startDate, endDate])

  const totalWorkouts = stats.reduce((sum, stat) => sum + stat.count, 0)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 animate-pulse" />
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (stats.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            No hay entrenamientos en el período seleccionado
          </p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className={`${className} space-y-2`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          <span>Entrenamientos por categoría</span>
          {(startDate || endDate) && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {startDate && endDate 
                ? `${format(new Date(startDate), 'dd/MM', { locale: es })} - ${format(new Date(endDate), 'dd/MM', { locale: es })}`
                : startDate 
                  ? `Desde ${format(new Date(startDate), 'dd/MM/yyyy', { locale: es })}`
                  : `Hasta ${format(new Date(endDate!), 'dd/MM/yyyy', { locale: es })}`
              }
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <Badge
              key={stat.category}
              variant="secondary"
              className={`${stat.color} text-white`}
            >
              {stat.category}: {stat.count}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {totalWorkouts} entrenamientos
          </Badge>
        </div>
        {(startDate || endDate) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {startDate && endDate 
              ? `${format(new Date(startDate), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(endDate), 'dd/MM/yyyy', { locale: es })}`
              : startDate 
                ? `Desde ${format(new Date(startDate), 'dd/MM/yyyy', { locale: es })}`
                : `Hasta ${format(new Date(endDate!), 'dd/MM/yyyy', { locale: es })}`
            }
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((stat) => {
            const percentage = totalWorkouts > 0 ? Math.round((stat.count / totalWorkouts) * 100) : 0
            return (
              <div key={stat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                    <span className="font-medium">{stat.category}</span>
                    <span className="text-muted-foreground">({stat.label})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{stat.count}</span>
                    <span className="text-xs text-muted-foreground">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${stat.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 