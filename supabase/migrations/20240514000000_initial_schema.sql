-- PHASE 3: INITIAL SCHEMA
-- Dashboard ADS S4X

-- 1. PROFILES (Extensão do auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'client')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563EB',
    website_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENT_USERS (Relacionamento N:N entre usuários e clientes)
CREATE TABLE IF NOT EXISTS public.client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);

-- 4. DASHBOARDS
CREATE TABLE IF NOT EXISTS public.dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    default_period TEXT DEFAULT 'last_30_days',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, slug)
);

-- 5. DASHBOARD_PAGES
CREATE TABLE IF NOT EXISTS public.dashboard_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE,
    page_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dashboard_id, page_key)
);

-- 6. DATA_SOURCES
CREATE TABLE IF NOT EXISTS public.data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('google_sheets', 'google_ads', 'meta_ads', 'ga4', 'search_console')),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. GOOGLE_SHEET_SOURCES
CREATE TABLE IF NOT EXISTS public.google_sheet_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE UNIQUE,
    spreadsheet_id TEXT NOT NULL,
    spreadsheet_name TEXT,
    sheet_url TEXT,
    last_import_at TIMESTAMPTZ,
    last_import_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. IMPORT_LOGS
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    tabs_read TEXT[],
    rows_read INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    error_details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DASHBOARD_DATA_SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.dashboard_data_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    source_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_dashboards_client_id ON public.dashboards(client_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_dashboard_id ON public.dashboard_data_snapshots(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_logs_dashboard_id ON public.import_logs(dashboard_id);

-- FUNÇÃO PARA UPDATED_AT AUTOMÁTICO
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS PARA UPDATED_AT
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_dashboards_modtime BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_data_sources_modtime BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_google_sheet_sources_modtime BEFORE UPDATE ON public.google_sheet_sources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
