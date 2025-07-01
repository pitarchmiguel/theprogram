-- Actualizar la función handle_new_user para incluir full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS 2131
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Sin nombre'),
    NOW(), 
    NOW()
  );
  RETURN new;
END;
2131 language plpgsql;
