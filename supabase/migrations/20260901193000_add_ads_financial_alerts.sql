-- Per-account financial alerts for native Google Ads / Meta Ads sources.

create table if not exists public.ads_financial_alert_settings (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null check (provider in ('google_ads', 'meta_ads')),
  account_id text not null,
  account_name text,
  currency text,
  enabled boolean not null default false,
  threshold_amount numeric(18,2) not null default 100 check (threshold_amount >= 0),
  repeat_interval_hours integer not null default 24 check (repeat_interval_hours between 1 and 720),
  last_state text not null default 'unknown' check (last_state in ('unknown', 'healthy', 'below_threshold')),
  last_observed_amount numeric(18,2),
  last_observed_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, provider, account_id)
);

create index if not exists idx_ads_financial_alert_settings_client
  on public.ads_financial_alert_settings(client_id, enabled);
create index if not exists idx_ads_financial_alert_settings_dashboard
  on public.ads_financial_alert_settings(dashboard_id, enabled);

create table if not exists public.ads_financial_alert_events (
  id uuid primary key default gen_random_uuid(),
  setting_id uuid not null references public.ads_financial_alert_settings(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null check (provider in ('google_ads', 'meta_ads')),
  account_id text not null,
  amount numeric(18,2) not null,
  threshold numeric(18,2) not null,
  currency text,
  decision text not null,
  detected_at timestamptz not null default now(),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'error')),
  notified_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ads_financial_alert_events_setting_created
  on public.ads_financial_alert_events(setting_id, created_at desc);
create index if not exists idx_ads_financial_alert_events_status
  on public.ads_financial_alert_events(notification_status, created_at desc);

alter table public.ads_financial_alert_settings enable row level security;
alter table public.ads_financial_alert_events enable row level security;

revoke all on public.ads_financial_alert_settings from public, anon;
revoke all on public.ads_financial_alert_events from public, anon;
grant select, insert, update, delete on public.ads_financial_alert_settings to authenticated;
grant select on public.ads_financial_alert_events to authenticated;
grant all on public.ads_financial_alert_settings to service_role;
grant all on public.ads_financial_alert_events to service_role;

drop policy if exists "Admins manage financial alert settings" on public.ads_financial_alert_settings;
create policy "Admins manage financial alert settings"
  on public.ads_financial_alert_settings
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins read financial alert events" on public.ads_financial_alert_events;
create policy "Admins read financial alert events"
  on public.ads_financial_alert_events
  for select
  to authenticated
  using ((select public.is_admin_or_owner()));

drop trigger if exists update_ads_financial_alert_settings_modtime on public.ads_financial_alert_settings;
create trigger update_ads_financial_alert_settings_modtime
before update on public.ads_financial_alert_settings
for each row execute procedure public.update_updated_at_column();

create or replace function public.evaluate_ads_financial_alert(
  p_setting_id uuid,
  p_amount numeric,
  p_observed_at timestamptz default now()
)
returns table (
  event_id uuid,
  decision text,
  previous_state text,
  new_state text,
  should_alert boolean,
  previous_notified_at timestamptz,
  threshold_amount numeric
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  s public.ads_financial_alert_settings%rowtype;
  v_previous_state text;
  v_decision text;
  v_should_alert boolean := false;
  v_event_id uuid := null;
  v_previous_notified_at timestamptz;
begin
  if p_amount is null then
    raise exception 'p_amount is required';
  end if;

  select * into s
  from public.ads_financial_alert_settings
  where id = p_setting_id
  for update;

  if not found then
    raise exception 'financial alert setting not found';
  end if;

  v_previous_state := s.last_state;
  v_previous_notified_at := s.last_notified_at;

  if not s.enabled then
    v_decision := 'alert_disabled';
    update public.ads_financial_alert_settings
      set last_observed_amount = p_amount, last_observed_at = p_observed_at
      where id = s.id;
  elsif p_amount >= s.threshold_amount then
    v_decision := 'healthy';
    update public.ads_financial_alert_settings
      set last_state = 'healthy', last_observed_amount = p_amount, last_observed_at = p_observed_at
      where id = s.id;
  else
    if s.last_state <> 'below_threshold' then
      v_decision := 'crossed_below_threshold';
      v_should_alert := true;
    elsif s.last_notified_at is null
       or s.last_notified_at <= p_observed_at - make_interval(hours => s.repeat_interval_hours) then
      v_decision := 'repeat_alert_due';
      v_should_alert := true;
    else
      v_decision := 'still_below_suppressed';
    end if;

    if v_should_alert then
      insert into public.ads_financial_alert_events (
        setting_id, dashboard_id, client_id, provider, account_id,
        amount, threshold, currency, decision, detected_at, notification_status
      ) values (
        s.id, s.dashboard_id, s.client_id, s.provider, s.account_id,
        p_amount, s.threshold_amount, s.currency, v_decision, p_observed_at, 'pending'
      ) returning id into v_event_id;

      update public.ads_financial_alert_settings
        set last_state = 'below_threshold',
            last_observed_amount = p_amount,
            last_observed_at = p_observed_at,
            last_notified_at = p_observed_at
        where id = s.id;
    else
      update public.ads_financial_alert_settings
        set last_state = 'below_threshold',
            last_observed_amount = p_amount,
            last_observed_at = p_observed_at
        where id = s.id;
    end if;
  end if;

  return query select
    v_event_id,
    v_decision,
    v_previous_state,
    case when p_amount >= s.threshold_amount then 'healthy' else 'below_threshold' end,
    v_should_alert,
    v_previous_notified_at,
    s.threshold_amount;
end;
$$;

revoke all on function public.evaluate_ads_financial_alert(uuid, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.evaluate_ads_financial_alert(uuid, numeric, timestamptz) to service_role;

create or replace function public.finalize_ads_financial_alert_event(
  p_event_id uuid,
  p_success boolean,
  p_error text default null
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  e public.ads_financial_alert_events%rowtype;
begin
  select * into e
  from public.ads_financial_alert_events
  where id = p_event_id
  for update;

  if not found then return false; end if;

  if p_success then
    update public.ads_financial_alert_events
      set notification_status = 'sent', notified_at = now(), error_message = null
      where id = e.id;
  else
    update public.ads_financial_alert_events
      set notification_status = 'error', error_message = left(coalesce(p_error, 'delivery failed'), 1000)
      where id = e.id;
    update public.ads_financial_alert_settings
      set last_notified_at = null
      where id = e.setting_id and last_notified_at = e.detected_at;
  end if;
  return true;
end;
$$;

revoke all on function public.finalize_ads_financial_alert_event(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finalize_ads_financial_alert_event(uuid, boolean, text) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'financial-alerts-cron') then
    perform cron.unschedule('financial-alerts-cron');
  end if;
end $$;

select cron.schedule(
  'financial-alerts-cron',
  '35 * * * *',
  $cron$
  select net.http_post(
    url := 'https://dashboardads.studio4x.com.br/api/cron/financial-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'CRON_SECRET'
        order by created_at desc
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
