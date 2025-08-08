'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calculator } from 'lucide-react'

interface RMCalculatorProps {
  exerciseTitle?: string
  onTableData?: (data: { percentages: number[], weights: string[] } | null) => void
  blockId?: string
}

interface PercentagesTableProps {
  percentages: number[]
  weights: string[]
}

export function PercentagesTable({ percentages, weights }: PercentagesTableProps) {
  return (
    <Card className="border-0 shadow-none bg-background/50">
      <CardContent className="p-0">
        <div className="w-full">
          <div className="grid grid-cols-7 gap-6">
            {percentages.map((p) => (
              <div key={`p-${p}`} className="text-center text-sm font-medium text-muted-foreground">
                {p}%
              </div>
            ))}
            {weights.map((weight, index) => (
              <div key={`w-${percentages[index]}`} className="text-center">
                <span className="text-sm font-semibold text-center">{weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RMCalculator({ onTableData, blockId }: RMCalculatorProps) {
  const [maxWeight, setMaxWeight] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Porcentajes: 70, 75, 80, 85, 90, 95, 100
  const percentages = useMemo(() => [70, 75, 80, 85, 90, 95, 100], [])

  // Generar una clave única para localStorage basada en el blockId
  const storageKey = useMemo(() => blockId ? `rm-calculator-${blockId}` : 'rm-calculator-default', [blockId])

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        if (parsedData.maxWeight && parsedData.isExpanded !== undefined) {
          setMaxWeight(parsedData.maxWeight)
          setIsExpanded(parsedData.isExpanded)
          
          // Calcular y enviar los pesos si hay un peso guardado
          const numValue = parseFloat(parsedData.maxWeight)
          if (!isNaN(numValue) && numValue > 0) {
            const weights = percentages.map(p => {
              const calculatedWeight = (numValue * p) / 100
              return calculatedWeight.toFixed(1)
            })
            onTableData?.({ percentages, weights })
          }
        }
      } catch (error) {
        console.error('Error loading saved RM data:', error)
      }
    }
  }, [storageKey, onTableData, percentages])

  // Guardar datos cuando cambien
  useEffect(() => {
    const dataToSave = {
      maxWeight,
      isExpanded
    }
    localStorage.setItem(storageKey, JSON.stringify(dataToSave))
  }, [maxWeight, isExpanded, storageKey])

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      setMaxWeight('')
      onTableData?.(null)
      // Limpiar datos guardados cuando se cierra
      localStorage.removeItem(storageKey)
    }
  }

  const handleWeightChange = (value: string) => {
    setMaxWeight(value)
    const numValue = parseFloat(value)
    if (value && !isNaN(numValue) && numValue > 0) {
      const weights = percentages.map(p => {
        const calculatedWeight = (numValue * p) / 100
        return calculatedWeight.toFixed(1)
      })
      onTableData?.({ percentages, weights })
    } else {
      onTableData?.(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="h-7 w-7 p-0"
      >
        <Calculator className="h-3 w-3" />
      </Button>
      
      {isExpanded && (
        <Input
          type="number"
          step="0.5"
          min="0"
          value={maxWeight}
          onChange={(e) => handleWeightChange(e.target.value)}
          placeholder="RM"
          className="w-20 h-7 text-center text-sm font-semibold"
        />
      )}
    </div>
  )
} 