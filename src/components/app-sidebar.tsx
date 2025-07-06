"use client"

import * as React from "react"
import {
  BookOpen,
  Calendar,
  Dumbbell,
  Home,
  LifeBuoy,
  Settings,
  User,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, userRole, signOut } = useAuth()

  const data = {
    user: {
      name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario',
      email: user?.email || '',
      avatar: user?.user_metadata?.picture || undefined,
    },
    navMain: [
      {
        title: "Inicio",
        url: "/dashboard",
        icon: Home,
        isActive: false,
      },
      {
        title: "Entrenamientos",
        url: "/workouts",
        icon: Calendar,
        isActive: true,
      },
      {
        title: "Documentación",
        url: "#",
        icon: BookOpen,
        items: [
          {
            title: "Guía de uso",
            url: "#",
          },
          {
            title: "Preguntas frecuentes",
            url: "#",
          },
          {
            title: "Contacto",
            url: "#",
          },
        ],
      },
      ...(userRole === 'master' ? [
        {
          title: "Administración",
          url: "/admin",
          icon: Settings,
          items: [
            {
              title: "Dashboard",
              url: "/admin",
            },
            {
              title: "Usuarios",
              url: "/admin/users",
            },
            {
              title: "Entrenamientos",
              url: "/admin/workouts",
            },
            {
              title: "Categorías",
              url: "/admin/categories",
            },
          ],
        },
      ] : []),
    ],
    navSecondary: [
      {
        title: "Ayuda",
        url: "#",
        icon: LifeBuoy,
      },
      {
        title: "Perfil",
        url: "#",
        icon: User,
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
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Dumbbell className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">The Program</span>
                  <span className="truncate text-xs">Aplicación de entrenamientos</span>
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
        <NavUser user={data.user} onSignOut={handleSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
