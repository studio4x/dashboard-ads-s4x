-- The Google Ads connector persists campaign_asset snapshots, and the
-- original constraint omitted this valid configuration type.
alter table public.google_ads_config_history
  drop constraint if exists google_ads_config_history_config_type_check;

alter table public.google_ads_config_history
  add constraint google_ads_config_history_config_type_check
  check (config_type in (
    'conversion_action',
    'conversion_goal',
    'campaign_asset',
    'campaign_budget',
    'campaign_bidding',
    'keyword_quality'
  ));
