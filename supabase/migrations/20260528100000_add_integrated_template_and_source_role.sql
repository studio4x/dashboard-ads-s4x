-- Template integrado Google + Meta Ads S4X

ALTER TABLE public.dashboards
DROP CONSTRAINT IF EXISTS dashboards_dashboard_type_check;

ALTER TABLE public.dashboards
ADD CONSTRAINT dashboards_dashboard_type_check
CHECK (
  dashboard_type IN (
    'google_ads',
    'meta_ads',
    'google_ads_meta_ads',
    'custom',
    'google_ads_s4x',
    'meta_ads_s4x',
    'google_meta_ads_s4x'
  )
);

-- Papel da fonte Google Sheets para dashboards com múltiplas fontes
ALTER TABLE public.google_sheet_sources
ADD COLUMN IF NOT EXISTS source_role TEXT
CHECK (source_role IN ('google_ads', 'meta_ads'));

COMMENT ON COLUMN public.google_sheet_sources.source_role IS
'Papel da fonte no dashboard: google_ads ou meta_ads. Obrigatório para template integrado.';
