-- Create custom categories table
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for custom categories
-- Everyone can view categories
CREATE POLICY "Everyone can view custom categories" ON public.custom_categories
  FOR SELECT USING (true);

-- Only masters can create, update, and delete custom categories
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
GRANT INSERT, UPDATE, DELETE ON public.custom_categories TO authenticated; 