-- Actualizar created_at con las fechas reales de auth.users
UPDATE profiles 
SET created_at = (
  SELECT created_at 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE created_at IS NULL OR created_at = NOW();
