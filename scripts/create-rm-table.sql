-- =============================================================================
-- TABLA DE RÉCORDS MÁXIMOS (RM)
-- =============================================================================

-- Mostrar información de progreso
DO $$
BEGIN
  RAISE NOTICE '🚀 Creando tabla de récords máximos...';
END $$;

-- Eliminar tabla si existe para recrearla
DROP TABLE IF EXISTS public.personal_records CASCADE;

-- Crear tabla de récords máximos
CREATE TABLE public.personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL CHECK (weight_kg > 0),
  date_achieved DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índice único para evitar múltiples RM del mismo ejercicio por usuario
  CONSTRAINT unique_user_exercise UNIQUE (user_id, exercise_name)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_personal_records_user_id ON public.personal_records(user_id);
CREATE INDEX idx_personal_records_exercise_name ON public.personal_records(exercise_name);
CREATE INDEX idx_personal_records_date_achieved ON public.personal_records(date_achieved);

DO $$
BEGIN
  RAISE NOTICE '✅ Tabla personal_records creada correctamente';
END $$;

-- =============================================================================
-- CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios RM
CREATE POLICY "Users can view own records" ON public.personal_records
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propios RM
CREATE POLICY "Users can insert own records" ON public.personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios RM
CREATE POLICY "Users can update own records" ON public.personal_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios RM
CREATE POLICY "Users can delete own records" ON public.personal_records
  FOR DELETE USING (auth.uid() = user_id);

-- Política: Masters pueden ver todos los RM (usando la función auxiliar existente)
CREATE POLICY "Masters can view all records" ON public.personal_records
  FOR SELECT USING (
    auth.uid() = user_id OR  -- Su propio RM
    public.is_user_master() -- O es master
  );

-- Política: Masters pueden actualizar cualquier RM
CREATE POLICY "Masters can update all records" ON public.personal_records
  FOR UPDATE USING (
    auth.uid() = user_id OR  -- Su propio RM
    public.is_user_master() -- O es master
  );

-- Política: Masters pueden eliminar RM de otros usuarios
CREATE POLICY "Masters can delete all records" ON public.personal_records
  FOR DELETE USING (
    auth.uid() = user_id OR  -- Su propio RM
    public.is_user_master() -- O es master
  );

-- Política: Service role tiene acceso completo (para triggers y funciones)
CREATE POLICY "Service role full access records" ON public.personal_records
  FOR ALL USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS configuradas correctamente';
END $$;

-- =============================================================================
-- CREAR FUNCIÓN PARA ACTUALIZAR TIMESTAMP
-- =============================================================================

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_personal_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER on_personal_records_updated
  BEFORE UPDATE ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_personal_records_updated_at();

DO $$
BEGIN
  RAISE NOTICE '✅ Triggers creados correctamente';
END $$;

-- =============================================================================
-- OTORGAR PERMISOS
-- =============================================================================

-- Otorgar permisos necesarios
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.personal_records TO authenticated;
GRANT SELECT ON public.personal_records TO anon;

-- =============================================================================
-- INSERTAR DATOS DE EJEMPLO (OPCIONAL)
-- =============================================================================

-- Ejercicios comunes de CrossFit para referencia
INSERT INTO public.personal_records (user_id, exercise_name, weight_kg, date_achieved, notes)
SELECT 
  p.id,
  unnest(ARRAY[
    'Back Squat',
    'Front Squat',
    'Deadlift',
    'Bench Press',
    'Overhead Press',
    'Clean & Jerk',
    'Snatch',
    'Thruster',
    'Push Press',
    'Sumo Deadlift'
  ]) as exercise_name,
  -- Pesos de ejemplo aleatorios
  (50 + random() * 100)::decimal(6,2) as weight_kg,
  CURRENT_DATE - (random() * 365)::int as date_achieved,
  'Registro inicial de ejemplo' as notes
FROM public.profiles p
WHERE p.role = 'athlete'
LIMIT 2; -- Solo para 2 usuarios como ejemplo

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
  sample_count INTEGER;
BEGIN
  -- Verificar que la tabla existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'personal_records'
  ) INTO table_exists;
  
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'personal_records' AND schemaname = 'public';
  
  -- Contar registros de ejemplo
  SELECT COUNT(*) INTO sample_count FROM public.personal_records;
  
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '📊 RESULTADO DE LA CONFIGURACIÓN DE RM:';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ Tabla personal_records existe: %', table_exists;
  RAISE NOTICE '📈 Políticas RLS configuradas: %', policy_count;
  RAISE NOTICE '📈 Registros de ejemplo creados: %', sample_count;
  RAISE NOTICE '=============================================================================';
  
  IF table_exists AND policy_count >= 8 THEN
    RAISE NOTICE '🎉 ¡SISTEMA DE RM CONFIGURADO EXITOSAMENTE!';
    RAISE NOTICE '📝 Los atletas ya pueden gestionar sus récords máximos';
    RAISE NOTICE '📝 Los masters pueden ver y gestionar todos los RM';
  ELSE
    RAISE NOTICE '❌ ERROR: La configuración no se completó correctamente';
  END IF;
  
  RAISE NOTICE '=============================================================================';
END $$; 