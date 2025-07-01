'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Filter, X, CalendarDays, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WORKOUT_CATEGORIES, type WorkoutCategory, loadCustomCategories } from '@/lib/supabase'
import { CategoryStatsDisplay } from './category-stats'

export interface AdvancedFilterOptions {
  startDate?: string
  endDate?: string
  categories: WorkoutCategory[]
  dateRange?: 'week' | 'month' | 'custom'
}

interface AdvancedFilterProps {
  filters: AdvancedFilterOptions
  onFiltersChange: (filters: AdvancedFilterOptions) => void
  showStats?: boolean
  className?: string
  compact?: boolean
}

const DATE_PRESETS = [
  { 
    label: 'Esta semana', 
    value: 'week' as const,
    getRange: () => {
      const now = new Date()
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      }
    }
  },
  { 
    label: 'Este mes', 
    value: 'month' as const,
    getRange: () => {
      const now = new Date()
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
      }
    }
  },
  { 
    label: 'Mes pasado', 
    value: 'last-month' as const,
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      }
    }
  },
]

export function AdvancedFilter({ filters, onFiltersChange, showStats = true, className, compact = false }: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [categories, setCategories] = useState(WORKOUT_CATEGORIES)
  const [customStartDate, setCustomStartDate] = useState(filters.startDate || '')
  const [customEndDate, setCustomEndDate] = useState(filters.endDate || '')

  useEffect(() => {
    const loadCategories = async () => {
      try {
        await loadCustomCategories()
        setCategories([...WORKOUT_CATEGORIES])
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }
    loadCategories()
  }, [])

  const hasActiveFilters = filters.categories.length > 0 || filters.startDate || filters.endDate

  const toggleCategory = (category: WorkoutCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]
    
    onFiltersChange({ ...filters, categories: newCategories })
  }

  const setDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const range = preset.getRange()
    onFiltersChange({
      ...filters,
      startDate: range.start,
      endDate: range.end,
      dateRange: preset.value as 'week' | 'month'
    })
    setCustomStartDate(range.start)
    setCustomEndDate(range.end)
  }

  const setCustomDateRange = () => {
    onFiltersChange({
      ...filters,
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
      dateRange: 'custom'
    })
  }

  const clearFilters = () => {
    onFiltersChange({ categories: [] })
    setCustomStartDate('')
    setCustomEndDate('')
  }

  const clearDateFilter = () => {
    onFiltersChange({
      ...filters,
      startDate: undefined,
      endDate: undefined,
      dateRange: undefined
    })
    setCustomStartDate('')
    setCustomEndDate('')
  }

  return (
    <div className={className}>
      {/* Estadísticas cuando hay filtros activos */}
      {showStats && hasActiveFilters && !compact && (
        <CategoryStatsDisplay 
          startDate={filters.startDate}
          endDate={filters.endDate}
          compact={true}
          className="mb-4"
        />
      )}

      {/* Botón principal de filtros */}
      <div className="flex items-center justify-between">
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {compact ? (
            <>
              <span className="hidden sm:inline">Filtros</span>
            </>
          ) : (
            "Filtros avanzados"
          )}
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
              {(filters.categories.length || 0) + (filters.startDate || filters.endDate ? 1 : 0)}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && !compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Limpiar todo
          </Button>
        )}
      </div>

      {/* Panel de filtros expandible */}
      {isExpanded && (
        <Card className={`mt-2 ${compact ? 'absolute right-0 top-full z-50 w-80' : ''}`}>
          <CardContent className="p-4 space-y-4">
            
            {/* Filtros de fecha */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Rango de fechas
                </h4>
                {(filters.startDate || filters.endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateFilter}
                    className="gap-1 text-muted-foreground text-xs"
                  >
                    <X className="h-3 w-3" />
                    Limpiar fechas
                  </Button>
                )}
              </div>

              {/* Presets de fecha */}
              <div className="grid grid-cols-3 gap-2">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setDatePreset(preset)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Fechas personalizadas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="start-date" className="text-xs">Fecha inicio</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-date" className="text-xs">Fecha fin</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {(customStartDate || customEndDate) && (
                <Button
                  onClick={setCustomDateRange}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                >
                  Aplicar rango personalizado
                </Button>
              )}
            </div>

            {/* Filtros de categoría */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Categorías
                </h4>
                {filters.categories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFiltersChange({ ...filters, categories: [] })}
                    className="gap-1 text-muted-foreground text-xs"
                  >
                    <X className="h-3 w-3" />
                    Limpiar categorías
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => {
                  const isSelected = filters.categories.includes(category.value)
                  return (
                    <Button
                      key={category.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCategory(category.value)}
                      className="justify-start gap-2 h-auto py-2"
                    >
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <div className="text-left">
                        <div className="font-medium text-xs">{category.value}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Botón limpiar todo en modo compacto */}
            {compact && hasActiveFilters && (
              <div className="border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full gap-1 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                  Limpiar todos los filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros activos en vista compacta */}
      {hasActiveFilters && !isExpanded && !compact && (
        <div className="flex flex-wrap gap-2 mt-2">
          {/* Filtro de fecha */}
          {(filters.startDate || filters.endDate) && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {filters.startDate && filters.endDate 
                ? `${format(new Date(filters.startDate), 'dd/MM', { locale: es })} - ${format(new Date(filters.endDate), 'dd/MM', { locale: es })}`
                : filters.startDate 
                  ? `Desde ${format(new Date(filters.startDate), 'dd/MM', { locale: es })}`
                  : `Hasta ${format(new Date(filters.endDate!), 'dd/MM', { locale: es })}`
              }
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={clearDateFilter}
              />
            </Badge>
          )}
          
          {/* Filtros de categoría */}
          {filters.categories.map((category) => {
            const categoryInfo = categories.find(c => c.value === category)
            if (!categoryInfo) return null
            
            return (
              <Badge
                key={category}
                variant="secondary"
                className={`${categoryInfo.color} text-white cursor-pointer`}
                onClick={() => toggleCategory(category)}
              >
                {category}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )
          })}
        </div>
      )}

      {/* Estadísticas en una posición diferente para modo compacto */}
      {showStats && hasActiveFilters && compact && isExpanded && (
        <div className="mt-2">
          <CategoryStatsDisplay 
            startDate={filters.startDate}
            endDate={filters.endDate}
            compact={true}
          />
        </div>
      )}
    </div>
  )
} 