-- Checklist persistente do plano de ação da análise Google Ads.
-- O acesso de leitura/escrita é feito apenas pelo backend administrativo (service role).

CREATE TABLE IF NOT EXISTS public.google_ads_action_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
    action_key TEXT NOT NULL,
    action_title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT google_ads_action_progress_source_action_unique UNIQUE (data_source_id, action_key)
);

CREATE INDEX IF NOT EXISTS idx_google_ads_action_progress_source
    ON public.google_ads_action_progress (data_source_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_action_progress_completed
    ON public.google_ads_action_progress (data_source_id, completed);

ALTER TABLE public.google_ads_action_progress ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.google_ads_action_progress IS
    'Progresso administrativo das ações sugeridas na análise de performance Google Ads.';
COMMENT ON COLUMN public.google_ads_action_progress.action_key IS
    'Hash estável do título normalizado da ação dentro da fonte Google Ads.';
