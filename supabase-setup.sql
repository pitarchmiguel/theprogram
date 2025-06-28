-- Crear tabla de entrenamientos
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  date DATE NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (puedes ajustar según tus necesidades)
CREATE POLICY "Allow all operations" ON workouts
  FOR ALL USING (true);

-- Asegurar que los registros existentes tengan blocks como array vacío si es NULL
UPDATE workouts SET blocks = '[]'::jsonb WHERE blocks IS NULL;

-- Comentarios sobre la estructura
COMMENT ON TABLE workouts IS 'Tabla para almacenar entrenamientos de CrossFit';
COMMENT ON COLUMN workouts.blocks IS 'Array de bloques de entrenamiento en formato JSON';
COMMENT ON COLUMN workouts.date IS 'Fecha del entrenamiento'; 