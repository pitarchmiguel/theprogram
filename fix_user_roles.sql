-- Script para corregir roles de usuarios
-- Ejecuta este script en el editor SQL de Supabase

-- 1. Asignar rol 'master' al primer usuario (más antiguo)
UPDATE profiles 
SET role = 'master'
WHERE id = (
  SELECT id FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- 2. Asignar rol 'athlete' a todos los demás usuarios
UPDATE profiles 
SET role = 'athlete'
WHERE role IS NULL OR role = '' OR role != 'master';

-- 3. Verificar el resultado
SELECT 
  id,
  email,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 4. Mostrar resumen
SELECT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role; 