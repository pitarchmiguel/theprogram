-- Configuración de la base de datos para CrossFit Trainer App
-- Ejecuta este script en el editor SQL de Supabase

-- Crear tabla de usuarios para autenticación
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

-- Crear tabla de entrenamientos con la estructura correcta para la aplicación
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  date DATE NOT NULL,
  blocks JSONB DEFAULT '[]'::jsonb
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Habilitar RLS (Row Level Security)
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla workouts
CREATE POLICY "Allow all operations for authenticated users" ON workouts 
  FOR ALL USING (true);

-- Políticas para la tabla users
CREATE POLICY "Allow users to read their own data" ON users 
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage all users" ON users 
  FOR ALL USING (role = 'admin');

-- Insertar usuario administrador por defecto
-- Contraseña: crossfit2024 (hash bcrypt)
INSERT INTO users (username, password_hash, name, email, role) VALUES
(
  'admin',
  '$2b$10$J/g9jL1jlr8GvQjpCuQpiO6M/DrWrhlvOoriiyAuF7yFXQmB3NgcG', -- password: crossfit2024
  'Administrador',
  'admin@crossfit.com',
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insertar algunos datos de ejemplo para workouts
INSERT INTO workouts (date, blocks) VALUES
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
); 