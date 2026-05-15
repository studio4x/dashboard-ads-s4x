-- Adiciona novos tipos de template e colunas de suporte
ALTER TABLE public.dashboards 
DROP CONSTRAINT IF EXISTS dashboards_dashboard_type_check;

ALTER TABLE public.dashboards 
ADD CONSTRAINT dashboards_dashboard_type_check 
CHECK (dashboard_type IN ('google_ads', 'meta_ads', 'google_ads_meta_ads', 'custom', 'google_ads_s4x', 'meta_ads_s4x'));

ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS template_version TEXT DEFAULT '1.0';

ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Atualiza dashboards existentes para o novo padrão se necessário
UPDATE public.dashboards 
SET platform = 'google_ads' 
WHERE dashboard_type = 'google_ads' AND platform IS NULL;

UPDATE public.dashboards 
SET platform = 'meta_ads' 
WHERE dashboard_type = 'meta_ads' AND platform IS NULL;
