CREATE TABLE IF NOT EXISTS public.dashboard_template_configs (
  template_id TEXT PRIMARY KEY,
  metric_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dashboard_template_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage dashboard template configs" ON public.dashboard_template_configs;
CREATE POLICY "Admin can manage dashboard template configs"
ON public.dashboard_template_configs
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.dashboard_template_configs IS 'Configuração global dos templates de dashboard, incluindo métricas, formatos e ordenação.';
COMMENT ON COLUMN public.dashboard_template_configs.metric_config IS 'Configuração global de métricas e objetivos do template.';
COMMENT ON COLUMN public.dashboard_template_configs.updated_at IS 'Data de atualização da configuração do template.';
