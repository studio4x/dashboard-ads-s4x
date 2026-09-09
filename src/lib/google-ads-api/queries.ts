function between(dateStart: string, dateEnd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) {
    throw new Error("Período Google Ads inválido.");
  }
  return `segments.date BETWEEN '${dateStart}' AND '${dateEnd}'`;
}

const METRICS = [
  "metrics.impressions", "metrics.clicks", "metrics.cost_micros", "metrics.conversions",
  "metrics.conversions_value", "metrics.all_conversions", "metrics.all_conversions_value",
  "metrics.interactions",
].join(", ");

// Search impression share metrics are ratios returned by Google Ads as raw
// proportions (for example, 0.283). Keep them isolated from the common
// resource field set so a non-Search account can fall back safely.
const SEARCH_SHARE_METRICS = [
  "metrics.search_impression_share",
  "metrics.search_budget_lost_impression_share",
  "metrics.search_rank_lost_impression_share",
  "metrics.search_top_impression_share",
  "metrics.search_absolute_top_impression_share",
  "metrics.search_budget_lost_top_impression_share",
  "metrics.search_rank_lost_top_impression_share",
  "metrics.search_budget_lost_absolute_top_impression_share",
  "metrics.search_rank_lost_absolute_top_impression_share",
  "metrics.search_exact_match_impression_share",
  "metrics.search_click_share",
  "metrics.top_impression_percentage",
  "metrics.absolute_top_impression_percentage",
].join(", ");

const CAMPAIGN_DAILY_FIELDS = `${METRICS}, ${SEARCH_SHARE_METRICS}`;

// This is the field set proven by the legacy production query across the
// common Google Ads resources. Resource- and segment-specific metrics remain
// isolated below so one incompatible field cannot block the P0 backfill.
const ANALYTIC_METRICS = METRICS;

function limitedChangeEventPeriod(dateStart: string, dateEnd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) {
    throw new Error("Período de Change Event inválido.");
  }
  return `change_event.change_date_time BETWEEN '${dateStart}' AND '${dateEnd}'`;
}

