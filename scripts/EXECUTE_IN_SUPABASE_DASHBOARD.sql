-- ========================================
-- EJECUTAR EN SUPABASE DASHBOARD
-- ========================================
-- Instrucciones:
-- 1. Ve a tu proyecto en dashboard.supabase.com
-- 2. Navega a SQL Editor
-- 3. Copia y pega este código completo
-- 4. Haz clic en "RUN" para ejecutar

-- Eliminar la restricción que impide múltiples RM por ejercicio
ALTER TABLE public.personal_records 
DROP CONSTRAINT IF EXISTS unique_user_exercise;

-- Crear índices para optimizar consultas de historial
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise_date 
ON public.personal_records(user_id, exercise_name, date_achieved DESC);

-- Crear índice para consultas de "último RM" por ejercicio
CREATE INDEX IF NOT EXISTS idx_personal_records_latest_by_exercise 
ON public.personal_records(user_id, exercise_name, weight_kg DESC, date_achieved DESC);

-- ¡Listo! Ahora podrás añadir múltiples RM para el mismo ejercicio 