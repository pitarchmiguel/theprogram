'use client'

import { useRouter } from 'next/navigation'
import { Settings, LogOut, Plus, ChevronDown, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useState, ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface AppHeaderProps {
  title?: string
  actions?: ReactNode
}

export function AppHeader({ title = "The Program", actions }: AppHeaderProps) {
  const router = useRouter()
  const { user, userRole, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } catch (e) {
      // Puedes mostrar un toast o alerta si quieres
      console.error('Error al cerrar sesión', e)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'}
              </span>
            </div>
          )}
          {/* Elementos adicionales (como filtros) */}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {userRole === 'master' ? 'Administración' : 'Menú'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/rm')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Mis RM
                </DropdownMenuItem>
                {userRole === 'master' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Settings className="h-4 w-4 mr-2" />
                      Panel de Administración
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/admin/workouts')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Gestionar Entrenamientos
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <span className="flex items-center">
                      <Spinner size="sm" color="destructive" className="mr-2" />
                      Cerrando...
                    </span>
                  ) : (
                    <><LogOut className="h-4 w-4 mr-2" />Cerrar Sesión</>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
} 