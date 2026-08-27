create or replace function public.trigger_enrich_evolucao_clinica_meta_dashboard()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  if new.dashboard_id = '94562c57-7929-4e34-abf2-e12054ecece3'::uuid then
    perform net.http_post(
      url := 'https://uaqdtnwonplcuicvthod.supabase.co/functions/v1/enrich-evolucao-clinica-meta-dashboard',
      headers := jsonb_build_object('content-type', 'application/json'),
      body := jsonb_build_object('snapshot_id', new.id)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.trigger_enrich_evolucao_clinica_meta_dashboard() from public, anon, authenticated;

drop trigger if exists trg_enrich_evolucao_clinica_meta_dashboard on public.dashboard_data_snapshots;

create trigger trg_enrich_evolucao_clinica_meta_dashboard
after insert on public.dashboard_data_snapshots
for each row
when (new.dashboard_id = '94562c57-7929-4e34-abf2-e12054ecece3'::uuid)
execute function public.trigger_enrich_evolucao_clinica_meta_dashboard();;
