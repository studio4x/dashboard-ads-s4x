// ============================================================
// Types: Sheet Rows
// Simulam as linhas que viriam de abas do Google Sheets
// ============================================================

export type Platform = "google_ads" | "meta_ads" | "ga4" | "search_console" | "overview";

export type PeriodType = "daily" | "weekly" | "monthly";

export type TrendDirection = "up" | "down" | "neutral";

export type CampaignStatus = "active" | "paused" | "removed" | "ended";

// Linha genérica de métrica (aba: overview, google_ads, meta_ads)
export interface MetricRow {
  date: string; // YYYY-MM-DD
  metric_name: string;
  value: number;
  source: Platform;
  period_type: PeriodType;
  client_id?: string;
  dashboard_id?: string;
}

// Linha de campanha (aba: campaigns)
export interface CampaignRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  impressions: number;
  clicks: number;
  cost: number; // BRL
  conversions: number;
  revenue: number;
  ctr: number; // %
  cpc: number; // BRL
  cpa: number; // BRL
  roas: number; // x
  status: CampaignStatus;
  ad_group?: string;
  objective?: string;
}

// Linha de palavra-chave (aba: keywords)
export interface KeywordRow {
  date: string;
  keyword: string;
  match_type: "exact" | "phrase" | "broad";
  campaign_name: string;
  ad_group: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  quality_score?: number;
  position?: number;
}

// Linha de termo de pesquisa (aba: search_terms)
export interface SearchTermRow {
  date: string;
  search_term: string;
  keyword_matched: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

// Linha de dispositivo (aba: devices)
export interface DeviceRow {
  date: string;
  device: "desktop" | "mobile" | "tablet";
  platform: Platform;
  sessions: number;
  users: number;
  clicks: number;
  cost: number;
  conversions: number;
  bounce_rate?: number;
}

// Linha de localização (aba: locations)
export interface LocationRow {
  date: string;
  country: string;
  state: string;
  city: string;
  platform: Platform;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  sessions?: number;
}

// Linha de página (aba: pages — GA4)
export interface PageRow {
  date: string;
  page_path: string;
  page_title: string;
  sessions: number;
  users: number;
  page_views: number;
  avg_session_duration: number; // seconds
  bounce_rate: number; // %
  goal_completions?: number;
}

// Linha de evento (aba: ga4_events)
export interface EventRow {
  date: string;
  event_name: string;
  event_count: number;
  users: number;
  sessions: number;
  conversions: number;
  source?: string;
  medium?: string;
  campaign?: string;
}

// Linha de audiência (aba: audience)
export interface AudienceRow {
  date: string;
  dimension: string; // age_group | gender | interest | channel | source
  dimension_value: string;
  sessions: number;
  users: number;
  new_users: number;
  conversions: number;
  revenue?: number;
}

// Linha de Search Console (aba: search_console)
export interface SearchConsoleRow {
  date: string;
  query: string;
  page: string;
  country: string;
  device: string;
  impressions: number;
  clicks: number;
  ctr: number; // %
  position: number;
}

// Linha de insight (aba: insights)
export interface InsightRow {
  date: string;
  insight_type: "positive" | "warning" | "info" | "alert";
  title: string;
  description: string;
  metric?: string;
  value?: number;
  comparison_value?: number;
  source: Platform | "system";
  priority: 1 | 2 | 3; // 1 = alta
}

// Overview consolidado (aba: overview)
export interface OverviewRow {
  date: string;
  total_spend: number;
  total_revenue: number;
  total_conversions: number;
  total_clicks: number;
  total_impressions: number;
  blended_roas: number;
  blended_cpa: number;
  google_ads_spend: number;
  meta_ads_spend: number;
  organic_sessions: number;
  paid_sessions: number;
}
