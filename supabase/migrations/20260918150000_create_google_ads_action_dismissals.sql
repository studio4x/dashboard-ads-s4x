-- Sugestões S4X descartadas pelo administrador, separadas do histórico de execução.
CREATE TABLE IF NOT EXISTS public.google_ads_action_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
    action_key TEXT NOT NULL,
    action_title TEXT NOT NULL,
    dismissed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT google_ads_action_dismissals_source_action_unique UNIQUE (data_source_id, action_key)
);

CREATE INDEX IF NOT EXISTS idx_google_ads_action_dismissals_source
    ON public.google_ads_action_dismissals (data_source_id, dismissed_at DESC);

ALTER TABLE public.google_ads_action_dismissals ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.google_ads_action_dismissals IS
    'Sugestões de otimização S4X do Google Ads ocultadas pelo administrador.';
