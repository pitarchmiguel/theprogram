-- Script de migración para actualizar la estructura de la tabla workouts
-- Ejecuta este script en el editor SQL de Supabase

-- 1. Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'trainer')),
  is_active BOOLEAN DEFAULT true
);

-- 2. Crear tabla workouts con la estructura correcta para la aplicación
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  date DATE NOT NULL,
  blocks JSONB DEFAULT '[]'::jsonb
);

-- 3. Si la tabla workouts ya existe pero con estructura diferente, migrar los datos
DO $$
BEGIN
    -- Verificar si la tabla workouts existe con la estructura antigua
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'title'
    ) THEN
        -- Crear tabla temporal con la nueva estructura
        CREATE TABLE IF NOT EXISTS workouts_new (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          date DATE NOT NULL,
          blocks JSONB DEFAULT '[]'::jsonb
        );
        
        -- Migrar datos existentes a la nueva estructura
        INSERT INTO workouts_new (id, created_at, date, blocks)
        SELECT 
          id,
          created_at,
          date,
          CASE 
            WHEN title IS NOT NULL THEN 
              jsonb_build_array(
                jsonb_build_object(
                  'id', '1',
                  'letter', 'A',
                  'title', title,
                  'description', COALESCE(description, ''),
                  'notes', ''
                )
              )
            ELSE '[]'::jsonb
          END as blocks
        FROM workouts;
        
        -- Eliminar tabla antigua y renombrar la nueva
        DROP TABLE workouts;
        ALTER TABLE workouts_new RENAME TO workouts;
    END IF;
END $$;

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 5. Habilitar RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas (eliminar las existentes primero si es necesario)
DROP POLICY IF EXISTS "Allow all operations" ON workouts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON workouts;
DROP POLICY IF EXISTS "Allow users to read their own data" ON users;
DROP POLICY IF EXISTS "Allow admins to manage all users" ON users;

-- Crear nuevas políticas
CREATE POLICY "Allow all operations for authenticated users" ON workouts 
  FOR ALL USING (true);

CREATE POLICY "Allow users to read their own data" ON users 
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage all users" ON users 
  FOR ALL USING (role = 'admin');

-- 7. Insertar usuario administrador por defecto
INSERT INTO users (username, password_hash, name, email, role) VALUES
(
  'admin',
  '$2b$10$J/g9jL1jlr8GvQjpCuQpiO6M/DrWrhlvOoriiyAuF7yFXQmB3NgcG', -- password: crossfit2024
  'Administrador',
  'admin@crossfit.com',
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- 8. Insertar datos de ejemplo solo si la tabla está vacía
INSERT INTO workouts (date, blocks) 
SELECT * FROM (
  VALUES
    (
      CURRENT_DATE,
      '[
        {
          "id": "1",
          "letter": "A",
          "title": "WOD Fran",
          "description": "Clásico WOD de CrossFit con thrusters y pull-ups",
          "notes": ""
        }
      ]'::jsonb
    ),
    (
      CURRENT_DATE + INTERVAL '1 day',
      '[
        {
          "id": "1",
          "letter": "A",
          "title": "Entrenamiento de Fuerza",
          "description": "Sesión de press de banca y sentadillas",
          "notes": ""
        },
        {
          "id": "2",
          "letter": "B",
          "title": "Cardio Endurance",
          "description": "Entrenamiento de resistencia cardiovascular",
          "notes": ""
        }
      ]'::jsonb
    )
) AS v(date, blocks)
WHERE NOT EXISTS (SELECT 1 FROM workouts LIMIT 1); 