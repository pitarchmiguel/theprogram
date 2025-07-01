-- Corregir fechas de created_at en profiles
-- Primero, mostrar las fechas actuales
SELECT 
  p.id,
  p.email,
  p.created_at as profiles_created_at,
  a.created_at as auth_created_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
LIMIT 5;

-- Luego actualizar con las fechas correctas
UPDATE profiles 
SET created_at = auth_users.created_at
FROM auth.users
WHERE profiles.id = auth_users.id
AND (profiles.created_at IS NULL OR profiles.created_at = NOW());
