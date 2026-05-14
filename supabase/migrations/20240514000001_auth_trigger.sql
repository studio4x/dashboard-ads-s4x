-- TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PROFILE AO CRIAR USUÁRIO NO AUTH.USERS
-- Dashboard ADS S4X

-- 1. Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client' -- Role padrão é client
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- COMENTÁRIO: 
-- Para transformar o primeiro usuário em 'owner', execute manualmente:
-- UPDATE public.profiles SET role = 'owner' WHERE email = 'seu@email.com';
