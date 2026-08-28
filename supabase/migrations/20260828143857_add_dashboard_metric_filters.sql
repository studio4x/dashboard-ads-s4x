alter table public.dashboards
  add column if not exists metrics_filters jsonb not null default '{}'::jsonb;

alter table public.dashboards
  drop constraint if exists dashboards_metrics_filters_object_check;

alter table public.dashboards
  add constraint dashboards_metrics_filters_object_check
  check (jsonb_typeof(metrics_filters) = 'object');

comment on column public.dashboards.metrics_filters is
  'Filtros persistentes aplicados as metricas, analises, PDFs e links compartilhados do dashboard.';
