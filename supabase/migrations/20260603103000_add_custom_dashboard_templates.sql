-- Cria catálogo de templates customizados do sistema
create table if not exists public.dashboard_custom_templates (
  template_id text primary key,
  base_template_id text not null,
  name text not null,
  platform text not null default 'custom',
  version text not null default '1.0',
  status text not null default 'active',
  source_type text not null default 'google_sheets',
  description text not null default '',
  required_sheets jsonb not null default '[]'::jsonb,
  optional_sheets jsonb not null default '[]'::jsonb,
  visible_pages jsonb not null default '[]'::jsonb,
  metric_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dashboard_custom_templates_base_template_id
  on public.dashboard_custom_templates (base_template_id);

alter table public.dashboard_custom_templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_custom_templates'
      and policyname = 'Admin access to custom templates'
  ) then
    create policy "Admin access to custom templates"
      on public.dashboard_custom_templates
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;
