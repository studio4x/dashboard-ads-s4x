alter table public.ads_financial_alert_checks
  add column if not exists observed_days_remaining numeric(8,2),
  add column if not exists threshold_days numeric(8,2),
  add column if not exists trigger_type text;
