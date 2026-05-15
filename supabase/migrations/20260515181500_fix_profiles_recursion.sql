-- FIX RECURSION IN PROFILES POLICY
-- Dashboard ADS S4X

-- 1. Criar função para verificar role sem disparar RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin_or_owner() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    AND (role = 'admin' OR role = 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 3. Recriar política usando a função SECURITY DEFINER para quebrar a recursão
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR ALL USING (
  public.is_admin_or_owner()
);
