-- Historical analytical facts for the native Google Ads connector.
-- Google Sheets sources never write to these tables.

create table if not exists public.google_ads_analytics_rows (
  id bigint generated always as identity primary key,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  manager_customer_id text check (manager_customer_id is null or manager_customer_id ~ '^[0-9]{10}$'),
  dataset text not null check (dataset in (
    'campaign_daily','ad_group_daily','keyword_daily','search_terms_daily','pmax_search_terms_daily',
    'ad_daily','asset_daily','pmax_asset_group','pmax_asset_group_asset','device_daily','network_daily',
    'time_daily','location_daily','landing_page_daily','conversion_action_daily','placement_daily',
    'shopping_daily','demographics_age_daily','demographics_gender_daily'
  )),
  observed_date date,
  observed_at timestamptz not null default now(),
  row_key text not null,
  campaign_id text,
  ad_group_id text,
  criterion_id text,
  ad_id text,
  asset_id text,
  dimensions jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  derived_metrics jsonb not null default '{}'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, dataset, row_key)
);

create index if not exists idx_google_ads_analytics_source_dataset_date
  on public.google_ads_analytics_rows(data_source_id, dataset, observed_date);
create index if not exists idx_google_ads_analytics_campaign
  on public.google_ads_analytics_rows(data_source_id, campaign_id, observed_date);
create index if not exists idx_google_ads_analytics_ad_group
  on public.google_ads_analytics_rows(data_source_id, ad_group_id, observed_date);
create index if not exists idx_google_ads_analytics_dimensions
  on public.google_ads_analytics_rows using gin (dimensions);

create table if not exists public.google_ads_config_history (
  id bigint generated always as identity primary key,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  config_type text not null check (config_type in ('conversion_action','conversion_goal','campaign_budget','campaign_bidding','keyword_quality')),
  resource_name text not null,
  observed_on date not null,
  observed_at timestamptz not null default now(),
  campaign_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, config_type, resource_name, observed_on)
);

create index if not exists idx_google_ads_config_history_lookup
  on public.google_ads_config_history(data_source_id, config_type, observed_at desc);

create table if not exists public.google_ads_change_events (
  id bigint generated always as identity primary key,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  manager_customer_id text check (manager_customer_id is null or manager_customer_id ~ '^[0-9]{10}$'),
  google_resource_name text not null,
  change_date_time timestamptz not null,
  change_resource_name text,
  change_resource_type text,
  operation text,
  changed_fields jsonb not null default '{}'::jsonb,
  old_resource jsonb not null default '{}'::jsonb,
  new_resource jsonb not null default '{}'::jsonb,
  client_type text,
  user_email text,
  campaign_id text,
  campaign_name text,
  ad_group_id text,
  ad_id text,
  asset_id text,
  criterion_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, customer_id, google_resource_name)
);

create index if not exists idx_google_ads_change_events_source_time
  on public.google_ads_change_events(data_source_id, change_date_time desc);
create index if not exists idx_google_ads_change_events_resource_type
  on public.google_ads_change_events(data_source_id, change_resource_type, change_date_time desc);

create table if not exists public.google_ads_analytics_runs (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  dataset text not null,
  status text not null check (status in ('success','error','not_applicable','unsupported','no_data')),
  queried_from date,
  queried_to date,
  received_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  request_ids text[] not null default '{}'::text[],
  warning text,
  error text,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_google_ads_analytics_runs_source_created
  on public.google_ads_analytics_runs(data_source_id, created_at desc);

alter table public.google_ads_analytics_rows enable row level security;
alter table public.google_ads_config_history enable row level security;
alter table public.google_ads_change_events enable row level security;
alter table public.google_ads_analytics_runs enable row level security;

drop policy if exists "Admins read Google Ads analytics rows" on public.google_ads_analytics_rows;
create policy "Admins read Google Ads analytics rows" on public.google_ads_analytics_rows
  for select to authenticated using ((select public.is_admin_or_owner()));
drop policy if exists "Admins read Google Ads config history" on public.google_ads_config_history;
create policy "Admins read Google Ads config history" on public.google_ads_config_history
  for select to authenticated using ((select public.is_admin_or_owner()));
drop policy if exists "Admins read Google Ads change events" on public.google_ads_change_events;
create policy "Admins read Google Ads change events" on public.google_ads_change_events
  for select to authenticated using ((select public.is_admin_or_owner()));
drop policy if exists "Admins read Google Ads analytics runs" on public.google_ads_analytics_runs;
create policy "Admins read Google Ads analytics runs" on public.google_ads_analytics_runs
  for select to authenticated using ((select public.is_admin_or_owner()));

revoke all on public.google_ads_analytics_rows from public, anon;
revoke all on public.google_ads_config_history from public, anon;
revoke all on public.google_ads_change_events from public, anon;
revoke all on public.google_ads_analytics_runs from public, anon;
grant select on public.google_ads_analytics_rows to authenticated;
grant select on public.google_ads_config_history to authenticated;
grant select on public.google_ads_change_events to authenticated;
grant select on public.google_ads_analytics_runs to authenticated;
grant all on public.google_ads_analytics_rows to service_role;
grant all on public.google_ads_config_history to service_role;
grant all on public.google_ads_change_events to service_role;
grant all on public.google_ads_analytics_runs to service_role;

drop trigger if exists update_google_ads_analytics_rows_modtime on public.google_ads_analytics_rows;
create trigger update_google_ads_analytics_rows_modtime before update on public.google_ads_analytics_rows
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_google_ads_config_history_modtime on public.google_ads_config_history;
create trigger update_google_ads_config_history_modtime before update on public.google_ads_config_history
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_google_ads_change_events_modtime on public.google_ads_change_events;
create trigger update_google_ads_change_events_modtime before update on public.google_ads_change_events
  for each row execute procedure public.update_updated_at_column();
