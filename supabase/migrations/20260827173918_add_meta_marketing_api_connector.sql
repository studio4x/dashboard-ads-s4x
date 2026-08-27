-- Meta Marketing API connector.
-- Non-sensitive app settings live in public.meta_marketing_settings.
-- OAuth access tokens are stored in Supabase Vault and can only be read through
-- service_role-only RPC functions used by server-side Route Handlers.

create table if not exists public.meta_marketing_settings (
  id text primary key default 'default' check (id = 'default'),
  app_id text,
  login_config_id text,
  api_version text not null default 'v26.0' check (api_version ~ '^v[0-9]+\.[0-9]+$'),
  default_history_days integer not null default 90 check (default_history_days between 1 and 730),
  default_lookback_days integer not null default 28 check (default_lookback_days between 1 and 90),
  default_sync_interval text not null default 'daily'
    check (default_sync_interval in ('manual', 'one_hour', 'six_hours', 'twelve_hours', 'daily', 'weekly')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.meta_marketing_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.meta_business_connections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  meta_user_id text not null,
  meta_user_name text,
  token_secret_id uuid unique,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}'::text[],
  status text not null default 'active'
    check (status in ('pending', 'active', 'expired', 'revoked', 'error')),
  last_validated_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_meta_business_connections_user_active
  on public.meta_business_connections(meta_user_id)
  where status = 'active';

create table if not exists public.meta_ad_sources (
  data_source_id uuid primary key references public.data_sources(id) on delete cascade,
  connection_id uuid not null references public.meta_business_connections(id) on delete restrict,
  business_id text,
  business_name text,
  history_days integer not null default 90 check (history_days between 1 and 730),
  lookback_days integer not null default 28 check (lookback_days between 1 and 90),
  attribution_windows text[] not null default array['7d_click', '1d_view']::text[],
  last_import_at timestamptz,
  last_import_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meta_ad_sources_connection_id
  on public.meta_ad_sources(connection_id);

create table if not exists public.meta_ad_source_accounts (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.meta_ad_sources(data_source_id) on delete cascade,
  ad_account_id text not null,
  ad_account_name text not null,
  account_status integer,
  currency text,
  timezone_name text,
  business_id text,
  business_name text,
  access_origin text not null default 'user'
    check (access_origin in ('user', 'owned', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, ad_account_id)
);

create index if not exists idx_meta_ad_source_accounts_data_source_id
  on public.meta_ad_source_accounts(data_source_id);

create unique index if not exists idx_data_sources_one_active_meta_per_dashboard
  on public.data_sources(dashboard_id)
  where type = 'meta_ads' and status = 'active';

alter table public.meta_marketing_settings enable row level security;
alter table public.meta_business_connections enable row level security;
alter table public.meta_ad_sources enable row level security;
alter table public.meta_ad_source_accounts enable row level security;

drop policy if exists "Admins manage Meta settings" on public.meta_marketing_settings;
create policy "Admins manage Meta settings"
  on public.meta_marketing_settings
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins manage Meta connections" on public.meta_business_connections;
create policy "Admins manage Meta connections"
  on public.meta_business_connections
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins manage Meta sources" on public.meta_ad_sources;
create policy "Admins manage Meta sources"
  on public.meta_ad_sources
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

drop policy if exists "Admins manage Meta source accounts" on public.meta_ad_source_accounts;
create policy "Admins manage Meta source accounts"
  on public.meta_ad_source_accounts
  for all
  to authenticated
  using ((select public.is_admin_or_owner()))
  with check ((select public.is_admin_or_owner()));

grant select, insert, update, delete on public.meta_marketing_settings to authenticated;
grant select, insert, update, delete on public.meta_business_connections to authenticated;
grant select, insert, update, delete on public.meta_ad_sources to authenticated;
grant select, insert, update, delete on public.meta_ad_source_accounts to authenticated;
grant all on public.meta_marketing_settings to service_role;
grant all on public.meta_business_connections to service_role;
grant all on public.meta_ad_sources to service_role;
grant all on public.meta_ad_source_accounts to service_role;

drop trigger if exists update_meta_marketing_settings_modtime on public.meta_marketing_settings;
create trigger update_meta_marketing_settings_modtime
before update on public.meta_marketing_settings
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_meta_business_connections_modtime on public.meta_business_connections;
create trigger update_meta_business_connections_modtime
before update on public.meta_business_connections
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_meta_ad_sources_modtime on public.meta_ad_sources;
create trigger update_meta_ad_sources_modtime
before update on public.meta_ad_sources
for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_meta_ad_source_accounts_modtime on public.meta_ad_source_accounts;
create trigger update_meta_ad_source_accounts_modtime
before update on public.meta_ad_source_accounts
for each row execute procedure public.update_updated_at_column();

create or replace function public.meta_vault_store_token(
  p_connection_id uuid,
  p_access_token text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret_id uuid;
  v_secret_name text := 'meta_marketing_connection_' || p_connection_id::text;
begin
  if p_access_token is null or length(trim(p_access_token)) < 20 then
    raise exception 'Invalid Meta access token';
  end if;

  if not exists (
    select 1 from public.meta_business_connections where id = p_connection_id
  ) then
    raise exception 'Meta connection not found';
  end if;

  select id into v_secret_id
  from vault.secrets
  where name = v_secret_name
  limit 1;

  if v_secret_id is null then
    select vault.create_secret(
      p_access_token,
      v_secret_name,
      'Meta Marketing API OAuth token for connection ' || p_connection_id::text
    ) into v_secret_id;
  else
    perform vault.update_secret(
      v_secret_id,
      p_access_token,
      v_secret_name,
      'Meta Marketing API OAuth token for connection ' || p_connection_id::text
    );
  end if;

  update public.meta_business_connections
  set token_secret_id = v_secret_id,
      updated_at = now()
  where id = p_connection_id;

  return v_secret_id;
end;
$$;

create or replace function public.meta_vault_read_token(p_connection_id uuid)
returns text
language sql
security definer
set search_path = pg_catalog, public, vault
stable
as $$
  select ds.decrypted_secret
  from public.meta_business_connections c
  join vault.decrypted_secrets ds on ds.id = c.token_secret_id
  where c.id = p_connection_id
  limit 1;
$$;

create or replace function public.meta_vault_delete_token(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret_id uuid;
begin
  select token_secret_id into v_secret_id
  from public.meta_business_connections
  where id = p_connection_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  update public.meta_business_connections
  set token_secret_id = null,
      status = 'revoked',
      updated_at = now()
  where id = p_connection_id;

  return found;
end;
$$;

revoke all on function public.meta_vault_store_token(uuid, text) from public, anon, authenticated;
revoke all on function public.meta_vault_read_token(uuid) from public, anon, authenticated;
revoke all on function public.meta_vault_delete_token(uuid) from public, anon, authenticated;
grant execute on function public.meta_vault_store_token(uuid, text) to service_role;
grant execute on function public.meta_vault_read_token(uuid) to service_role;
grant execute on function public.meta_vault_delete_token(uuid) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-meta-marketing-api-cron') then
    perform cron.unschedule('sync-meta-marketing-api-cron');
  end if;
end $$;

select cron.schedule(
  'sync-meta-marketing-api-cron',
  '17 * * * *',
  $cron$
  select net.http_post(
    url := 'https://dashboardads.studio4x.com.br/api/cron/sync-meta-ads',
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
