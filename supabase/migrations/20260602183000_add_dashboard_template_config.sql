ALTER TABLE public.dashboards
ADD COLUMN IF NOT EXISTS template_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.dashboards.template_config IS 'Configuração de métricas, formatos e seções por template de dashboard.';

UPDATE public.dashboards
SET template_config = '{}'::jsonb
WHERE template_config IS NULL;
