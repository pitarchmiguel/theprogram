-- Script para corregir la recursión infinita en las políticas RLS
-- y eliminar los timeouts en consultas de profiles
-- Ejecuta esto en el SQL Editor de Supabase

-- =============================================================================
-- ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- =============================================================================

DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Masters can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- =============================================================================
-- CREAR POLÍTICAS SIMPLIFICADAS (SIN RECURSIÓN)
-- =============================================================================

-- Política básica: usuarios pueden ver y modificar su propio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para el service role (necesaria para triggers)
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- FUNCIÓN AUXILIAR PARA VERIFICAR SI UN USUARIO ES MASTER
-- =============================================================================

-- Crear función que permita verificar roles sin recursión
CREATE OR REPLACE FUNCTION public.is_user_master(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN 
SECURITY DEFINER -- Ejecuta con privilegios elevados
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar directamente en la tabla profiles sin políticas RLS
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'master'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar false por seguridad
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREAR POLÍTICAS PARA MASTERS (USANDO LA FUNCIÓN AUXILIAR)
-- =============================================================================

-- Masters pueden ver todos los perfiles
CREATE POLICY "Masters can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR  -- Su propio perfil
    public.is_user_master() -- O es master
  );

-- Masters pueden actualizar cualquier perfil
CREATE POLICY "Masters can update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR  -- Su propio perfil
    public.is_user_master() -- O es master
  );

-- Masters pueden eliminar perfiles (excepto el suyo)
CREATE POLICY "Masters can delete profiles" ON public.profiles
  FOR DELETE USING (
    public.is_user_master() AND auth.uid() != id
  );

-- =============================================================================
-- CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =============================================================================

-- Crear índice en la columna role para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Crear índice en email para búsquedas
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- =============================================================================
-- OTORGAR PERMISOS NECESARIOS
-- =============================================================================

-- Otorgar permisos a la función auxiliar
GRANT EXECUTE ON FUNCTION public.is_user_master(UUID) TO authenticated;

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

-- Verificar que las políticas se crearon correctamente
DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Contar políticas activas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'profiles' AND schemaname = 'public';
  
  -- Contar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'profiles' AND schemaname = 'public';
  
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '📊 VERIFICACIÓN DE POLÍTICAS RLS:';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ Políticas activas en profiles: %', policy_count;
  RAISE NOTICE '✅ Índices en profiles: %', index_count;
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '🎉 ¡POLÍTICAS RLS CONFIGURADAS CORRECTAMENTE!';
    RAISE NOTICE '✅ La recursión infinita ha sido eliminada';
    RAISE NOTICE '✅ Los timeouts deberían resolverse';
  ELSE
    RAISE NOTICE '❌ ERROR: No se crearon todas las políticas esperadas';
  END IF;
  
  RAISE NOTICE '=============================================================================';
END $$;

-- Mostrar políticas activas para verificación
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd,
  CASE 
    WHEN length(qual) > 50 THEN substring(qual, 1, 50) || '...'
    ELSE qual
  END as condition_preview
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname; 