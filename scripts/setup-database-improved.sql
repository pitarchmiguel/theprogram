-- =============================================================================
-- CONFIGURACIÓN COMPLETA DE LA BASE DE DATOS
-- =============================================================================

-- Mostrar información de progreso
DO $$
BEGIN
  RAISE NOTICE '🚀 Iniciando configuración de la base de datos...';
END $$;

-- Clean up existing objects first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.create_master_user(TEXT);

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Masters can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Drop table if exists
DROP TABLE IF EXISTS public.profiles;

DO $$
BEGIN
  RAISE NOTICE '✅ Limpieza completada';
END $$;

-- =============================================================================
-- CREAR TABLA PROFILES
-- =============================================================================

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'athlete' CHECK (role IN ('athlete', 'master')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE '✅ Tabla profiles creada correctamente';
END $$;

-- =============================================================================
-- CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Masters can view all profiles (using user metadata to avoid recursion)
CREATE POLICY "Masters can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.uid() = id) OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

-- Masters can update any profile (using user metadata to avoid recursion)
CREATE POLICY "Masters can update any profile" ON public.profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.uid() = id) OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

-- Masters can delete profiles (using user metadata to avoid recursion)
CREATE POLICY "Masters can delete profiles" ON public.profiles
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

-- Service role can insert profiles (para el trigger)
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS configuradas correctamente';
END $$;

-- =============================================================================
-- CREAR FUNCIONES Y TRIGGERS
-- =============================================================================

-- Create function to handle new user registration
-- This function runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role TEXT;
BEGIN
  -- Extract name from metadata (try different possible keys)
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  
  -- Extract role from metadata, default to 'athlete'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'athlete');
  
  -- Insert into profiles table
  -- Using INSERT with ON CONFLICT to handle potential duplicates
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DO $$
BEGIN
  RAISE NOTICE '✅ Funciones y triggers creados correctamente';
END $$;

-- =============================================================================
-- CREAR PERFILES PARA USUARIOS EXISTENTES
-- =============================================================================

-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email
  ) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'athlete') as role,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- =============================================================================
-- CREAR FUNCIÓN PARA ASIGNAR MASTER
-- =============================================================================

-- Create a master user function for initial setup
CREATE OR REPLACE FUNCTION public.create_master_user(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  result_message TEXT;
BEGIN
  UPDATE public.profiles 
  SET role = 'master' 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    result_message := 'User with email ' || user_email || ' not found. Make sure they register first.';
    RAISE NOTICE '%', result_message;
  ELSE
    result_message := 'User ' || user_email || ' has been granted master role.';
    RAISE NOTICE '%', result_message;
  END IF;
  
  RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CONFIGURAR PERMISOS
-- =============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  -- Verificar que la tabla existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO table_exists;
  
  -- Contar usuarios y perfiles
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '📊 RESULTADO DE LA CONFIGURACIÓN:';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ Tabla profiles existe: %', table_exists;
  RAISE NOTICE '📈 Usuarios en auth.users: %', user_count;
  RAISE NOTICE '📈 Perfiles en public.profiles: %', profile_count;
  RAISE NOTICE '=============================================================================';
  
  IF table_exists THEN
    RAISE NOTICE '🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!';
    RAISE NOTICE '📝 Para asignar rol master a tu usuario, ejecuta:';
    RAISE NOTICE '   SELECT public.create_master_user(''tu-email@ejemplo.com'');';
  ELSE
    RAISE NOTICE '❌ ERROR: La tabla profiles no se creó correctamente';
  END IF;
  
  RAISE NOTICE '=============================================================================';
END $$; 