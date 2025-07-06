"use client";

import { useEffect, useState } from "react";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, User, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";


interface Profile {
  id: string;
  email: string;
  role: string;
  created_at?: string;
  last_sign_in_at?: string | null;
  full_name?: string;
}

interface SupabaseProfile {
  id: string;
  email: string;
  role: string;
  created_at?: string;
  full_name?: string;
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<{ user: Profile; newRole: string } | null>(null);
  const router = useRouter();

  // Fetch current user and check role
  useEffect(() => {
    const fetchUserRole = async () => {
      console.log("🔍 Iniciando verificación de rol...");
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log("👤 Usuario actual:", user);
      
      if (!user) {
        console.log("❌ No hay usuario, redirigiendo a /");
        router.replace("/");
        return;
      }
      
      console.log("🔍 Buscando perfil para usuario:", user.id);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      console.log("📋 Perfil encontrado:", profile);
      console.log("❌ Error si existe:", error);
      
      if (!profile || profile.role !== "master") {
        console.log("❌ No es master o no hay perfil, redirigiendo a /");
        console.log("   - Profile existe:", !!profile);
        console.log("   - Role:", profile?.role);
        router.replace("/");
        return;
      }
      
      console.log("✅ Usuario es master, permitiendo acceso");
      setUserRole(profile.role);
    };
    fetchUserRole();
  }, [router, supabase]);

