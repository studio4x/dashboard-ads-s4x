-- Keep campaign budget change IDs separate from campaign IDs.
alter table public.google_ads_change_events
  add column if not exists campaign_budget_id text;

create index if not exists idx_google_ads_change_events_campaign_budget
  on public.google_ads_change_events(data_source_id, campaign_budget_id, change_date_time desc);
