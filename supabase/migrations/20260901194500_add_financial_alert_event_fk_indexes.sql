-- Cover foreign keys used by financial-alert audit queries and cascades.
create index if not exists idx_ads_financial_alert_events_client
  on public.ads_financial_alert_events(client_id, created_at desc);

create index if not exists idx_ads_financial_alert_events_dashboard
  on public.ads_financial_alert_events(dashboard_id, created_at desc);
