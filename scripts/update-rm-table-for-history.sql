-- =============================================================================
-- ACTUALIZACIÓN PARA PERMITIR HISTORIAL DE RM
-- =============================================================================

-- Mostrar información de progreso
DO $$
BEGIN
  RAISE NOTICE '🔄 Actualizando sistema de RM para permitir historial...';
END $$;

-- Eliminar la restricción de unicidad que impedía múltiples RM por ejercicio
ALTER TABLE public.personal_records 
DROP CONSTRAINT IF EXISTS unique_user_exercise;

-- Verificar que la restricción fue eliminada
DO $$
BEGIN
  RAISE NOTICE '✅ Restricción de unicidad eliminada - ahora se permite historial por ejercicio';
END $$;

-- Crear un nuevo índice compuesto para optimizar consultas por usuario, ejercicio y fecha
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise_date 
ON public.personal_records(user_id, exercise_name, date_achieved DESC);

-- Crear índice para consultas de "último RM" por ejercicio
CREATE INDEX IF NOT EXISTS idx_personal_records_latest_by_exercise 
ON public.personal_records(user_id, exercise_name, weight_kg DESC, date_achieved DESC);

DO $$
BEGIN
  RAISE NOTICE '✅ Índices optimizados para consultas de historial creados';
END $$;

-- Crear función para obtener el RM actual (más reciente o más pesado) por ejercicio
CREATE OR REPLACE FUNCTION public.get_current_pr(p_user_id UUID, p_exercise_name TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  exercise_name TEXT,
  weight_kg DECIMAL(6,2),
  date_achieved DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_weight_pr BOOLEAN,
  is_latest BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH exercise_records AS (
    SELECT 
      pr.*,
      RANK() OVER (ORDER BY pr.weight_kg DESC, pr.date_achieved DESC) as weight_rank,
      RANK() OVER (ORDER BY pr.date_achieved DESC, pr.weight_kg DESC) as date_rank
    FROM public.personal_records pr 
    WHERE pr.user_id = p_user_id 
    AND pr.exercise_name = p_exercise_name
  )
  SELECT 
    er.id,
    er.user_id,
    er.exercise_name,
    er.weight_kg,
    er.date_achieved,
    er.notes,
    er.created_at,
    er.updated_at,
    (er.weight_rank = 1) as is_weight_pr,
    (er.date_rank = 1) as is_latest
  FROM exercise_records er
  WHERE er.weight_rank = 1 OR er.date_rank = 1;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos a la función
GRANT EXECUTE ON FUNCTION public.get_current_pr(UUID, TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Función para obtener RM actual creada';
END $$;

-- Crear vista para facilitar consultas de RM con información de historial
CREATE OR REPLACE VIEW public.personal_records_with_history AS
WITH ranked_records AS (
  SELECT 
    pr.*,
    ROW_NUMBER() OVER (
      PARTITION BY pr.user_id, pr.exercise_name 
      ORDER BY pr.weight_kg DESC, pr.date_achieved DESC
    ) as weight_rank,
    ROW_NUMBER() OVER (
      PARTITION BY pr.user_id, pr.exercise_name 
      ORDER BY pr.date_achieved DESC, pr.weight_kg DESC
    ) as date_rank,
    COUNT(*) OVER (
      PARTITION BY pr.user_id, pr.exercise_name
    ) as total_records,
    LAG(pr.weight_kg) OVER (
      PARTITION BY pr.user_id, pr.exercise_name 
      ORDER BY pr.date_achieved ASC
    ) as previous_weight
  FROM public.personal_records pr
)
SELECT 
  rr.*,
  (rr.weight_rank = 1) as is_current_weight_pr,
  (rr.date_rank = 1) as is_latest_attempt,
  (rr.weight_kg > COALESCE(rr.previous_weight, 0)) as is_improvement,
  CASE 
    WHEN rr.previous_weight IS NULL THEN 0
    ELSE ROUND(((rr.weight_kg - rr.previous_weight) / rr.previous_weight * 100)::numeric, 2)
  END as improvement_percentage
FROM ranked_records rr;

-- Otorgar permisos a la vista
GRANT SELECT ON public.personal_records_with_history TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Vista de historial creada con métricas de mejora';
END $$;

-- Insertar algunos datos de ejemplo de historial para testing
DO $$
DECLARE
  sample_user_id UUID;
BEGIN
  -- Obtener un usuario de ejemplo
  SELECT id INTO sample_user_id 
  FROM public.profiles 
  WHERE role = 'athlete' 
  LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    -- Insertar historial de ejemplo para Back Squat
    INSERT INTO public.personal_records (user_id, exercise_name, weight_kg, date_achieved, notes)
    VALUES 
      (sample_user_id, 'Back Squat Progresión', 80.0, CURRENT_DATE - INTERVAL '90 days', 'Primer intento'),
      (sample_user_id, 'Back Squat Progresión', 85.0, CURRENT_DATE - INTERVAL '60 days', 'Mejora técnica'),
      (sample_user_id, 'Back Squat Progresión', 87.5, CURRENT_DATE - INTERVAL '30 days', 'Con cinturón'),
      (sample_user_id, 'Back Squat Progresión', 90.0, CURRENT_DATE - INTERVAL '7 days', 'Nuevo RM!')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Datos de ejemplo de historial insertados';
  END IF;
END $$;

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  index_count INTEGER;
  sample_count INTEGER;
BEGIN
  -- Verificar que la restricción fue eliminada
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_exercise'
    AND table_name = 'personal_records'
  ) INTO constraint_exists;
  
  -- Contar índices nuevos
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'personal_records' 
  AND indexname LIKE 'idx_personal_records_%';
  
  -- Contar registros de ejemplo de historial
  SELECT COUNT(*) INTO sample_count 
  FROM public.personal_records 
  WHERE exercise_name = 'Back Squat Progresión';
  
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '📊 RESULTADO DE LA ACTUALIZACIÓN DE RM:';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ Restricción de unicidad eliminada: %', NOT constraint_exists;
  RAISE NOTICE '📈 Índices de historial creados: %', index_count;
  RAISE NOTICE '📈 Registros de ejemplo de historial: %', sample_count;
  RAISE NOTICE '=============================================================================';
  
  IF NOT constraint_exists AND index_count >= 2 THEN
    RAISE NOTICE '🎉 ¡SISTEMA DE HISTORIAL DE RM CONFIGURADO EXITOSAMENTE!';
    RAISE NOTICE '📝 Ahora se pueden registrar múltiples RM por ejercicio';
    RAISE NOTICE '📝 El sistema mantendrá un historial completo de progresión';
    RAISE NOTICE '📝 Se destacarán automáticamente los RM actuales y mejoras';
  ELSE
    RAISE NOTICE '❌ ERROR: La actualización no se completó correctamente';
  END IF;
  
  RAISE NOTICE '=============================================================================';
END $$; 