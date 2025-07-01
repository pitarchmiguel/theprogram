-- Debug script para verificar roles de usuarios
-- Ejecuta este script en el editor SQL de Supabase

-- 1. Verificar todos los usuarios en profiles
SELECT 
  'profiles' as source,
  id,
  email,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 2. Verificar usuarios en auth.users
SELECT 
  'auth.users' as source,
  id,
  email,
  raw_user_meta_data->>'role' as auth_role,
  raw_user_meta_data->>'name' as auth_name,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 3. Comparar roles entre auth.users y profiles
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'role' as auth_role,
  p.role as profile_role,
  CASE 
    WHEN au.raw_user_meta_data->>'role' = p.role THEN '✅ Match'
    WHEN au.raw_user_meta_data->>'role' IS NULL AND p.role IS NULL THEN '❌ Both NULL'
    WHEN au.raw_user_meta_data->>'role' IS NULL THEN '⚠️ Auth NULL'
    WHEN p.role IS NULL THEN '⚠️ Profile NULL'
    ELSE '❌ Mismatch'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- 4. Mostrar usuarios que necesitan corrección
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'role' as auth_role,
  p.role as profile_role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.role IS NULL OR p.role = '' OR au.raw_user_meta_data->>'role' != p.role
ORDER BY au.created_at DESC; 