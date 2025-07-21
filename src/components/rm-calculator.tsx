'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calculator, Trophy } from 'lucide-react'

interface RMCalculatorProps {
  exerciseTitle: string
  blockLetter: string
}

export function RMCalculator({ exerciseTitle, blockLetter }: RMCalculatorProps) {
  const [maxWeight, setMaxWeight] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Generar porcentajes del 50% al 100% en incrementos de 5%
  const percentages = Array.from({ length: 11 }, (_, i) => 50 + i * 5)

  const calculateWeight = (percentage: number) => {
    const weight = parseFloat(maxWeight)
    if (isNaN(weight) || weight <= 0) return '---'
    return ((weight * percentage) / 100).toFixed(1)
  }

  const getIntensityColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 85) return 'bg-orange-500'
    if (percentage >= 75) return 'bg-yellow-500'
    if (percentage >= 65) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getIntensityLabel = (percentage: number) => {
    if (percentage >= 95) return 'Máxima'
    if (percentage >= 85) return 'Muy Alta'
    if (percentage >= 75) return 'Alta'
    if (percentage >= 65) return 'Moderada'
    return 'Ligera'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0">
          <Calculator className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sm:top-[10%] top-[5%] translate-y-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[5%] data-[state=open]:slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Calculadora de 1RM
          </DialogTitle>
          <DialogDescription>
            Bloque {blockLetter}: {exerciseTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input para el peso máximo */}
          <div className="space-y-2">
            <Label htmlFor="max-weight">Tu peso máximo (1RM) en kg</Label>
            <Input
              id="max-weight"
              type="number"
              step="0.5"
              min="0"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              placeholder="Ej: 100"
              className="text-center text-lg font-semibold"
            />
          </div>

          {/* Tabla de porcentajes */}
          {maxWeight && parseFloat(maxWeight) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Porcentajes de trabajo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <div>Porcentaje</div>
                  <div className="text-center">Peso</div>
                  <div className="text-center">Intensidad</div>
                </div>
                
                {percentages.map((percentage) => {
                  const weight = calculateWeight(percentage)
                  const intensityColor = getIntensityColor(percentage)
                  const intensityLabel = getIntensityLabel(percentage)
                  
                  return (
                    <div key={percentage} className="grid grid-cols-3 gap-2 items-center py-1">
                      <div className="font-semibold text-sm">
                        {percentage}%
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-bold">
                          {weight} kg
                        </span>
                      </div>
                      <div className="text-center">
                        <Badge 
                          className={`text-white text-xs ${intensityColor}`}
                          variant="secondary"
                        >
                          {intensityLabel}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Información adicional */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>💡 Uso recomendado:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>50-65%:</strong> Calentamiento y técnica</li>
              <li><strong>70-80%:</strong> Trabajo de fuerza</li>
              <li><strong>85-95%:</strong> Trabajo de máximos</li>
              <li><strong>100%:</strong> Test de 1RM</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 