-- Store automation report windows as a selectable preset, preserving the legacy day count for compatibility.
ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS automation_period_preset TEXT NOT NULL DEFAULT 'last_7_days',
  ADD COLUMN IF NOT EXISTS automation_include_today BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.dashboards
SET automation_period_preset = CASE
  WHEN automation_period_days = 14 THEN 'last_14_days'
  WHEN automation_period_days = 30 THEN 'last_30_days'
  WHEN automation_period_days = 7 THEN 'last_7_days'
  ELSE 'last_7_days'
END
WHERE automation_period_preset IS NULL
   OR automation_period_preset = '';

COMMENT ON COLUMN public.dashboards.automation_period_preset IS 'Preset da janela de automação (last_7_days, last_14_days, last_30_days, last_week, this_month, last_month, all_time).';
COMMENT ON COLUMN public.dashboards.automation_include_today IS 'Indica se o período da automação inclui o dia atual.';
