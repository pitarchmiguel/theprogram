-- Crear tabla de logs de actividad
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Función para registrar actividad
CREATE OR REPLACE FUNCTION log_user_activity(user_uuid UUID, activity TEXT)
RETURNS VOID AS 2131
BEGIN
  INSERT INTO user_activity_logs (user_id, activity_type)
  VALUES (user_uuid, activity);
END;
2131 LANGUAGE plpgsql;
