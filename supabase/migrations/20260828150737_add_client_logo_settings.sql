alter table public.clients
  add column if not exists logo_settings jsonb not null default '{"fit":"cover","zoom":1,"positionX":50,"positionY":50}'::jsonb;

alter table public.clients
  drop constraint if exists clients_logo_settings_object_check;

alter table public.clients
  add constraint clients_logo_settings_object_check
  check (jsonb_typeof(logo_settings) = 'object');

comment on column public.clients.logo_settings is
  'Enquadramento nao destrutivo do logotipo nos relatorios PDF: fit, zoom e ponto focal.';
