alter table public.google_ads_sources
  add column if not exists write_enabled boolean not null default false;

alter table public.google_ads_platform_change_audit
  add column if not exists source_id uuid references public.data_sources(id) on delete set null,
  add column if not exists customer_id text,
  add column if not exists origin text,
  add column if not exists operation text,
  add column if not exists risk_level text,
  add column if not exists preview_hash text,
  add column if not exists confirmation text,
  add column if not exists google_request_id text,
  add column if not exists resource_names jsonb,
  add column if not exists success boolean,
  add column if not exists reverted boolean;

alter table public.google_ads_sources enable row level security;
alter table public.google_ads_platform_change_audit enable row level security;

revoke all on public.google_ads_platform_change_audit from anon, authenticated;
grant all on public.google_ads_platform_change_audit to service_role;
