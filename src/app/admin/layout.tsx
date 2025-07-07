'use client'

import { useEffect } from 'react'
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
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/spinner'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, userRole, loading, roleLoading } = useAuth()
  const router = useRouter()

  // Redirección mejorada - esperar a que tanto user como role estén cargados
  useEffect(() => {
    // No hacer nada mientras se está cargando el usuario o el rol
    if (loading || roleLoading) {
      console.log('🛡️ [AdminLayout] Esperando carga completa...', { loading, roleLoading })
      return
    }

    // Una vez que ambos están cargados, verificar permisos
    if (!user) {
      console.log('🛡️ [AdminLayout] Sin usuario, redirigiendo...')
      router.replace('/')
    } else if (userRole !== 'master') {
      console.log('🛡️ [AdminLayout] No es master, redirigiendo a workouts...', { userRole })
      router.replace('/workouts')
    } else {
      console.log('🛡️ [AdminLayout] Usuario master verificado ✅', { userRole })
    }
  }, [loading, roleLoading, user, userRole, router])

  // Loading state - mostrar mientras se carga usuario O rol
  if (loading || roleLoading) {
    const loadingMessage = loading 
      ? 'Verificando usuario...' 
      : 'Verificando permisos...'
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" />
          <span>{loadingMessage}</span>
        </div>
      </div>
    )
  }

  // Quick check - si no es master, return null mientras redirige
  if (!user || userRole !== 'master') {
    return null
  }

  // Render admin layout
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