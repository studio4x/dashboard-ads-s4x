-- Native Google Ads API connector.
-- OAuth refresh tokens are encrypted by Supabase Vault and are only reachable
-- through service_role-only RPC functions used by server-side Route Handlers.

create table if not exists public.google_ads_settings (
  id text primary key default 'default' check (id = 'default'),
  client_id text,
  api_version text not null default 'v25' check (api_version ~ '^v[0-9]+$'),
  default_history_days integer not null default 90 check (default_history_days between 1 and 730),
  default_lookback_days integer not null default 28 check (default_lookback_days between 1 and 90),
  default_sync_interval text not null default 'daily'
    check (default_sync_interval in ('manual', 'one_hour', 'six_hours', 'twelve_hours', 'daily', 'weekly')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.google_ads_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.google_ads_connections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  google_user_id text not null,
  google_user_email text,
  refresh_token_secret_id uuid unique,
  granted_scopes text[] not null default '{}'::text[],
  status text not null default 'active'
    check (status in ('pending', 'active', 'expired', 'revoked', 'error')),
  last_validated_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_google_ads_connections_user_active
  on public.google_ads_connections(google_user_id)
  where status = 'active';

create index if not exists idx_google_ads_connections_created_by
  on public.google_ads_connections(created_by);

create table if not exists public.google_ads_sources (
  data_source_id uuid primary key references public.data_sources(id) on delete cascade,
  connection_id uuid not null references public.google_ads_connections(id) on delete restrict,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  customer_name text not null,
  customer_is_manager boolean not null default false check (not customer_is_manager),
  customer_is_test boolean,
  manager_customer_id text check (manager_customer_id is null or manager_customer_id ~ '^[0-9]{10}$'),
  manager_customer_name text,
  currency_code text,
  timezone text,
  history_days integer not null default 90 check (history_days between 1 and 730),
  lookback_days integer not null default 28 check (lookback_days between 1 and 90),
  last_import_at timestamptz,
  last_import_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, customer_id, manager_customer_id)
);

create index if not exists idx_google_ads_settings_updated_by
  on public.google_ads_settings(updated_by);

create index if not exists idx_google_ads_sources_connection_id
  on public.google_ads_sources(connection_id);

create index if not exists idx_google_ads_sources_customer_id
  on public.google_ads_sources(customer_id);

create unique index if not exists idx_data_sources_one_active_google_ads_per_dashboard
  on public.data_sources(dashboard_id)
  where type = 'google_ads' and status = 'active';

alter table public.google_ads_settings enable row level security;
alter table public.google_ads_connections enable row level security;
alter table public.google_ads_sources enable row level security;

drop policy if exists "Admins manage Google Ads settings" on public.google_ads_settings;
create policy "Admins manage Google Ads settings"
  on public.google_ads_settings
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins manage Google Ads connections" on public.google_ads_connections;
create policy "Admins manage Google Ads connections"
  on public.google_ads_connections
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins manage Google Ads sources" on public.google_ads_sources;
create policy "Admins manage Google Ads sources"
  on public.google_ads_sources
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

revoke all on public.google_ads_settings from public, anon;
revoke all on public.google_ads_connections from public, anon;
revoke all on public.google_ads_sources from public, anon;
grant select, insert, update, delete on public.google_ads_settings to authenticated;
grant select, insert, update, delete on public.google_ads_connections to authenticated;
grant select, insert, update, delete on public.google_ads_sources to authenticated;
grant all on public.google_ads_settings to service_role;
grant all on public.google_ads_connections to service_role;
grant all on public.google_ads_sources to service_role;

drop trigger if exists update_google_ads_settings_modtime on public.google_ads_settings;
create trigger update_google_ads_settings_modtime
before update on public.google_ads_settings
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_google_ads_connections_modtime on public.google_ads_connections;
create trigger update_google_ads_connections_modtime
before update on public.google_ads_connections
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_google_ads_sources_modtime on public.google_ads_sources;
create trigger update_google_ads_sources_modtime
before update on public.google_ads_sources
for each row execute procedure public.update_updated_at_column();

create or replace function public.google_ads_vault_store_refresh_token(
  p_connection_id uuid,
  p_refresh_token text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret_id uuid;
  v_secret_name text := 'google_ads_connection_' || p_connection_id::text;
begin
  if p_refresh_token is null or length(trim(p_refresh_token)) < 20 then
    raise exception 'Invalid Google Ads refresh token';
  end if;

  if not exists (
    select 1 from public.google_ads_connections where id = p_connection_id
  ) then
    raise exception 'Google Ads connection not found';
  end if;

  select id into v_secret_id
  from vault.secrets
  where name = v_secret_name
  limit 1;

  if v_secret_id is null then
    select vault.create_secret(
      p_refresh_token,
      v_secret_name,
      'Google Ads OAuth refresh token for connection ' || p_connection_id::text
    ) into v_secret_id;
  else
    perform vault.update_secret(
      v_secret_id,
      p_refresh_token,
      v_secret_name,
      'Google Ads OAuth refresh token for connection ' || p_connection_id::text
    );
  end if;

  update public.google_ads_connections
  set refresh_token_secret_id = v_secret_id,
      updated_at = now()
  where id = p_connection_id;

  return v_secret_id;
end;
$$;

create or replace function public.google_ads_vault_read_refresh_token(p_connection_id uuid)
returns text
language sql
security definer
set search_path = pg_catalog, public, vault
stable
as $$
  select ds.decrypted_secret
  from public.google_ads_connections c
  join vault.decrypted_secrets ds on ds.id = c.refresh_token_secret_id
  where c.id = p_connection_id
  limit 1;
$$;

create or replace function public.google_ads_vault_delete_refresh_token(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret_id uuid;
begin
  select refresh_token_secret_id into v_secret_id
  from public.google_ads_connections
  where id = p_connection_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  update public.google_ads_connections
  set refresh_token_secret_id = null,
      status = 'revoked',
      updated_at = now()
  where id = p_connection_id;

  return found;
end;
$$;

revoke all on function public.google_ads_vault_store_refresh_token(uuid, text) from public, anon, authenticated;
revoke all on function public.google_ads_vault_read_refresh_token(uuid) from public, anon, authenticated;
revoke all on function public.google_ads_vault_delete_refresh_token(uuid) from public, anon, authenticated;
grant execute on function public.google_ads_vault_store_refresh_token(uuid, text) to service_role;
grant execute on function public.google_ads_vault_read_refresh_token(uuid) to service_role;
grant execute on function public.google_ads_vault_delete_refresh_token(uuid) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-google-ads-api-cron') then
    perform cron.unschedule('sync-google-ads-api-cron');
  end if;
end $$;

select cron.schedule(
  'sync-google-ads-api-cron',
  '23 * * * *',
  $cron$
  select net.http_post(
    url := 'https://dashboardads.studio4x.com.br/api/cron/sync-google-ads',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'CRON_SECRET'
        order by created_at desc
        limit 1
      )
    )
  );
  $cron$
);
