'use client'

import { useRouter } from 'next/navigation'
import { Dumbbell, Settings, LogOut, Plus, ChevronDown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'

interface AdminHeaderProps {
  title: string
  showBackButton?: boolean
  backUrl?: string
}

export function AdminHeader({ title, showBackButton = false, backUrl = '/workouts' }: AdminHeaderProps) {
  const router = useRouter()
  const { user, userRole, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push(backUrl)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-full">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}
                </span>
              </div>
            )}
            {userRole === 'master' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Administración</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Gestionar Entrenamientos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Gestionar Usuarios
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 