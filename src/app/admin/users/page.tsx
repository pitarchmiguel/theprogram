"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  email: string;
  role: string;
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role");
      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    };
    fetchProfiles();
  }, [userRole, supabase]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === userId ? { ...profile, role: newRole } : profile
      )
    );
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin: Manage Users</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-t">
                <td className="px-4 py-2">{profile.email}</td>
                <td className="px-4 py-2">
                  <Select
                    value={profile.role}
                    onValueChange={(value) => handleRoleChange(profile.id, value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="athlete">athlete</SelectItem>
                      <SelectItem value="master">master</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoleChange(profile.id, profile.role === "athlete" ? "master" : "athlete")}
                  >
                    Toggle
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 