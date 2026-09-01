-- Persistent audit trail for every financial-alert cron execution and per-account evaluation.

create table if not exists public.ads_financial_alert_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  total_settings integer not null default 0 check (total_settings >= 0),
  healthy_count integer not null default 0 check (healthy_count >= 0),
  alerted_count integer not null default 0 check (alerted_count >= 0),
  suppressed_count integer not null default 0 check (suppressed_count >= 0),
  unavailable_count integer not null default 0 check (unavailable_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  status text not null check (status in ('success', 'partial_error', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ads_financial_alert_runs_started_at
  on public.ads_financial_alert_runs(started_at desc);

create table if not exists public.ads_financial_alert_checks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ads_financial_alert_runs(id) on delete cascade,
  setting_id uuid not null references public.ads_financial_alert_settings(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  provider text not null check (provider in ('google_ads', 'meta_ads')),
  account_id text not null,
  account_name text,
  currency text,
  observed_amount numeric(18,2),
  threshold numeric(18,2) not null,
  decision text not null,
  resulting_state text,
  alert_sent boolean not null default false,
  event_id uuid references public.ads_financial_alert_events(id) on delete set null,
  error_message text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (run_id, setting_id)
);

create index if not exists idx_ads_financial_alert_checks_observed_at
  on public.ads_financial_alert_checks(observed_at desc);
create index if not exists idx_ads_financial_alert_checks_client
  on public.ads_financial_alert_checks(client_id, observed_at desc);
create index if not exists idx_ads_financial_alert_checks_dashboard
  on public.ads_financial_alert_checks(dashboard_id, observed_at desc);
create index if not exists idx_ads_financial_alert_checks_setting
  on public.ads_financial_alert_checks(setting_id, observed_at desc);
create index if not exists idx_ads_financial_alert_checks_event
  on public.ads_financial_alert_checks(event_id)
  where event_id is not null;

alter table public.ads_financial_alert_runs enable row level security;
alter table public.ads_financial_alert_checks enable row level security;

revoke all on public.ads_financial_alert_runs from public, anon;
revoke all on public.ads_financial_alert_checks from public, anon;
grant select on public.ads_financial_alert_runs to authenticated;
grant select on public.ads_financial_alert_checks to authenticated;
grant all on public.ads_financial_alert_runs to service_role;
grant all on public.ads_financial_alert_checks to service_role;

drop policy if exists "Admins read financial alert runs" on public.ads_financial_alert_runs;
create policy "Admins read financial alert runs"
  on public.ads_financial_alert_runs
  for select
  to authenticated
  using ((select public.is_admin_or_owner()));

drop policy if exists "Admins read financial alert checks" on public.ads_financial_alert_checks;
create policy "Admins read financial alert checks"
  on public.ads_financial_alert_checks
  for select
  to authenticated
  using ((select public.is_admin_or_owner()));
