-- Fix workouts table to include updated_at field and proper trigger
-- This fixes the error: record "new" has no field "updated_at"

-- First, check if the updated_at column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workouts' 
                 AND column_name = 'updated_at' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.workouts 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Update existing records to have the updated_at value
    UPDATE public.workouts 
    SET updated_at = created_at 
    WHERE updated_at IS NULL;
    
    RAISE NOTICE 'Added updated_at column to workouts table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in workouts table';
  END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_workouts_updated ON public.workouts;

-- Create the trigger for workouts table
CREATE TRIGGER on_workouts_updated
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'workouts' 
AND table_schema = 'public'
ORDER BY ordinal_position; 