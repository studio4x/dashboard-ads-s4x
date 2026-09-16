-- Histórico persistente das execuções de automação de relatórios.
-- O registro é criado pelo backend e concluído pelo callback do n8n.

create table if not exists public.automation_execution_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'scheduled')),
  status text not null default 'running' check (status in ('running', 'dispatched', 'success', 'partial', 'error')),
  started_at timestamptz not null default now(),
  dispatched_at timestamptz,
  completed_at timestamptz,
  period_from date,
  period_to date,
  report_mode text,
  workflow_run_id text,
  message text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_execution_logs_client_started
  on public.automation_execution_logs(client_id, started_at desc);
create index if not exists idx_automation_execution_logs_dashboard_started
  on public.automation_execution_logs(dashboard_id, started_at desc);
create index if not exists idx_automation_execution_logs_status
  on public.automation_execution_logs(status, started_at desc);

alter table public.automation_execution_logs enable row level security;
revoke all on public.automation_execution_logs from public, anon;
grant select on public.automation_execution_logs to authenticated;
grant all on public.automation_execution_logs to service_role;

drop policy if exists "Admins read automation execution logs" on public.automation_execution_logs;
create policy "Admins read automation execution logs"
  on public.automation_execution_logs
  for select to authenticated
  using ((select public.is_admin_or_owner()));

-- Preserva a última conclusão já conhecida quando o histórico é criado.
insert into public.automation_execution_logs (
  client_id,
  dashboard_id,
  source,
  status,
  started_at,
  completed_at,
  message,
  details
)
select
  d.client_id,
  d.id,
  'scheduled',
  case
    when lower(coalesce(d.automation_last_completion_status, '')) in ('error', 'failed', 'failure') then 'error'
    when lower(coalesce(d.automation_last_completion_status, '')) in ('partial', 'warning', 'success_with_warnings') then 'partial'
    else 'success'
  end,
  d.automation_last_completed_at,
  d.automation_last_completed_at,
  d.automation_last_completion_message,
  coalesce(d.automation_last_completion_details, '{}'::jsonb)
from public.dashboards d
where d.automation_last_completed_at is not null
  and not exists (
    select 1
    from public.automation_execution_logs h
    where h.dashboard_id = d.id
      and h.completed_at = d.automation_last_completed_at
  );
