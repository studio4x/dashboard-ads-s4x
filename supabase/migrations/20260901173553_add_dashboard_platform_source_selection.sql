alter table public.dashboards
  add column if not exists google_metrics_source_id uuid
    references public.data_sources(id) on delete set null,
  add column if not exists meta_metrics_source_id uuid
    references public.data_sources(id) on delete set null;

create index if not exists idx_dashboards_google_metrics_source_id
  on public.dashboards(google_metrics_source_id)
  where google_metrics_source_id is not null;

create index if not exists idx_dashboards_meta_metrics_source_id
  on public.dashboards(meta_metrics_source_id)
  where meta_metrics_source_id is not null;

comment on column public.dashboards.google_metrics_source_id is
  'Fonte escolhida para o papel Google Ads em dashboards consolidados.';

comment on column public.dashboards.meta_metrics_source_id is
  'Fonte escolhida para o papel Meta Ads em dashboards consolidados.';
