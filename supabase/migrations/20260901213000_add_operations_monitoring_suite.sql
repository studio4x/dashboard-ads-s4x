-- Operations monitoring suite: admin recipients, stale-source alerts, performance anomalies,
-- and financial coverage thresholds.

create table if not exists public.admin_notification_settings (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'default' unique check (scope = 'default'),
  emails text[] not null default '{}'::text[],
  phones text[] not null default '{}'::text[],
  from_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_notification_settings enable row level security;
revoke all on public.admin_notification_settings from public, anon;
grant select, insert, update, delete on public.admin_notification_settings to authenticated;
grant all on public.admin_notification_settings to service_role;
drop policy if exists "Admins manage admin notification settings" on public.admin_notification_settings;
create policy "Admins manage admin notification settings"
  on public.admin_notification_settings
  for all to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop trigger if exists update_admin_notification_settings_modtime on public.admin_notification_settings;
create trigger update_admin_notification_settings_modtime
before update on public.admin_notification_settings
for each row execute procedure public.update_updated_at_column();

insert into public.admin_notification_settings(scope)
values ('default')
on conflict (scope) do nothing;

create table if not exists public.source_monitoring_settings (
  data_source_id uuid primary key references public.data_sources(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  enabled boolean not null default false,
  stale_after_minutes integer not null default 180 check (stale_after_minutes between 30 and 10080),
  repeat_interval_hours integer not null default 24 check (repeat_interval_hours between 1 and 720),
  last_state text not null default 'unknown' check (last_state in ('unknown','healthy','stale')),
  last_checked_at timestamptz,
  last_fresh_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_monitoring_settings_client
  on public.source_monitoring_settings(client_id, enabled);
create index if not exists idx_source_monitoring_settings_dashboard
  on public.source_monitoring_settings(dashboard_id, enabled);

create table if not exists public.source_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.source_monitoring_settings(data_source_id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  source_type text not null,
  source_name text,
  fresh_at timestamptz,
  age_minutes integer,
  threshold_minutes integer not null,
  decision text not null,
  detected_at timestamptz not null default now(),
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','error','skipped')),
  notified_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_source_monitoring_events_source_created
  on public.source_monitoring_events(data_source_id, created_at desc);
create index if not exists idx_source_monitoring_events_client_created
  on public.source_monitoring_events(client_id, created_at desc);
create index if not exists idx_source_monitoring_events_status
  on public.source_monitoring_events(notification_status, created_at desc);

alter table public.source_monitoring_settings enable row level security;
alter table public.source_monitoring_events enable row level security;
revoke all on public.source_monitoring_settings from public, anon;
revoke all on public.source_monitoring_events from public, anon;
grant select, insert, update, delete on public.source_monitoring_settings to authenticated;
grant select on public.source_monitoring_events to authenticated;
grant all on public.source_monitoring_settings to service_role;
grant all on public.source_monitoring_events to service_role;

drop policy if exists "Admins manage source monitoring settings" on public.source_monitoring_settings;
create policy "Admins manage source monitoring settings"
  on public.source_monitoring_settings
  for all to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins read source monitoring events" on public.source_monitoring_events;
create policy "Admins read source monitoring events"
  on public.source_monitoring_events
  for select to authenticated
  using ((select public.is_admin_or_owner()));

drop trigger if exists update_source_monitoring_settings_modtime on public.source_monitoring_settings;
create trigger update_source_monitoring_settings_modtime
before update on public.source_monitoring_settings
for each row execute procedure public.update_updated_at_column();

create or replace function public.evaluate_source_freshness_alert(
  p_data_source_id uuid,
  p_fresh_at timestamptz,
  p_checked_at timestamptz default now(),
  p_source_type text default 'unknown',
  p_source_name text default null
)
returns table (
  event_id uuid,
  decision text,
  previous_state text,
  new_state text,
  should_alert boolean,
  age_minutes integer
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  s public.source_monitoring_settings%rowtype;
  v_previous_state text;
  v_decision text;
  v_should_alert boolean := false;
  v_event_id uuid := null;
  v_age integer;
begin
  select * into s
  from public.source_monitoring_settings
  where data_source_id = p_data_source_id
  for update;

  if not found then
    raise exception 'source monitoring setting not found';
  end if;

  v_previous_state := s.last_state;
  if p_fresh_at is null then
    v_age := null;
  else
    v_age := greatest(0, floor(extract(epoch from (p_checked_at - p_fresh_at)) / 60)::integer);
  end if;

  if not s.enabled then
    v_decision := 'monitoring_disabled';
    update public.source_monitoring_settings
      set last_checked_at = p_checked_at, last_fresh_at = p_fresh_at
      where data_source_id = s.data_source_id;
  elsif p_fresh_at is not null and v_age <= s.stale_after_minutes then
    v_decision := case when s.last_state = 'stale' then 'recovered' else 'healthy' end;
    update public.source_monitoring_settings
      set last_state = 'healthy', last_checked_at = p_checked_at, last_fresh_at = p_fresh_at
      where data_source_id = s.data_source_id;
  else
    if s.last_state <> 'stale' then
      v_decision := 'became_stale';
      v_should_alert := true;
    elsif s.last_notified_at is null
       or s.last_notified_at <= p_checked_at - make_interval(hours => s.repeat_interval_hours) then
      v_decision := 'repeat_stale_due';
      v_should_alert := true;
    else
      v_decision := 'still_stale_suppressed';
    end if;

    if v_should_alert then
      insert into public.source_monitoring_events (
        data_source_id, client_id, dashboard_id, source_type, source_name,
        fresh_at, age_minutes, threshold_minutes, decision, detected_at, notification_status
      ) values (
        s.data_source_id, s.client_id, s.dashboard_id, p_source_type, p_source_name,
        p_fresh_at, v_age, s.stale_after_minutes, v_decision, p_checked_at, 'pending'
      ) returning id into v_event_id;

      update public.source_monitoring_settings
        set last_state = 'stale', last_checked_at = p_checked_at, last_fresh_at = p_fresh_at,
            last_notified_at = p_checked_at
        where data_source_id = s.data_source_id;
    else
      update public.source_monitoring_settings
        set last_state = 'stale', last_checked_at = p_checked_at, last_fresh_at = p_fresh_at
        where data_source_id = s.data_source_id;
    end if;
  end if;

  return query select
    v_event_id,
    v_decision,
    v_previous_state,
    case when p_fresh_at is not null and v_age <= s.stale_after_minutes then 'healthy' else 'stale' end,
    v_should_alert,
    v_age;
end;
$$;

revoke all on function public.evaluate_source_freshness_alert(uuid,timestamptz,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.evaluate_source_freshness_alert(uuid,timestamptz,timestamptz,text,text) to service_role;

create or replace function public.finalize_source_monitoring_event(
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
  e public.source_monitoring_events%rowtype;
begin
  select * into e from public.source_monitoring_events where id = p_event_id for update;
  if not found then return false; end if;

  if p_success then
    update public.source_monitoring_events
      set notification_status = 'sent', notified_at = now(), error_message = null
      where id = e.id;
  else
    update public.source_monitoring_events
      set notification_status = 'error', error_message = left(coalesce(p_error,'delivery failed'),1000)
      where id = e.id;
    update public.source_monitoring_settings
      set last_notified_at = null
      where data_source_id = e.data_source_id and last_notified_at = e.detected_at;
  end if;
  return true;
end;
$$;

revoke all on function public.finalize_source_monitoring_event(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.finalize_source_monitoring_event(uuid,boolean,text) to service_role;

create table if not exists public.performance_anomaly_settings (
  dashboard_id uuid primary key references public.dashboards(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  enabled boolean not null default false,
  recent_days integer not null default 3 check (recent_days between 1 and 14),
  baseline_days integer not null default 14 check (baseline_days between 7 and 60),
  cpa_increase_pct numeric(8,2) not null default 35 check (cpa_increase_pct >= 5),
  ctr_drop_pct numeric(8,2) not null default 30 check (ctr_drop_pct >= 5),
  conversions_drop_pct numeric(8,2) not null default 40 check (conversions_drop_pct >= 5),
  spend_increase_pct numeric(8,2) not null default 40 check (spend_increase_pct >= 5),
  zero_results_days integer not null default 2 check (zero_results_days between 1 and 14),
  min_baseline_spend numeric(18,2) not null default 30 check (min_baseline_spend >= 0),
  repeat_interval_hours integer not null default 24 check (repeat_interval_hours between 1 and 720),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_performance_anomaly_settings_client
  on public.performance_anomaly_settings(client_id, enabled);

create table if not exists public.performance_anomaly_states (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.performance_anomaly_settings(dashboard_id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  anomaly_key text not null,
  state text not null default 'healthy' check (state in ('healthy','active')),
  last_seen_at timestamptz,
  last_notified_at timestamptz,
  last_current_value numeric,
  last_baseline_value numeric,
  last_change_pct numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id, anomaly_key)
);

create table if not exists public.performance_anomaly_events (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  anomaly_key text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  current_value numeric,
  baseline_value numeric,
  change_pct numeric,
  detected_at timestamptz not null default now(),
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','error')),
  notified_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_performance_anomaly_states_client
  on public.performance_anomaly_states(client_id, state);
create index if not exists idx_performance_anomaly_events_dashboard_created
  on public.performance_anomaly_events(dashboard_id, created_at desc);
create index if not exists idx_performance_anomaly_events_client_created
  on public.performance_anomaly_events(client_id, created_at desc);
create index if not exists idx_performance_anomaly_events_status
  on public.performance_anomaly_events(notification_status, created_at desc);

alter table public.performance_anomaly_settings enable row level security;
alter table public.performance_anomaly_states enable row level security;
alter table public.performance_anomaly_events enable row level security;
revoke all on public.performance_anomaly_settings from public, anon;
revoke all on public.performance_anomaly_states from public, anon;
revoke all on public.performance_anomaly_events from public, anon;
grant select, insert, update, delete on public.performance_anomaly_settings to authenticated;
grant select on public.performance_anomaly_states to authenticated;
grant select on public.performance_anomaly_events to authenticated;
grant all on public.performance_anomaly_settings to service_role;
grant all on public.performance_anomaly_states to service_role;
grant all on public.performance_anomaly_events to service_role;

drop policy if exists "Admins manage performance anomaly settings" on public.performance_anomaly_settings;
create policy "Admins manage performance anomaly settings"
  on public.performance_anomaly_settings
  for all to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins read performance anomaly states" on public.performance_anomaly_states;
create policy "Admins read performance anomaly states"
  on public.performance_anomaly_states
  for select to authenticated
  using ((select public.is_admin_or_owner()));

drop policy if exists "Admins read performance anomaly events" on public.performance_anomaly_events;
create policy "Admins read performance anomaly events"
  on public.performance_anomaly_events
  for select to authenticated
  using ((select public.is_admin_or_owner()));

drop trigger if exists update_performance_anomaly_settings_modtime on public.performance_anomaly_settings;
create trigger update_performance_anomaly_settings_modtime
before update on public.performance_anomaly_settings
for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_performance_anomaly_states_modtime on public.performance_anomaly_states;
create trigger update_performance_anomaly_states_modtime
before update on public.performance_anomaly_states
for each row execute procedure public.update_updated_at_column();

create or replace function public.evaluate_performance_anomaly(
  p_dashboard_id uuid,
  p_client_id uuid,
  p_anomaly_key text,
  p_is_anomaly boolean,
  p_title text,
  p_message text,
  p_current_value numeric,
  p_baseline_value numeric,
  p_change_pct numeric,
  p_severity text default 'warning',
  p_repeat_interval_hours integer default 24,
  p_detected_at timestamptz default now()
)
returns table(event_id uuid, decision text, should_alert boolean, previous_state text, new_state text)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  s public.performance_anomaly_states%rowtype;
  v_previous text;
  v_decision text;
  v_should boolean := false;
  v_event uuid := null;
begin
  insert into public.performance_anomaly_states(dashboard_id, client_id, anomaly_key)
  values (p_dashboard_id, p_client_id, p_anomaly_key)
  on conflict (dashboard_id, anomaly_key) do nothing;

  select * into s
  from public.performance_anomaly_states
  where dashboard_id = p_dashboard_id and anomaly_key = p_anomaly_key
  for update;

  v_previous := s.state;

  if not p_is_anomaly then
    v_decision := case when s.state = 'active' then 'resolved' else 'healthy' end;
    update public.performance_anomaly_states
      set state='healthy', last_seen_at=p_detected_at,
          last_current_value=p_current_value, last_baseline_value=p_baseline_value, last_change_pct=p_change_pct
      where id=s.id;
  else
    if s.state <> 'active' then
      v_decision := 'new_anomaly';
      v_should := true;
    elsif s.last_notified_at is null
       or s.last_notified_at <= p_detected_at - make_interval(hours => p_repeat_interval_hours) then
      v_decision := 'repeat_anomaly_due';
      v_should := true;
    else
      v_decision := 'active_anomaly_suppressed';
    end if;

    if v_should then
      insert into public.performance_anomaly_events(
        dashboard_id, client_id, anomaly_key, severity, title, message,
        current_value, baseline_value, change_pct, detected_at, notification_status
      ) values (
        p_dashboard_id, p_client_id, p_anomaly_key, p_severity, p_title, p_message,
        p_current_value, p_baseline_value, p_change_pct, p_detected_at, 'pending'
      ) returning id into v_event;

      update public.performance_anomaly_states
        set state='active', last_seen_at=p_detected_at, last_notified_at=p_detected_at,
            last_current_value=p_current_value, last_baseline_value=p_baseline_value, last_change_pct=p_change_pct
        where id=s.id;
    else
      update public.performance_anomaly_states
        set state='active', last_seen_at=p_detected_at,
            last_current_value=p_current_value, last_baseline_value=p_baseline_value, last_change_pct=p_change_pct
        where id=s.id;
    end if;
  end if;

  return query select v_event, v_decision, v_should, v_previous,
    case when p_is_anomaly then 'active' else 'healthy' end;
end;
$$;

revoke all on function public.evaluate_performance_anomaly(uuid,uuid,text,boolean,text,text,numeric,numeric,numeric,text,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.evaluate_performance_anomaly(uuid,uuid,text,boolean,text,text,numeric,numeric,numeric,text,integer,timestamptz) to service_role;

create or replace function public.finalize_performance_anomaly_event(
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
  e public.performance_anomaly_events%rowtype;
begin
  select * into e from public.performance_anomaly_events where id=p_event_id for update;
  if not found then return false; end if;

  if p_success then
    update public.performance_anomaly_events
      set notification_status='sent', notified_at=now(), error_message=null
      where id=e.id;
  else
    update public.performance_anomaly_events
      set notification_status='error', error_message=left(coalesce(p_error,'delivery failed'),1000)
      where id=e.id;
    update public.performance_anomaly_states
      set last_notified_at=null
      where dashboard_id=e.dashboard_id and anomaly_key=e.anomaly_key and last_notified_at=e.detected_at;
  end if;
  return true;
end;
$$;

revoke all on function public.finalize_performance_anomaly_event(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.finalize_performance_anomaly_event(uuid,boolean,text) to service_role;

alter table public.ads_financial_alert_settings
  add column if not exists amount_alert_enabled boolean not null default true,
  add column if not exists days_alert_enabled boolean not null default false,
  add column if not exists threshold_days numeric(8,2) not null default 2 check (threshold_days >= 0),
  add column if not exists last_observed_days_remaining numeric(8,2),
  add column if not exists last_trigger_type text;

alter table public.ads_financial_alert_events
  add column if not exists days_remaining numeric(8,2),
  add column if not exists threshold_days numeric(8,2),
  add column if not exists trigger_type text;

create or replace function public.evaluate_ads_financial_alert_v2(
  p_setting_id uuid,
  p_amount numeric,
  p_days_remaining numeric default null,
  p_observed_at timestamptz default now()
)
returns table (
  event_id uuid,
  decision text,
  previous_state text,
  new_state text,
  should_alert boolean,
  previous_notified_at timestamptz,
  threshold_amount numeric,
  threshold_days numeric,
  trigger_type text
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
  v_amount_triggered boolean := false;
  v_days_triggered boolean := false;
  v_is_triggered boolean := false;
  v_trigger_type text := null;
begin
  if p_amount is null then raise exception 'p_amount is required'; end if;

  select * into s from public.ads_financial_alert_settings where id=p_setting_id for update;
  if not found then raise exception 'financial alert setting not found'; end if;

  v_previous_state := s.last_state;
  v_previous_notified_at := s.last_notified_at;
  v_amount_triggered := s.amount_alert_enabled and p_amount < s.threshold_amount;
  v_days_triggered := s.days_alert_enabled and p_days_remaining is not null and p_days_remaining < s.threshold_days;
  v_is_triggered := v_amount_triggered or v_days_triggered;
  v_trigger_type := case
    when v_amount_triggered and v_days_triggered then 'amount_and_days'
    when v_amount_triggered then 'amount'
    when v_days_triggered then 'days_remaining'
    else null end;

  if not s.enabled then
    v_decision := 'alert_disabled';
    update public.ads_financial_alert_settings
      set last_observed_amount=p_amount, last_observed_days_remaining=p_days_remaining,
          last_observed_at=p_observed_at, last_trigger_type=null
      where id=s.id;
  elsif not v_is_triggered then
    v_decision := 'healthy';
    update public.ads_financial_alert_settings
      set last_state='healthy', last_observed_amount=p_amount,
          last_observed_days_remaining=p_days_remaining, last_observed_at=p_observed_at,
          last_trigger_type=null
      where id=s.id;
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
      insert into public.ads_financial_alert_events(
        setting_id,dashboard_id,client_id,provider,account_id,amount,threshold,currency,
        decision,detected_at,notification_status,days_remaining,threshold_days,trigger_type
      ) values (
        s.id,s.dashboard_id,s.client_id,s.provider,s.account_id,p_amount,s.threshold_amount,s.currency,
        v_decision,p_observed_at,'pending',p_days_remaining,s.threshold_days,v_trigger_type
      ) returning id into v_event_id;

      update public.ads_financial_alert_settings
        set last_state='below_threshold', last_observed_amount=p_amount,
            last_observed_days_remaining=p_days_remaining, last_observed_at=p_observed_at,
            last_notified_at=p_observed_at, last_trigger_type=v_trigger_type
        where id=s.id;
    else
      update public.ads_financial_alert_settings
        set last_state='below_threshold', last_observed_amount=p_amount,
            last_observed_days_remaining=p_days_remaining, last_observed_at=p_observed_at,
            last_trigger_type=v_trigger_type
        where id=s.id;
    end if;
  end if;

  return query select v_event_id,v_decision,v_previous_state,
    case when v_is_triggered then 'below_threshold' else 'healthy' end,
    v_should_alert,v_previous_notified_at,s.threshold_amount,s.threshold_days,v_trigger_type;
end;
$$;

revoke all on function public.evaluate_ads_financial_alert_v2(uuid,numeric,numeric,timestamptz) from public, anon, authenticated;
grant execute on function public.evaluate_ads_financial_alert_v2(uuid,numeric,numeric,timestamptz) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname='operations-monitoring-cron') then
    perform cron.unschedule('operations-monitoring-cron');
  end if;
end $$;

select cron.schedule(
  'operations-monitoring-cron',
  '45 * * * *',
  $cron$
  select net.http_post(
    url := 'https://dashboardads.studio4x.com.br/api/cron/operations-monitoring',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name='CRON_SECRET' order by created_at desc limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
