'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, userRole, loading, error: authError } = useAuth()
  const router = useRouter()
  const [isTimeout, setIsTimeout] = useState(false)

  useEffect(() => {
    if (!loading && (!user || userRole !== 'master')) {
      router.push('/workouts')
    }
  }, [user, userRole, loading, router])

  // Timeout para carga de autenticación
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setIsTimeout(true)
      }
    }, 15000) // 15 segundos timeout

    return () => clearTimeout(timeoutId)
  }, [loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <span>Verificando permisos de administrador...</span>
          {authError && (
            <div className="text-center text-sm text-red-500 max-w-xs">
              <p>{authError}</p>
            </div>
          )}
          {(isTimeout || authError) && (
            <div className="text-center text-sm text-muted-foreground max-w-xs">
              <p>La verificación está tardando más de lo normal.</p>
              <div className="flex gap-2 mt-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reintentar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/workouts')}
                >
                  Ir a Entrenamientos
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user || userRole !== 'master') {
    return null
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin">
                    Administración
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 