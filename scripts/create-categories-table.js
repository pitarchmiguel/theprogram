#!/usr/bin/env node

console.log('🎯 Configurador de Base de Datos - Categorías Personalizadas')
console.log('=' .repeat(60))
console.log('')
console.log('📋 Para habilitar las categorías personalizadas, necesitas ejecutar')
console.log('   el siguiente SQL en tu dashboard de Supabase:')
console.log('')
console.log('1. Ve a tu dashboard de Supabase')
console.log('2. Navega a SQL Editor')
console.log('3. Ejecuta el siguiente SQL:')
console.log('')
console.log('=====================================')
console.log('')

const sqlContent = `-- Create custom categories table
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view custom categories" ON public.custom_categories;
DROP POLICY IF EXISTS "Masters can create custom categories" ON public.custom_categories;
DROP POLICY IF EXISTS "Masters can update custom categories" ON public.custom_categories;
DROP POLICY IF EXISTS "Masters can delete custom categories" ON public.custom_categories;

-- Create new policies
CREATE POLICY "Everyone can view custom categories" ON public.custom_categories
  FOR SELECT USING (true);

CREATE POLICY "Masters can create custom categories" ON public.custom_categories
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

CREATE POLICY "Masters can update custom categories" ON public.custom_categories
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

CREATE POLICY "Masters can delete custom categories" ON public.custom_categories
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'master' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.custom_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_categories TO authenticated;`

console.log(sqlContent)
console.log('')
console.log('=====================================')
console.log('')
console.log('4. Después de ejecutar el SQL, recarga tu aplicación')
console.log('')
console.log('🎊 ¡Una vez configurado, podrás:')
console.log('• Crear categorías personalizadas desde /add')
console.log('• Ver estadísticas de categorías')
console.log('• Usar filtros avanzados en /workouts')
console.log('')
console.log('⚠️  Nota: Necesitas ser el propietario del proyecto de Supabase')
console.log('   para ejecutar estos comandos DDL (CREATE TABLE, etc.)')
console.log('')
console.log('💡 También puedes encontrar este SQL en: scripts/setup-categories.sql') 