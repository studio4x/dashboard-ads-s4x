-- Track the AI analysis and PDF regeneration independently from the n8n completion status.
ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS automation_last_analysis_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS automation_last_analysis_generated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS automation_last_analysis_message TEXT NULL;

COMMENT ON COLUMN public.dashboards.automation_last_analysis_status IS 'Status da ultima geracao da analise de IA e do PDF (generating, success ou error).';
COMMENT ON COLUMN public.dashboards.automation_last_analysis_generated_at IS 'Momento em que a ultima analise de IA foi gerada com sucesso.';
COMMENT ON COLUMN public.dashboards.automation_last_analysis_message IS 'Mensagem tecnica ou informativa da ultima geracao da analise.';
