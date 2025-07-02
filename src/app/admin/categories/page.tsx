'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Edit, Palette } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  DEFAULT_WORKOUT_CATEGORIES, 
  WORKOUT_CATEGORIES, 
  loadCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  type CustomCategory 
} from '@/lib/supabase'

const COLOR_OPTIONS = [
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Rojo', value: 'bg-red-500' },
  { label: 'Verde', value: 'bg-green-500' },
  { label: 'Púrpura', value: 'bg-purple-500' },
  { label: 'Amarillo', value: 'bg-yellow-500' },
  { label: 'Rosa', value: 'bg-pink-500' },
  { label: 'Índigo', value: 'bg-indigo-500' },
  { label: 'Teal', value: 'bg-teal-500' },
  { label: 'Orange', value: 'bg-orange-500' },
  { label: 'Gris', value: 'bg-gray-500' },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(WORKOUT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<CustomCategory | null>(null)
  
  // Form states
  const [newCategoryValue, setNewCategoryValue] = useState('')
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_OPTIONS[0].value)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true)
        await loadCustomCategories()
        setCategories([...WORKOUT_CATEGORIES])
      } catch (error) {
        console.error('Error loading categories:', error)
        toast.error('Error al cargar categorías')
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCategoryValue.trim() || !newCategoryLabel.trim()) {
      toast.error('Todos los campos son requeridos')
      return
    }

    try {
      setIsSubmitting(true)
      await createCustomCategory(newCategoryValue.trim(), newCategoryLabel.trim(), newCategoryColor)
      
      // Recargar categorías
      await loadCustomCategories()
      setCategories([...WORKOUT_CATEGORIES])
      
      // Limpiar formulario
      setNewCategoryValue('')
      setNewCategoryLabel('')
      setNewCategoryColor(COLOR_OPTIONS[0].value)
      setIsCreateDialogOpen(false)
      
      toast.success('Categoría creada correctamente')
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear categoría')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !('id' in categoryToDelete)) return

    try {
      await deleteCustomCategory(categoryToDelete.id)
      
      // Recargar categorías
      await loadCustomCategories()
      setCategories([...WORKOUT_CATEGORIES])
      
      setCategoryToDelete(null)
      toast.success('Categoría eliminada correctamente')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Error al eliminar categoría')
    }
  }

  const defaultCategories = categories.filter(cat => 'isDefault' in cat ? cat.isDefault : true)
  const customCategories = categories.filter(cat => 'isDefault' in cat ? !cat.isDefault : false) as CustomCategory[]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="grid gap-4 md:grid-cols-2">
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Categorías</h1>
          <p className="text-muted-foreground">
            Gestiona las categorías de entrenamientos disponibles
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Categoría</DialogTitle>
              <DialogDescription>
                Añade una nueva categoría personalizada para los entrenamientos
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-value">Código de categoría</Label>
                <Input
                  id="category-value"
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(e.target.value.toUpperCase())}
                  placeholder="Ej: CARDIO, MOBILITY..."
                  className="uppercase"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category-label">Nombre de categoría</Label>
                <Input
                  id="category-label"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="Ej: Cardiovascular, Movilidad..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewCategoryColor(color.value)}
                      className={`
                        h-10 w-full rounded-md border-2 transition-all
                        ${color.value}
                        ${newCategoryColor === color.value 
                          ? 'border-foreground scale-105' 
                          : 'border-transparent hover:border-muted-foreground'
                        }
                      `}
                      title={color.label}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Color seleccionado: {COLOR_OPTIONS.find(c => c.value === newCategoryColor)?.label}
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando...
                    </>
                  ) : (
                    'Crear Categoría'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categorías predeterminadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Categorías Predeterminadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {defaultCategories.map((category) => (
              <div
                key={category.value}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${category.color}`} />
                  <div>
                    <div className="font-medium">{category.value}</div>
                    <div className="text-sm text-muted-foreground">{category.label}</div>
                  </div>
                </div>
                <Badge variant="secondary">Sistema</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categorías personalizadas */}
      <Card>
        <CardHeader>
          <CardTitle>Categorías Personalizadas</CardTitle>
        </CardHeader>
        <CardContent>
          {customCategories.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {customCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${category.color}`} />
                    <div>
                      <div className="font-medium">{category.value}</div>
                      <div className="text-sm text-muted-foreground">{category.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">Personalizada</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setCategoryToDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay categorías personalizadas aún</p>
              <p className="text-sm">Crea una nueva categoría personalizada para empezar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar la categoría{" "}
              <strong>{categoryToDelete?.label}</strong>? Esta acción no se puede deshacer.
              <br />
              <br />
              <span className="text-destructive text-sm">
                Los entrenamientos que usan esta categoría mantendrán la referencia, 
                pero la categoría ya no estará disponible para nuevos entrenamientos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 