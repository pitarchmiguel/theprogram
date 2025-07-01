-- Actualizar nombres de usuarios existentes
UPDATE profiles 
SET full_name = COALESCE(
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE auth.users.id = profiles.id),
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE auth.users.id = profiles.id),
  'Sin nombre'
)
WHERE full_name IS NULL OR full_name = 'Sin nombre';
