alter table public.google_ads_action_progress
  add column if not exists status text not null default 'pending',
  add column if not exists note text,
  add column if not exists started_at timestamptz,
  add column if not exists validated_at timestamptz,
  add column if not exists metrics_before jsonb,
  add column if not exists metrics_after jsonb,
  add column if not exists period_from date,
  add column if not exists period_to date;

update public.google_ads_action_progress
set status = case when completed then 'completed' else 'pending' end
where status is null or status = 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'google_ads_action_progress_status_check'
  ) then
    alter table public.google_ads_action_progress
      add constraint google_ads_action_progress_status_check
      check (status in ('pending','in_progress','completed','validated'));
  end if;
end $$;

create table if not exists public.google_ads_analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  period_days integer not null,
  metrics jsonb not null default '{}'::jsonb,
  auction jsonb not null default '{}'::jsonb,
  diagnosis text,
  health jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, period_start, period_end)
);

create index if not exists idx_google_ads_analysis_snapshots_source_end
  on public.google_ads_analysis_snapshots(data_source_id, period_end desc);

create index if not exists idx_google_ads_action_progress_source_status
  on public.google_ads_action_progress(data_source_id, status, updated_at desc);
