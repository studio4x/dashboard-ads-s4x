create index if not exists idx_meta_marketing_settings_updated_by
  on public.meta_marketing_settings(updated_by);

create index if not exists idx_meta_business_connections_created_by
  on public.meta_business_connections(created_by);
