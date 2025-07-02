"use client"

import * as React from "react"
import {
  BarChart3,
  Dumbbell,
  Users,
  Calendar,
  Settings,
  Tag,
  TrendingUp,
  LifeBuoy,
  ChevronLeft,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { AdminNavUser } from "@/components/admin-nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const data = {
    user: {
      name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario',
      email: user?.email || '',
      avatar: undefined,
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: BarChart3,
        isActive: pathname === "/admin",
      },
      {
        title: "Entrenamientos",
        url: "/admin/workouts",
        icon: Calendar,
        isActive: pathname?.startsWith("/admin/workouts"),
        items: [
          {
            title: "Gestionar",
            url: "/admin/workouts",
          },
          {
            title: "Programar",
            url: "/admin/workouts/schedule",
          },
        ],
      },
      {
        title: "Usuarios",
        url: "/admin/users",
        icon: Users,
        isActive: pathname?.startsWith("/admin/users"),
        items: [
          {
            title: "Todos los usuarios",
            url: "/admin/users",
          },
          {
            title: "Roles y permisos",
            url: "/admin/users/roles",
          },
        ],
      },
      {
        title: "Categorías",
        url: "/admin/categories",
        icon: Tag,
        isActive: pathname?.startsWith("/admin/categories"),
      },
      {
        title: "Estadísticas",
        url: "/admin/analytics",
        icon: TrendingUp,
        isActive: pathname?.startsWith("/admin/analytics"),
        items: [
          {
            title: "Resumen general",
            url: "/admin/analytics",
          },
          {
            title: "Por categorías",
            url: "/admin/analytics/categories",
          },
          {
            title: "Por usuarios",
            url: "/admin/analytics/users",
          },
        ],
      },
      {
        title: "Configuración",
        url: "/admin/settings",
        icon: Settings,
        isActive: pathname?.startsWith("/admin/settings"),
        items: [
          {
            title: "General",
            url: "/admin/settings",
          },
          {
            title: "Sistema",
            url: "/admin/settings/system",
          },
        ],
      },
    ],
    navSecondary: [
      {
        title: "Ayuda",
        url: "#",
        icon: LifeBuoy,
      },
      {
        title: "Volver a entrenamientos",
        url: "/workouts",
        icon: ChevronLeft,
      },
    ],
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/admin">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Dumbbell className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">The Program</span>
                  <span className="truncate text-xs">Panel de Administración</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <AdminNavUser user={data.user} onSignOut={handleSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
} 