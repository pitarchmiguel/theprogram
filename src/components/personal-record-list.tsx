'use client'

import { useState } from 'react'
import { PersonalRecord, deletePersonalRecord } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PersonalRecordForm } from './personal-record-form'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MoreVertical, Edit, Trash2, Weight, Calendar, StickyNote, TrendingUp } from 'lucide-react'

interface PersonalRecordListProps {
  records: PersonalRecord[]
  onRecordsChange: () => void
  emptyMessage?: string
}

export function PersonalRecordList({ records, onRecordsChange, emptyMessage }: PersonalRecordListProps) {
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<PersonalRecord | null>(null)
  const [isDeletingRecord, setIsDeletingRecord] = useState(false)

  const handleEditRecord = (record: PersonalRecord) => {
    setEditingRecord(record)
    setIsFormOpen(true)
  }

  const handleDeleteRecord = (record: PersonalRecord) => {
    setRecordToDelete(record)
  }

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return

    setIsDeletingRecord(true)
    try {
      await deletePersonalRecord(recordToDelete.id)
      toast.success('RM eliminado correctamente')
      onRecordsChange()
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el RM')
    } finally {
      setIsDeletingRecord(false)
      setRecordToDelete(null)
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingRecord(null)
  }

  const handleFormSuccess = () => {
    onRecordsChange()
  }

  // Obtener el RM más reciente y más pesado para destacarlos
  const latestRecord = records.length > 0 
    ? records.reduce((latest, current) => 
        new Date(current.date_achieved) > new Date(latest.date_achieved) ? current : latest
      )
    : null

  const heaviestRecord = records.length > 0
    ? records.reduce((heaviest, current) => 
        current.weight_kg > heaviest.weight_kg ? current : heaviest
      )
    : null

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <Weight className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {emptyMessage || 'No tienes RM registrados todavía'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => {
          const isLatest = latestRecord?.id === record.id
          const isHeaviest = heaviestRecord?.id === record.id
          const recordDate = new Date(record.date_achieved)
          const isRecent = (Date.now() - recordDate.getTime()) < (30 * 24 * 60 * 60 * 1000) // 30 días

          return (
            <Card key={record.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{record.exercise_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-2xl">{record.weight_kg}</span>
                        <span className="text-sm text-muted-foreground">kg</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditRecord(record)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteRecord(record)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Fecha */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(recordDate, 'dd MMM yyyy', { locale: es })}</span>
                  </div>

                  {/* Badges especiales */}
                  <div className="flex flex-wrap gap-1">
                    {isLatest && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Más reciente
                      </Badge>
                    )}
                    {isHeaviest && (
                      <Badge variant="default" className="text-xs">
                        <Weight className="mr-1 h-3 w-3" />
                        Más pesado
                      </Badge>
                    )}
                    {isRecent && !isLatest && (
                      <Badge variant="outline" className="text-xs">
                        Reciente
                      </Badge>
                    )}
                  </div>

                  {/* Notas */}
                  {record.notes && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <StickyNote className="h-3 w-3" />
                        <span className="text-xs font-medium">Notas:</span>
                      </div>
                      <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                        {record.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Formulario de edición */}
      <PersonalRecordForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingRecord={editingRecord}
      />

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar RM?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el RM de <strong>{recordToDelete?.exercise_name}</strong> 
              ({recordToDelete?.weight_kg}kg). Esta acción no se puede deshacer.
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