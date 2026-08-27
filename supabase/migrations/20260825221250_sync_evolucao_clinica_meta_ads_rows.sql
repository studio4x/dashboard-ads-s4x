create or replace function public.sync_evolucao_clinica_meta_ads_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dashboard_id = '94562c57-7929-4e34-abf2-e12054ecece3'::uuid
     and jsonb_typeof(coalesce(new.payload_json, '{}'::jsonb)->'dailyPerformance') = 'array' then
    new.payload_json := jsonb_set(
      coalesce(new.payload_json, '{}'::jsonb),
      '{meta_ads}',
      coalesce(new.payload_json->'dailyPerformance', '[]'::jsonb),
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_evolucao_clinica_meta_ads_rows on public.dashboard_data_snapshots;
create trigger trg_sync_evolucao_clinica_meta_ads_rows
before insert or update of payload_json on public.dashboard_data_snapshots
for each row
when (new.dashboard_id = '94562c57-7929-4e34-abf2-e12054ecece3'::uuid)
execute function public.sync_evolucao_clinica_meta_ads_rows();;
