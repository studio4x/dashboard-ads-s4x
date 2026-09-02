create index if not exists idx_source_monitoring_events_dashboard
  on public.source_monitoring_events(dashboard_id, created_at desc);
