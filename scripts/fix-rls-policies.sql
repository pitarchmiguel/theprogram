-- Script para corregir la recursión infinita en las políticas RLS
-- Ejecuta esto en el SQL Editor de Supabase

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Masters can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can delete profiles" ON public.profiles;

-- Crear políticas corregidas (sin recursión)
CREATE POLICY "Masters can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.uid() = id) OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

CREATE POLICY "Masters can update any profile" ON public.profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.uid() = id) OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

CREATE POLICY "Masters can delete profiles" ON public.profiles
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles'; 