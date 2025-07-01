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
                <div className={`w-3 h-3 rounded-full ${selectedCategory.color}`} />
                <span className="text-sm font-medium">{selectedCategory.value}</span>
                <span className="text-xs text-muted-foreground">({selectedCategory.label})</span>
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
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <span className="font-medium">{category.value}</span>
                <span className="text-xs text-muted-foreground">({category.label})</span>
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

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  if (!category) return null
  
  const categoryInfo = WORKOUT_CATEGORIES.find(cat => cat.value === category)
  if (!categoryInfo) return null

  return (
    <Badge 
      variant="secondary" 
      className={`${categoryInfo.color} text-white font-medium ${size === 'sm' ? 'text-xs px-2 py-0' : ''}`}
    >
      {category}
    </Badge>
  )
} 