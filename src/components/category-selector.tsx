'use client'

import { useEffect, useState } from 'react'
import { WORKOUT_CATEGORIES, type WorkoutCategory, loadCustomCategories } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

interface CategorySelectorProps {
  value?: WorkoutCategory
  onValueChange: (value: WorkoutCategory | undefined) => void
  disabled?: boolean
  placeholder?: string
  id?: string
  label?: string
}

export function CategorySelector({ 
  value, 
  onValueChange, 
  disabled = false, 
  placeholder = "Seleccionar categoría",
  id,
  label 
}: CategorySelectorProps) {
  const [categories, setCategories] = useState(WORKOUT_CATEGORIES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        await loadCustomCategories()
        setCategories([...WORKOUT_CATEGORIES])
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [])

  const selectedCategory = categories.find(cat => cat.value === value)

  if (isLoading) {
    return (
      <div className="space-y-1">
        {label && (
          <Label htmlFor={id} className="text-xs">
            {label}
          </Label>
        )}
        <div className="h-10 w-full rounded-md border border-input bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {label && (
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
      )}
      <Select 
        value={value} 
        onValueChange={(val) => onValueChange(val === 'none' ? undefined : val as WorkoutCategory)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full ${selectedCategory.color} text-white text-xs font-bold flex items-center justify-center`}>
                  {getCategoryInitial(selectedCategory.value)}
                </div>
                <span className="text-sm font-medium">{selectedCategory.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Sin categoría</span>
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full ${category.color} text-white text-xs font-bold flex items-center justify-center`}>
                  {getCategoryInitial(category.value)}
                </div>
                <span className="font-medium">{category.label}</span>
                {'isDefault' in category && !category.isDefault && (
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    Custom
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Componente para mostrar la categoría como badge
interface CategoryBadgeProps {
  category?: WorkoutCategory
  size?: 'sm' | 'default'
}

// Función para obtener la inicial de una categoría
function getCategoryInitial(category: string): string {
  const categoryMap: Record<string, string> = {
    'OLY': 'O',
    'METCON': 'M', 
    'STRENGTH': 'S',
    'GYMNASTICS': 'G'
  }
  
  // Si es una categoría conocida, usar el mapeo
  if (categoryMap[category]) {
    return categoryMap[category]
  }
  
  // Para categorías personalizadas, usar la primera letra
  return category.charAt(0).toUpperCase()
}

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  if (!category) return null
  
  const categoryInfo = WORKOUT_CATEGORIES.find(cat => cat.value === category)
  if (!categoryInfo) return null

  const initial = getCategoryInitial(category)
  const circleSize = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'

  return (
    <div 
      className={`${circleSize} rounded-full ${categoryInfo.color} text-white font-bold flex items-center justify-center`}
      title={`${category} (${categoryInfo.label})`}
    >
      {initial}
    </div>
  )
} 