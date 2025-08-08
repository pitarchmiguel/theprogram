'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calculator } from 'lucide-react'

interface RMCalculatorProps {
  exerciseTitle?: string
  onTableData?: (data: { percentages: number[], weights: string[] } | null) => void
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
                <span className="text-sm font-semibold">{weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RMCalculator({ onTableData }: RMCalculatorProps) {
  const [maxWeight, setMaxWeight] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Porcentajes: 70, 75, 80, 85, 90, 95, 100
  const percentages = [70, 75, 80, 85, 90, 95, 100]

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      setMaxWeight('')
      onTableData?.(null)
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