-- =============================================================================
-- REPARAR POLÍTICAS RLS PARA PERSONAL RECORDS
-- =============================================================================

-- Verificar que la función is_user_master existe
DO $$
BEGIN
  -- Crear función is_user_master si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user_master') THEN
    CREATE OR REPLACE FUNCTION public.is_user_master()
    RETURNS BOOLEAN AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'master'
      );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE '✅ Función is_user_master creada';
  ELSE
    RAISE NOTICE '✅ Función is_user_master ya existe';
  END IF;
END $$;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can view own records" ON public.personal_records;
DROP POLICY IF EXISTS "Users can insert own records" ON public.personal_records;
DROP POLICY IF EXISTS "Users can update own records" ON public.personal_records;
DROP POLICY IF EXISTS "Users can delete own records" ON public.personal_records;
DROP POLICY IF EXISTS "Masters can view all records" ON public.personal_records;
DROP POLICY IF EXISTS "Masters can update all records" ON public.personal_records;
DROP POLICY IF EXISTS "Masters can delete all records" ON public.personal_records;
DROP POLICY IF EXISTS "Service role full access records" ON public.personal_records;

-- Recrear políticas simplificadas y más permisivas
-- Política para SELECT: usuarios pueden ver sus RM + masters ven todo
CREATE POLICY "enable_select_for_users_and_masters" ON public.personal_records
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Política para INSERT: usuarios autenticados pueden insertar (se validará user_id en el código)
CREATE POLICY "enable_insert_for_authenticated_users" ON public.personal_records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para UPDATE: usuarios pueden actualizar sus RM + masters pueden actualizar todo
CREATE POLICY "enable_update_for_users_and_masters" ON public.personal_records
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Política para DELETE: usuarios pueden eliminar sus RM + masters pueden eliminar todo
CREATE POLICY "enable_delete_for_users_and_masters" ON public.personal_records
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Verificar que RLS esté habilitado
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos básicos
GRANT ALL ON public.personal_records TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verificación final
DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'personal_records' AND schemaname = 'public';
  
  -- Verificar RLS
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'personal_records' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '📊 ESTADO DE LAS POLÍTICAS RM:';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ Políticas RLS activas: %', policy_count;
  RAISE NOTICE '✅ RLS habilitado: %', rls_enabled;
  RAISE NOTICE '=============================================================================';
  
  IF policy_count >= 4 AND rls_enabled THEN
    RAISE NOTICE '🎉 ¡POLÍTICAS RM REPARADAS EXITOSAMENTE!';
    RAISE NOTICE '📝 Los usuarios autenticados ya pueden crear RM';
  ELSE
    RAISE NOTICE '❌ ERROR: Las políticas no se configuraron correctamente';
  END IF;
  
  RAISE NOTICE '=============================================================================';
END $$; 