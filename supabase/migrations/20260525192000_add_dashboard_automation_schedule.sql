ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automation_frequency TEXT NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS automation_day_of_week SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS automation_hour SMALLINT NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS automation_minute SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS automation_period_days SMALLINT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS automation_channels TEXT[] NOT NULL DEFAULT ARRAY['email', 'whatsapp']::TEXT[],
  ADD COLUMN IF NOT EXISTS automation_last_dispatched_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.dashboards.automation_enabled IS 'Se true, dashboard participa do disparo automático para n8n.';
COMMENT ON COLUMN public.dashboards.automation_frequency IS 'Frequência do disparo automático: daily | weekly.';
COMMENT ON COLUMN public.dashboards.automation_day_of_week IS 'Dia da semana para frequência weekly (0=domingo ... 6=sábado).';
COMMENT ON COLUMN public.dashboards.automation_hour IS 'Hora local (0-23) do disparo automático.';
COMMENT ON COLUMN public.dashboards.automation_minute IS 'Minuto local (0-59) do disparo automático.';
COMMENT ON COLUMN public.dashboards.automation_period_days IS 'Janela do período do relatório em dias (ex: 7 = últimos 7 dias).';
COMMENT ON COLUMN public.dashboards.automation_channels IS 'Canais padrão enviados ao webhook n8n.';
COMMENT ON COLUMN public.dashboards.automation_last_dispatched_at IS 'Último horário de disparo automático realizado para evitar duplicidade.';
