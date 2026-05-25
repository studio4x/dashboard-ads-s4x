ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS automation_report_mode TEXT NOT NULL DEFAULT 'both';

COMMENT ON COLUMN public.dashboards.automation_report_mode IS 'Modo de payload para automação: analysis_only | metrics_only | both';
