-- Create dashboard_share_links table
CREATE TABLE public.dashboard_share_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE public.dashboard_share_links ENABLE ROW LEVEL SECURITY;

-- Admins/Owners can read all share links
CREATE POLICY "Admins can read all share links" ON public.dashboard_share_links
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_user_id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

-- Admins/Owners can insert share links
CREATE POLICY "Admins can insert share links" ON public.dashboard_share_links
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_user_id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

-- Admins/Owners can update share links
CREATE POLICY "Admins can update share links" ON public.dashboard_share_links
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_user_id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_user_id = auth.uid() AND p.role IN ('owner', 'admin')
        )
    );

-- Public can read share links by token_hash (will use service role for fetching though, but good practice)
-- Actually, we'll fetch via service role since anonymous users don't have auth.uid().
-- So we can keep it strict.

-- Indexes
CREATE INDEX idx_dashboard_share_links_dashboard_id ON public.dashboard_share_links(dashboard_id);
CREATE INDEX idx_dashboard_share_links_token_hash ON public.dashboard_share_links(token_hash);
