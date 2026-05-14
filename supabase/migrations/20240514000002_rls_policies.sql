-- PHASE 4.1: RLS POLICIES
-- Dashboard ADS S4X

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheet_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_data_snapshots ENABLE ROW LEVEL SECURITY;

-- 1. POLICIES PARA PROFILES
-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = auth_user_id);

-- Admin/Owner podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

-- 2. POLICIES PARA CLIENTS
-- Admin/Owner podem gerenciar clientes
CREATE POLICY "Admins can manage clients" ON public.clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

-- Clientes podem ver os dados de sua própria empresa
CREATE POLICY "Clients can view own client data" ON public.clients
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    JOIN public.profiles p ON p.id = cu.user_id
    WHERE p.auth_user_id = auth.uid() AND cu.client_id = public.clients.id
  )
);

-- 3. POLICIES PARA DASHBOARDS
-- Admin/Owner podem gerenciar dashboards
CREATE POLICY "Admins can manage dashboards" ON public.dashboards
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

-- Clientes podem ver dashboards vinculados
CREATE POLICY "Clients can view linked dashboards" ON public.dashboards
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    JOIN public.profiles p ON p.id = cu.user_id
    WHERE p.auth_user_id = auth.uid() AND cu.client_id = public.dashboards.client_id
  )
);

-- 4. POLICIES PARA DATA_SOURCES E CONFIGS (Apenas Admin/Owner)
CREATE POLICY "Admins only access data_sources" ON public.data_sources
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

CREATE POLICY "Admins only access google_sheet_sources" ON public.google_sheet_sources
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

-- 5. POLICIES PARA LOGS (Apenas Admin/Owner)
CREATE POLICY "Admins only access import_logs" ON public.import_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

-- 6. POLICIES PARA SNAPSHOTS
-- Admin/Owner podem gerenciar snapshots
CREATE POLICY "Admins can manage snapshots" ON public.dashboard_data_snapshots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
  )
);

-- Clientes podem ver snapshots de seus dashboards
CREATE POLICY "Clients can view own snapshots" ON public.dashboard_data_snapshots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    JOIN public.profiles p ON p.id = cu.user_id
    WHERE p.auth_user_id = auth.uid() AND cu.client_id = public.dashboard_data_snapshots.client_id
  )
);