export const googleAdsAnalyticsQueries = {
  campaignDailyBase: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ${METRICS} FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
  campaignDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ${CAMPAIGN_DAILY_FIELDS} FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
  adGroupDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group.status, ${ANALYTIC_METRICS} FROM ad_group WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, ad_group.id`,
  keywordDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.quality_info.quality_score, ad_group_criterion.quality_info.creative_quality_score, ad_group_criterion.quality_info.post_click_quality_score, ad_group_criterion.quality_info.search_predicted_ctr, ${ANALYTIC_METRICS} FROM keyword_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, ad_group.id, ad_group_criterion.criterion_id`,
  searchTermsDailyBase: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, search_term_view.status, segments.search_term_match_type, ${ANALYTIC_METRICS} FROM search_term_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, ad_group.id, search_term_view.search_term`,
  searchTermsDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, search_term_view.status, segments.search_term_match_type, segments.keyword.ad_group_criterion, segments.keyword.info.text, segments.keyword.info.match_type, ${ANALYTIC_METRICS} FROM search_term_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, ad_group.id, search_term_view.search_term`,
  pmaxSearchTermsDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, campaign.advertising_channel_type, campaign_search_term_view.search_term, segments.search_term_match_type, segments.search_term_targeting_status, segments.search_term_match_source, segments.device, segments.ad_network_type, ${ANALYTIC_METRICS} FROM campaign_search_term_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, campaign_search_term_view.search_term`,
  adDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group_ad.primary_status, ad_group_ad.primary_status_reasons, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.responsive_display_ad.headlines, ad_group_ad.ad.responsive_display_ad.descriptions, ad_group_ad.ad.video_responsive_ad.headlines, ad_group_ad.ad.video_responsive_ad.descriptions, ${ANALYTIC_METRICS} FROM ad_group_ad WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, ad_group.id, ad_group_ad.ad.id`,
  assetDaily: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.status, asset.id, asset.name, asset.type, asset.text_asset.text, ad_group_ad_asset_view.field_type, ad_group_ad_asset_view.performance_label, ${ANALYTIC_METRICS} FROM ad_group_ad_asset_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, ad_group.id, ad_group_ad.ad.id, asset.id`,
  pmaxAssetGroups: `SELECT campaign.id, campaign.name, asset_group.id, asset_group.name, asset_group.status, asset_group.ad_strength, asset_group.final_urls FROM asset_group ORDER BY campaign.id, asset_group.id`,
  pmaxAssets: `SELECT campaign.id, campaign.name, asset_group.id, asset_group.name, asset_group_asset.status, asset.id, asset.name, asset.type, asset.text_asset.text, asset_group_asset.field_type, asset_group_asset.performance_label FROM asset_group_asset ORDER BY campaign.id, asset_group.id, asset.id`,
  deviceDaily: (start: string, end: string) => `SELECT segments.date, segments.device, campaign.id, campaign.name, ${ANALYTIC_METRICS} FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, segments.device`,
  networkDaily: (start: string, end: string) => `SELECT segments.date, segments.ad_network_type, segments.ad_sub_network_type, campaign.id, campaign.name, ${ANALYTIC_METRICS} FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, segments.ad_network_type`,
  timeDaily: (start: string, end: string) => `SELECT segments.date, segments.day_of_week, segments.hour, campaign.id, campaign.name, ${ANALYTIC_METRICS} FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, segments.hour`,
  locationDaily: (start: string, end: string) => `SELECT segments.date, geographic_view.country_criterion_id, geographic_view.location_type, campaign.id, campaign.name, ${ANALYTIC_METRICS} FROM geographic_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
  landingPageDaily: (start: string, end: string) => `SELECT segments.date, segments.device, segments.landing_page_source, landing_page_view.unexpanded_final_url, campaign.id, campaign.name, ${ANALYTIC_METRICS}, metrics.mobile_friendly_clicks_percentage, metrics.speed_score, metrics.valid_accelerated_mobile_pages_clicks_percentage FROM landing_page_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, landing_page_view.unexpanded_final_url`,
  conversionActionDaily: (start: string, end: string) => `SELECT segments.date, segments.conversion_action, segments.conversion_action_name, segments.external_conversion_source, campaign.id, campaign.name, metrics.conversions, metrics.all_conversions, metrics.conversions_value, metrics.all_conversions_value, metrics.value_per_conversion FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, segments.conversion_action`,
  conversionActions: `SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.origin, conversion_action.primary_for_goal, conversion_action.include_in_conversions_metric, conversion_action.counting_type FROM conversion_action ORDER BY conversion_action.id`,
  conversionGoals: `SELECT customer_conversion_goal.resource_name, customer_conversion_goal.category, customer_conversion_goal.origin, customer_conversion_goal.biddable FROM customer_conversion_goal ORDER BY customer_conversion_goal.category`,
  campaignAssets: `SELECT campaign.resource_name, campaign.id, campaign.name, campaign.status, campaign_asset.resource_name, campaign_asset.status, campaign_asset.field_type, asset.resource_name, asset.id, asset.name, asset.type, asset.text_asset.text, asset.sitelink_asset.link_text, asset.callout_asset.callout_text, asset.call_asset.phone_number FROM campaign_asset WHERE campaign_asset.status = 'ENABLED' ORDER BY campaign.id, campaign_asset.field_type, asset.id`,
  budgets: `SELECT campaign.id, campaign.name, campaign.campaign_budget, campaign_budget.id, campaign_budget.name, campaign_budget.status, campaign_budget.amount_micros, campaign_budget.total_amount_micros, campaign_budget.period, campaign_budget.delivery_method, campaign_budget.explicitly_shared, campaign_budget.reference_count, campaign_budget.has_recommended_budget, campaign_budget.recommended_budget_amount_micros FROM campaign_budget ORDER BY campaign_budget.id`,
  bidding: `SELECT campaign.resource_name, campaign.id, campaign.name, campaign.bidding_strategy_type, campaign.bidding_strategy, campaign.maximize_conversions.target_cpa_micros, campaign.maximize_conversion_value.target_roas, campaign.target_cpa.target_cpa_micros, campaign.target_roas.target_roas FROM campaign ORDER BY campaign.id`,
  // old_resource/new_resource are not selectable in every v25 customer
  // response. Keep the primary event query on the documented stable fields.
  changeEvents: (start: string, end: string) => `SELECT change_event.resource_name, change_event.change_date_time, change_event.change_resource_name, change_event.change_resource_type, change_event.resource_change_operation, change_event.changed_fields, change_event.client_type, change_event.user_email FROM change_event WHERE ${limitedChangeEventPeriod(start, end)} ORDER BY change_event.change_date_time DESC LIMIT 10000`,
  placements: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, segments.ad_network_type, detail_placement_view.display_name, detail_placement_view.placement, ${ANALYTIC_METRICS} FROM detail_placement_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
  shopping: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, segments.product_item_id, segments.product_title, segments.product_brand, segments.product_category_level1, segments.product_category_level2, segments.product_type_l1, segments.product_condition, segments.product_channel, segments.product_merchant_id, ${ANALYTIC_METRICS} FROM shopping_performance_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id, segments.product_item_id`,
  demographicsAge: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.age_range.type, ${ANALYTIC_METRICS} FROM age_range_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
  demographicsGender: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.gender.type, ${ANALYTIC_METRICS} FROM gender_view WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
};

export const googleAdsQueries = {
  customer: `SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account, customer.currency_code, customer.time_zone, customer.status FROM customer LIMIT 1`,
  accountBudget: `SELECT account_budget.adjusted_spending_limit_micros, account_budget.adjusted_spending_limit_type, account_budget.amount_served_micros, account_budget.approved_start_date_time, account_budget.approved_end_date_time, account_budget.status FROM account_budget WHERE account_budget.status IN ('APPROVED', 'PENDING') ORDER BY account_budget.id`,
  directCustomerClients: `SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.manager, customer_client.test_account, customer_client.currency_code, customer_client.time_zone, customer_client.status, customer_client.level, customer_client.hidden FROM customer_client WHERE customer_client.level <= 1`,
  dailyPerformance: (start: string, end: string) => `SELECT segments.date, campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ${METRICS} FROM campaign WHERE ${between(start, end)} ORDER BY segments.date, campaign.id`,
  campaigns: (start: string, end: string) => `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ${METRICS}, metrics.interaction_rate, metrics.search_impression_share, metrics.search_rank_lost_impression_share, metrics.search_budget_lost_impression_share FROM campaign WHERE ${between(start, end)} ORDER BY campaign.id`,
  adGroups: (start: string, end: string) => `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group.status, ${METRICS}, metrics.interaction_rate, metrics.average_cost FROM ad_group WHERE ${between(start, end)} ORDER BY campaign.id, ad_group.id`,
  keywords: (start: string, end: string) => `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.quality_info.quality_score, ad_group_criterion.quality_info.creative_quality_score, ad_group_criterion.quality_info.post_click_quality_score, ad_group_criterion.quality_info.search_predicted_ctr, ${METRICS} FROM keyword_view WHERE ${between(start, end)} ORDER BY campaign.id, ad_group.id, ad_group_criterion.criterion_id`,
  searchTerms: (start: string, end: string) => `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, search_term_view.status, segments.search_term_match_type, ${METRICS} FROM search_term_view WHERE ${between(start, end)} ORDER BY campaign.id, ad_group.id`,
  campaignNegatives: `SELECT campaign.id, campaign.name, campaign_criterion.criterion_id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type FROM campaign_criterion WHERE campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD'`,
  sharedNegatives: `SELECT shared_set.id, shared_set.name, shared_set.type, shared_criterion.criterion_id, shared_criterion.keyword.text, shared_criterion.keyword.match_type FROM shared_criterion WHERE shared_set.type = 'NEGATIVE_KEYWORDS'`,
  campaignSharedSets: `SELECT campaign.id, campaign.name, shared_set.id, shared_set.name, campaign_shared_set.status FROM campaign_shared_set WHERE shared_set.type = 'NEGATIVE_KEYWORDS' AND campaign_shared_set.status = 'ENABLED'`,
  ads: (start: string, end: string) => `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ${METRICS} FROM ad_group_ad WHERE ${between(start, end)} ORDER BY campaign.id, ad_group.id, ad_group_ad.ad.id`,
  adAssets: (start: string, end: string) => `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.status, asset.id, asset.name, asset.type, asset.text_asset.text, ad_group_ad_asset_view.field_type, ad_group_ad_asset_view.performance_label, ${METRICS} FROM ad_group_ad_asset_view WHERE ${between(start, end)} ORDER BY campaign.id, ad_group.id, ad_group_ad.ad.id, asset.id`,
  pmaxAssets: `SELECT campaign.id, campaign.name, asset_group.id, asset_group.name, asset.id, asset.name, asset.type, asset.text_asset.text, asset_group_asset.field_type, asset_group_asset.performance_label, asset_group_asset.status FROM asset_group_asset ORDER BY campaign.id, asset_group.id, asset.id`,
};
