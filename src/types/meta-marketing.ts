export type MetaConnectionStatus = "pending" | "active" | "expired" | "revoked" | "error";

export type MetaAccessOrigin = "user" | "owned" | "client";

export interface MetaMarketingSettings {
  id: "default";
  app_id: string | null;
  login_config_id: string | null;
  api_version: string;
  default_history_days: number;
  default_lookback_days: number;
  default_sync_interval: "manual" | "one_hour" | "six_hours" | "twelve_hours" | "daily" | "weekly";
}

export interface MetaBusinessConnection {
  id: string;
  name: string;
  meta_user_id: string;
  meta_user_name: string | null;
  token_expires_at: string | null;
  granted_scopes: string[];
  status: MetaConnectionStatus;
  last_validated_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaBusinessAsset {
  id: string;
  name: string;
  verification_status?: string | null;
}

export interface MetaAdAccountAsset {
  id: string;
  account_id: string;
  name: string;
  account_status?: number | null;
  currency?: string | null;
  timezone_name?: string | null;
  business_id?: string | null;
  business_name?: string | null;
  access_origin: MetaAccessOrigin;
  user_tasks?: string[];
}

export interface MetaInsightAction {
  action_type: string;
  value: string;
}

export interface MetaInsightRow {
  date_start: string;
  date_stop?: string;
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  objective?: string;
  reach?: string;
  impressions?: string;
  frequency?: string;
  spend?: string;
  cpm?: string;
  clicks?: string;
  inline_link_clicks?: string;
  cpc?: string;
  ctr?: string;
  inline_post_engagement?: string;
  actions?: MetaInsightAction[];
  cost_per_action_type?: MetaInsightAction[];
  action_values?: MetaInsightAction[];
  purchase_roas?: MetaInsightAction[];
}
