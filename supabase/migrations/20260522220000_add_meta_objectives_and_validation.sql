-- Meta Ads objectives + validation tracking

ALTER TABLE public.dashboards
ADD COLUMN IF NOT EXISTS meta_objectives TEXT[] DEFAULT '{}'::text[];

ALTER TABLE public.dashboards
ADD COLUMN IF NOT EXISTS meta_primary_objective TEXT;

ALTER TABLE public.dashboards
ADD COLUMN IF NOT EXISTS meta_validation_status TEXT DEFAULT 'not_configured'
CHECK (meta_validation_status IN ('not_configured', 'ok', 'missing_metrics'));

ALTER TABLE public.dashboards
ADD COLUMN IF NOT EXISTS meta_validation_notes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.dashboards
ADD COLUMN IF NOT EXISTS meta_validation_updated_at TIMESTAMPTZ;

ALTER TABLE public.google_sheet_sources
ADD COLUMN IF NOT EXISTS meta_validation_status TEXT DEFAULT 'not_configured'
CHECK (meta_validation_status IN ('not_configured', 'ok', 'missing_metrics'));

ALTER TABLE public.google_sheet_sources
ADD COLUMN IF NOT EXISTS meta_validation_notes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.google_sheet_sources
ADD COLUMN IF NOT EXISTS meta_validation_updated_at TIMESTAMPTZ;
