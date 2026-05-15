-- COMPLETE RLS POLICIES FIX
-- Dashboard ADS S4X

-- 1. Função de auxílio (já deve existir da migração anterior, mas garantimos aqui)
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

-- 2. DASHBOARD_PAGES (Estavam faltando!)
DROP POLICY IF EXISTS "Admins can manage dashboard_pages" ON public.dashboard_pages;
CREATE POLICY "Admins can manage dashboard_pages" ON public.dashboard_pages
  FOR ALL USING (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Clients can view enabled dashboard_pages" ON public.dashboard_pages;
CREATE POLICY "Clients can view enabled dashboard_pages" ON public.dashboard_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dashboards d
      JOIN public.client_users cu ON cu.client_id = d.client_id
      JOIN public.profiles p ON p.id = cu.user_id
      WHERE p.auth_user_id = auth.uid() AND d.id = public.dashboard_pages.dashboard_id
    )
  );

-- 3. CLIENT_USERS
DROP POLICY IF EXISTS "Admins can manage client_users" ON public.client_users;
CREATE POLICY "Admins can manage client_users" ON public.client_users
  FOR ALL USING (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Users can view own client memberships" ON public.client_users;
CREATE POLICY "Users can view own client memberships" ON public.client_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = public.client_users.user_id AND p.auth_user_id = auth.uid()
    )
  );

-- 4. DATA_SOURCES & GOOGLE_SHEET_SOURCES (Fixing recursion/consistency)
DROP POLICY IF EXISTS "Admins only access data_sources" ON public.data_sources;
CREATE POLICY "Admins only access data_sources" ON public.data_sources
  FOR ALL USING (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Admins only access google_sheet_sources" ON public.google_sheet_sources;
CREATE POLICY "Admins only access google_sheet_sources" ON public.google_sheet_sources
  FOR ALL USING (public.is_admin_or_owner());

-- 5. IMPORT_LOGS
DROP POLICY IF EXISTS "Admins only access import_logs" ON public.import_logs;
CREATE POLICY "Admins only access import_logs" ON public.import_logs
  FOR ALL USING (public.is_admin_or_owner());
