import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'destructive'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

const colorClasses = {
  primary: 'border-primary',
  white: 'border-white',
  destructive: 'border-destructive'
}

export function Spinner({ size = 'md', color = 'primary', className }: SpinnerProps) {
  const borderColor = color === 'primary' ? 'border-b-black' : 
                     color === 'white' ? 'border-b-white' :
                     color === 'destructive' ? 'border-b-red-600' : 
                     'border-b-black'
  
  return (
    <div 
      className={cn(
        'animate-spin rounded-full border-2 border-transparent',
        borderColor,
        sizeClasses[size],
        className
      )}
    />
  )
} 