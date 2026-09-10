export type GoogleAdsRiskLevel = "low" | "medium" | "high" | "critical";

export type GoogleAdsAdvancedOperation =
  | "batch_google_ads_changes"
  | "add_ad_group_keyword"
  | "set_keyword_cpc"
  | "add_ad_schedule"
  | "edit_ad_schedule"
  | "remove_ad_schedule"
  | "add_campaign_location"
  | "remove_campaign_location"
  | "edit_responsive_search_ad"
  | "create_responsive_search_ad"
  | "create_campaign_asset"
  | "link_campaign_asset"
  | "unlink_campaign_asset"
  | "apply_google_recommendation"
  | "dismiss_google_recommendation"
  | "set_target_cpa"
  | "set_target_roas"
  | "set_campaign_bidding_strategy"
  | "set_conversion_action_primary"
  | "set_conversion_action_include_in_conversions"
  | "set_customer_conversion_goal_biddable"
  | "set_campaign_conversion_goal_biddable";

export type GoogleAdsPlatformOperation =
  | "add_campaign_negative_keyword"
  | "set_keyword_status"
  | "set_ad_status"
  | "set_ad_group_status"
  | "set_campaign_budget"
  | GoogleAdsAdvancedOperation;

export function isAdvancedGoogleAdsOperation(value: string): value is GoogleAdsAdvancedOperation {
  return new Set<GoogleAdsAdvancedOperation>([
    "batch_google_ads_changes", "add_ad_group_keyword", "set_keyword_cpc", "add_ad_schedule", "edit_ad_schedule", "remove_ad_schedule",
    "add_campaign_location", "remove_campaign_location", "edit_responsive_search_ad", "create_responsive_search_ad", "create_campaign_asset",
    "link_campaign_asset", "unlink_campaign_asset", "apply_google_recommendation", "dismiss_google_recommendation",
    "set_target_cpa", "set_target_roas", "set_campaign_bidding_strategy", "set_conversion_action_primary",
    "set_conversion_action_include_in_conversions", "set_customer_conversion_goal_biddable", "set_campaign_conversion_goal_biddable",
  ]).has(value as GoogleAdsAdvancedOperation);
}

export function isGoogleAdsPlatformOperation(value: string): value is GoogleAdsPlatformOperation {
  return new Set<GoogleAdsPlatformOperation>([
    "add_campaign_negative_keyword", "set_keyword_status", "set_ad_status", "set_ad_group_status", "set_campaign_budget",
  ]).has(value as GoogleAdsPlatformOperation) || isAdvancedGoogleAdsOperation(value);
}
