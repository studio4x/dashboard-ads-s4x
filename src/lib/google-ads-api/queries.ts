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