  // Fetch all profiles
  useEffect(() => {
    if (userRole !== "master") return;
    const fetchProfiles = async () => {
      // Limpiar datos anteriores
      setProfiles([]);
      setFilteredProfiles([]);
      setLoading(true);
      console.log("🔍 Iniciando fetch de perfiles...");
      
      try {
        // Verificar que el usuario actual es master
        const { data: { user } } = await supabase.auth.getUser();
        console.log("👤 Usuario actual para fetch:", user);
        
        if (!user) {
          console.error("No hay usuario autenticado");
          return;
        }
        
        // Obtener perfiles
        console.log("📋 Intentando obtener perfiles...");
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, role, created_at, full_name");
        
        // Si falla, probar con una consulta más simple
        if (profilesError) {
          console.log("🔄 Probando consulta simple...");
          const { data: simpleData, error: simpleError } = await supabase
            .from("profiles")
            .select("*");
          
          console.log("📊 Datos simples:", simpleData);
          console.log("❌ Error simple:", simpleError);
          
          if (simpleError) {
            throw simpleError;
          }
          
          // Usar los datos simples
          const enrichedProfiles = simpleData.map((profile: SupabaseProfile) => ({
            id: profile.id,
            email: profile.email,
            role: profile.role,
            created_at: profile.created_at,
            last_sign_in_at: null,
            full_name: profile.full_name || "Sin nombre"
          }));
          
          console.log("✅ Profiles loaded (simple):", enrichedProfiles);
          setProfiles(enrichedProfiles);
          setFilteredProfiles(enrichedProfiles);
          return;
        }
        
        console.log("📊 Datos de perfiles:", profilesData);
        console.log("📊 Número de perfiles:", profilesData?.length);
        if (profilesData && profilesData.length > 0) {
          console.log("📅 Primer perfil created_at:", profilesData[0].created_at);
          console.log("📅 Segundo perfil created_at:", profilesData[1]?.created_at);
        }
        console.log("❌ Error de perfiles:", profilesError);
        
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          console.error("Error details:", {
            message: (profilesError as Error).message,
            details: (profilesError as { details?: string }).details,
            hint: (profilesError as { hint?: string }).hint,
            code: (profilesError as { code?: string }).code
          });
          throw profilesError;
        }
        
        if (!profilesData) {
          console.warn("No profiles data returned");
          setProfiles([]);
          setFilteredProfiles([]);
          return;
        }
        
        // Enriquecer datos con información básica
        const enrichedProfiles = profilesData.map((profile: SupabaseProfile) => ({
          ...profile,
          last_sign_in_at: profile.created_at, // Usar created_at como aproximación
          full_name: profile.full_name || "Sin nombre"
        }));
        
        console.log("✅ Profiles loaded:", enrichedProfiles);
        console.log("📅 Sample created_at:", enrichedProfiles[0]?.created_at);
        setProfiles(enrichedProfiles);
        setFilteredProfiles(enrichedProfiles);
      } catch (error) {
        console.error("❌ Error fetching profiles:", error);
        console.error("Error type:", typeof error);
        if (error && typeof error === 'object') {
          console.error("Error keys:", Object.keys(error));
        }
        toast.error("Error al cargar usuarios");
        setProfiles([]);
        setFilteredProfiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [userRole, supabase]);

  // Filter profiles based on search term
  useEffect(() => {
    const filtered = profiles.filter(profile =>
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProfiles(filtered);
  }, [searchTerm, profiles]);

  // Handle role change with confirmation
  const handleRoleChange = async (user: Profile, newRole: string) => {
    setRoleChangeUser({ user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeUser) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: roleChangeUser.newRole })
        .eq("id", roleChangeUser.user.id);
      
      if (error) throw error;
      
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === roleChangeUser.user.id 
            ? { ...profile, role: roleChangeUser.newRole } 
            : profile
        )
      );
      
      toast.success(`Rol cambiado a ${roleChangeUser.newRole}`);
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Error al cambiar el rol");
    } finally {
      setRoleChangeUser(null);
    }
  };

  // Handle user deletion
  const handleDeleteUser = (user: Profile) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      // Eliminar de profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);
      
      if (profileError) throw profileError;
      
      // Nota: No podemos eliminar de auth.users desde el cliente
      // Solo eliminamos de profiles por ahora
      console.warn("Usuario eliminado de profiles. Para eliminar completamente, usar Supabase Dashboard.");
      
      setProfiles((prev) => prev.filter(profile => profile.id !== userToDelete.id));
      toast.success("Usuario eliminado de la base de datos");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario");
    } finally {
      setUserToDelete(null);
    }
  };

  // Format date helper
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Nunca";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return "Fecha inválida";
      }
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Error en fecha";
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Cargando usuarios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios y sus roles
          </p>
        </div>
      </div>

      {/* Search and Stats */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o rol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>Total: {profiles.length} usuarios</span>
                <span>•</span>
                <span>Mostrando: {filteredProfiles.length}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProfiles([]);
                  setFilteredProfiles([]);
                  setLoading(true);
                  // Forzar recarga
                  setTimeout(() => {
                    const fetchProfiles = async () => {
                      try {
                        const { data: profilesData, error: profilesError } = await supabase
                          .from("profiles")
                          .select("id, email, role, created_at, full_name");
                        
                        if (profilesError) throw profilesError;
                        
                        const enrichedProfiles = profilesData?.map((profile: SupabaseProfile) => ({
                          ...profile,
                          last_sign_in_at: profile.created_at,
                          full_name: profile.full_name || "Sin nombre"
                        })) || [];
                        
                        setProfiles(enrichedProfiles);
                        setFilteredProfiles(enrichedProfiles);
                      } catch (error) {
                        console.error("Error refreshing:", error);
                        toast.error("Error al recargar");
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchProfiles();
                  }, 100);
                }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{profile.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>
                <Badge variant={profile.role === "master" ? "default" : "secondary"}>
                  {profile.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Registration Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Registrado: {formatDate(profile.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Select
                    value={profile.role}
                    onValueChange={(value) => handleRoleChange(profile, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(profile)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No results */}
      {filteredProfiles.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron usuarios con ese criterio" : "No hay usuarios registrados"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeUser} onOpenChange={() => setRoleChangeUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cambiar el rol de{" "}
              <strong>{roleChangeUser?.user.full_name}</strong> de{" "}
              <strong>{roleChangeUser?.user.role}</strong> a{" "}
              <strong>{roleChangeUser?.newRole}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirmar cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar al usuario{" "}
              <strong>{userToDelete?.full_name}</strong>? 
              <br />
              <span className="text-sm text-muted-foreground">
                Nota: Solo se eliminará de la base de datos. Para eliminar completamente del sistema, usar Supabase Dashboard.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 