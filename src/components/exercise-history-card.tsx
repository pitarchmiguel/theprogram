'use client'

import { useState } from 'react'
import { ExerciseHistory, PersonalRecord, deletePersonalRecord } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PersonalRecordForm } from './personal-record-form'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ChevronDown, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Weight, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  Plus,
  Target
} from 'lucide-react'

interface ExerciseHistoryCardProps {
  exerciseHistory: ExerciseHistory
  onRecordsChange: () => void
}

export function ExerciseHistoryCard({ exerciseHistory, onRecordsChange }: ExerciseHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<PersonalRecord | null>(null)
  const [isDeletingRecord, setIsDeletingRecord] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const { exercise_name, current_pr, latest_attempt, total_attempts, records, progression } = exerciseHistory

  const handleEditRecord = (record: PersonalRecord) => {
    setEditingRecord(record)
    setIsFormOpen(true)
    setIsAddingNew(false)
  }

  const handleAddNewRecord = () => {
    setEditingRecord(null)
    setIsFormOpen(true) 
    setIsAddingNew(true)
  }

  const handleDeleteRecord = (record: PersonalRecord) => {
    setRecordToDelete(record)
  }

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return

    setIsDeletingRecord(true)
    try {
      await deletePersonalRecord(recordToDelete.id)
      toast.success('Registro eliminado correctamente')
      onRecordsChange()
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el registro')
    } finally {
      setIsDeletingRecord(false)
      setRecordToDelete(null)
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingRecord(null)
    setIsAddingNew(false)
  }

  const handleFormSuccess = () => {
    onRecordsChange()
  }

  const isNewPr = current_pr.id === latest_attempt.id && progression.weight_improvement > 0
  const isRecent = progression.days_since_last_pr <= 7

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-2">{exercise_name}</CardTitle>
              
              {/* RM Actual */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <Weight className="h-5 w-5 text-primary" />
                  <span className="font-bold text-2xl text-primary">{current_pr.weight_kg}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
                
                {/* Badges de estado */}
                <div className="flex gap-1">
                  {isNewPr && (
                    <Badge variant="default" className="text-xs">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      ¡Nuevo RM!
                    </Badge>
                  )}
                  {isRecent && !isNewPr && (
                    <Badge variant="secondary" className="text-xs">
                      Reciente
                    </Badge>
                  )}
                  {progression.weight_improvement > 0 && (
                    <Badge variant="outline" className="text-xs">
                      +{progression.weight_improvement}kg ({progression.weight_improvement_percentage}%)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(current_pr.date_achieved), 'dd MMM yyyy', { locale: es })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{total_attempts} intentos</span>
                </div>
              </div>
            </div>

            {/* Botón de opciones */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAddNewRecord}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo intento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditRecord(current_pr)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar RM actual
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Historial colapsable */}
        {total_attempts > 1 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <div className="px-6">
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-sm">Ver historial ({total_attempts} registros)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {records.map((record) => {
                    const isCurrentPr = record.id === current_pr.id
                    const isLatestAttempt = record.id === latest_attempt.id
                    const recordDate = new Date(record.date_achieved)
                    
                    return (
                      <div 
                        key={record.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isCurrentPr ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${isCurrentPr ? 'text-primary' : ''}`}>
                              {record.weight_kg}kg
                            </span>
                            
                            <div className="flex gap-1">
                              {isCurrentPr && (
                                <Badge variant="default" className="text-xs">
                                  <Target className="mr-1 h-3 w-3" />
                                  RM Actual
                                </Badge>
                              )}
                              {isLatestAttempt && !isCurrentPr && (
                                <Badge variant="secondary" className="text-xs">
                                  Último intento
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(recordDate, 'dd MMM yyyy', { locale: es })}</span>
                            {record.notes && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[200px]">{record.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRecord(record)}>
                              <Edit className="mr-2 h-3 w-3" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRecord(record)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        )}

      </Card>

      {/* Formulario de edición/creación */}
      <PersonalRecordForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingRecord={editingRecord}
        defaultExercise={isAddingNew ? exercise_name : undefined}
      />

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el registro de <strong>{recordToDelete?.exercise_name}</strong> 
              ({recordToDelete?.weight_kg}kg del {recordToDelete && format(new Date(recordToDelete.date_achieved), 'dd/MM/yyyy')}). 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRecord}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRecord}
              disabled={isDeletingRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingRecord ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 