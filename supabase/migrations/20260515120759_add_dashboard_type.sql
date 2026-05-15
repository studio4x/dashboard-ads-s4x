-- Adiciona o tipo de dashboard para suportar templates
ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS dashboard_type TEXT DEFAULT 'google_ads' 
CHECK (dashboard_type IN ('google_ads', 'meta_ads', 'google_ads_meta_ads', 'custom'));

-- Comentário explicativo
COMMENT ON COLUMN public.dashboards.dashboard_type IS 'Tipo do dashboard para orientar templates operacionais.';
