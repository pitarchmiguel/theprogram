'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Settings, AlertTriangle, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WORKOUT_CATEGORIES, createCustomCategory, deleteCustomCategory, loadCustomCategories } from '@/lib/supabase'
import { toast } from 'sonner'

const AVAILABLE_COLORS = [
  { name: 'Azul', class: 'bg-blue-500' },
  { name: 'Rojo', class: 'bg-red-500' },
  { name: 'Verde', class: 'bg-green-500' },
  { name: 'Púrpura', class: 'bg-purple-500' },
  { name: 'Amarillo', class: 'bg-yellow-500' },
  { name: 'Rosa', class: 'bg-pink-500' },
  { name: 'Índigo', class: 'bg-indigo-500' },
  { name: 'Naranja', class: 'bg-orange-500' },
  { name: 'Teal', class: 'bg-teal-500' },
  { name: 'Cian', class: 'bg-cyan-500' },
  { name: 'Lime', class: 'bg-lime-500' },
  { name: 'Esmeralda', class: 'bg-emerald-500' },
]

interface CategoryManagerProps {
  onCategoriesChange?: () => void
}

export function CategoryManager({ onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState(WORKOUT_CATEGORIES)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  
  // Form state
  const [newCategory, setNewCategory] = useState({
    value: '',
    label: '',
    color: AVAILABLE_COLORS[0].class
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      await loadCustomCategories()
      setCategories([...WORKOUT_CATEGORIES])
      setTableExists(true)
    } catch (error) {
      console.error('Error loading categories:', error)
      setTableExists(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.value.trim() || !newCategory.label.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    try {
      setIsCreating(true)
      await createCustomCategory(
        newCategory.value.trim(),
        newCategory.label.trim(),
        newCategory.color
      )
      
      toast.success('Categoría creada exitosamente')
      setNewCategory({ value: '', label: '', color: AVAILABLE_COLORS[0].class })
      setIsDialogOpen(false)
      
      // Recargar categorías
      await loadCategories()
      onCategoriesChange?.()
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear categoría'
      toast.error(message)
      
      // Si es error de tabla no existe, actualizar estado
      if (message.includes('tabla de categorías personalizadas no existe')) {
        setTableExists(false)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCustomCategory(categoryId)
      toast.success('Categoría eliminada')
      
      // Recargar categorías
      await loadCategories()
      onCategoriesChange?.()
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar categoría'
      toast.error(message)
    }
  }

  const customCategories = categories.filter(cat => 'isDefault' in cat && !cat.isDefault)
  const defaultCategories = categories.filter(cat => !('isDefault' in cat) || cat.isDefault)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestionar Categorías
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si la tabla no existe, mostrar instrucciones de configuración
  if (!tableExists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestionar Categorías
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuración Requerida:</strong> La tabla de categorías personalizadas no existe aún.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">📋 Instrucciones de configuración:</h4>
            
            <div className="space-y-2 text-sm bg-muted p-3 rounded-lg">
              <p><strong>Opción 1 - Automática (Recomendada):</strong></p>
              <div className="bg-black text-green-400 p-2 rounded font-mono text-xs">
                npm run setup-db
              </div>
              
              <p className="mt-3"><strong>Opción 2 - Manual:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ve a tu dashboard de Supabase</li>
                <li>Abre el SQL Editor</li>
                <li>Ejecuta el contenido del archivo <code>scripts/setup-categories.sql</code></li>
              </ol>
            </div>

            <Button 
              onClick={loadCategories}
              variant="outline"
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              Verificar configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestionar Categorías
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                <DialogDescription>
                  Añade una nueva categoría personalizada para organizar tus entrenamientos.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-value">Código de la categoría *</Label>
                  <Input
                    id="category-value"
                    placeholder="Ej: CARDIO"
                    value={newCategory.value}
                    onChange={(e) => setNewCategory(prev => ({ 
                      ...prev, 
                      value: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
                    }))}
                    maxLength={15}
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo letras y números, máximo 15 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-label">Nombre completo *</Label>
                  <Input
                    id="category-label"
                    placeholder="Ej: Ejercicios Cardiovasculares"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                    maxLength={50}
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color.class}
                        type="button"
                        className={`w-8 h-8 rounded-full ${color.class} ${
                          newCategory.color === color.class 
                            ? 'ring-2 ring-offset-2 ring-ring' 
                            : 'hover:scale-110'
                        } transition-all`}
                        onClick={() => setNewCategory(prev => ({ ...prev, color: color.class }))}
                        disabled={isCreating}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vista previa</Label>
                  <Badge className={`${newCategory.color} text-white`}>
                    {newCategory.value || 'EJEMPLO'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={isCreating || !newCategory.value.trim() || !newCategory.label.trim()}
                >
                  {isCreating ? 'Creando...' : 'Crear Categoría'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Categorías predefinidas */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Categorías del sistema
          </h4>
          <div className="flex flex-wrap gap-2">
            {defaultCategories.map((category) => (
              <Badge
                key={category.value}
                variant="secondary"
                className={`${category.color} text-white`}
              >
                {category.value}
              </Badge>
            ))}
          </div>
        </div>

        {/* Categorías personalizadas */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Categorías personalizadas ({customCategories.length})
          </h4>
          {customCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay categorías personalizadas. ¡Crea la primera!
            </p>
          ) : (
            <div className="space-y-2">
              {customCategories.map((category) => (
                <div
                  key={category.value}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${category.color}`} />
                    <div>
                      <span className="font-medium text-sm">{category.value}</span>
                      <p className="text-xs text-muted-foreground">{category.label}</p>
                    </div>
                  </div>
                  
                  {'id' in category && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará la categoría &quot;{category.value}&quot; permanentemente. 
                            Los workouts que usen esta categoría ya no mostrarán la categoría.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 