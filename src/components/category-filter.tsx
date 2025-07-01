'use client'

import { useState } from 'react'
import { WORKOUT_CATEGORIES, type WorkoutCategory } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface CategoryFilterProps {
  selectedCategories: WorkoutCategory[]
  onCategoriesChange: (categories: WorkoutCategory[]) => void
  className?: string
}

export function CategoryFilter({ selectedCategories, onCategoriesChange, className }: CategoryFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCategory = (category: WorkoutCategory) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  const clearFilters = () => {
    onCategoriesChange([])
  }

  const hasActiveFilters = selectedCategories.length > 0

  return (
    <div className={className}>
      {/* Botón para expandir/contraer filtros */}
      <div className="flex items-center justify-between">
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtrar por categoría
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
              {selectedCategories.length}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Panel de filtros expandible */}
      {isExpanded && (
        <Card className="mt-2">
          <CardContent className="p-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Categorías</h4>
              <div className="grid grid-cols-2 gap-2">
                {WORKOUT_CATEGORIES.map((category) => {
                  const isSelected = selectedCategories.includes(category.value)
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
                        <div className="text-xs opacity-75">{category.label}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categorías seleccionadas en vista compacta */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedCategories.map((category) => {
            const categoryInfo = WORKOUT_CATEGORIES.find(c => c.value === category)
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
    </div>
  )
} 