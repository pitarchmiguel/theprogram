-- Actualizar la función handle_new_user para incluir timestamps
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS 2131
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (new.id, new.email, NOW(), NOW());
  RETURN new;
END;
2131 language plpgsql;
