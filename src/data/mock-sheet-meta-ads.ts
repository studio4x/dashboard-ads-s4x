// ============================================================
// Mock: Meta Ads (aba "meta_ads" do Google Sheets)
// ============================================================

import type { CampaignRow, MetricRow } from "@/types/sheet-rows";

export const mockMetaAdsCampaigns: CampaignRow[] = [
  { date: "2024-04-28", campaign_id: "23012345601", campaign_name: "Conversões — Catálogo Dinâmico", platform: "meta_ads", impressions: 284000, clicks: 4260, cost: 5960, conversions: 182, revenue: 32760, ctr: 1.50, cpc: 1.40, cpa: 32.75, roas: 5.50, status: "active", objective: "CONVERSIONS" },
  { date: "2024-04-28", campaign_id: "23012345602", campaign_name: "Tráfego — Blog e Conteúdo", platform: "meta_ads", impressions: 192000, clicks: 5760, cost: 2880, conversions: 48, revenue: 8640, ctr: 3.00, cpc: 0.50, cpa: 60.00, roas: 3.00, status: "active", objective: "LINK_CLICKS" },
  { date: "2024-04-28", campaign_id: "23012345603", campaign_name: "Remarketing — Visitantes 30 dias", platform: "meta_ads", impressions: 148000, clicks: 2960, cost: 2072, conversions: 94, revenue: 18800, ctr: 2.00, cpc: 0.70, cpa: 22.04, roas: 9.07, status: "active", objective: "CONVERSIONS" },
  { date: "2024-04-28", campaign_id: "23012345604", campaign_name: "Prospecção — Público Similar 1%", platform: "meta_ads", impressions: 412000, clicks: 6180, cost: 8652, conversions: 162, revenue: 29160, ctr: 1.50, cpc: 1.40, cpa: 53.41, roas: 3.37, status: "active", objective: "CONVERSIONS" },
  { date: "2024-04-28", campaign_id: "23012345605", campaign_name: "Engajamento — Stories e Reels", platform: "meta_ads", impressions: 624000, clicks: 3120, cost: 1248, conversions: 18, revenue: 3240, ctr: 0.50, cpc: 0.40, cpa: 69.33, roas: 2.60, status: "active", objective: "POST_ENGAGEMENT" },
];

export const mockMetaAdsKpis = {
  total_spend: 69600, total_revenue: 348000, total_conversions: 2008,
  total_clicks: 82400, total_impressions: 2840000, avg_ctr: 2.90,
  avg_cpc: 0.84, avg_cpa: 34.66, avg_roas: 5.00,
  prev_total_spend: 64800, prev_total_revenue: 311040, prev_total_conversions: 1820,
};

export const mockMetaAdsDaily: MetricRow[] = [
  { date: "2024-04-01", metric_name: "spend", value: 2180, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-02", metric_name: "spend", value: 2350, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-03", metric_name: "spend", value: 2240, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-04", metric_name: "spend", value: 2490, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-05", metric_name: "spend", value: 2420, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-06", metric_name: "spend", value: 1820, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-07", metric_name: "spend", value: 1640, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-08", metric_name: "spend", value: 2560, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-09", metric_name: "spend", value: 2720, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-10", metric_name: "spend", value: 2850, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-11", metric_name: "spend", value: 2980, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-12", metric_name: "spend", value: 2890, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-13", metric_name: "spend", value: 2340, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-14", metric_name: "spend", value: 2120, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-15", metric_name: "spend", value: 1970, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-16", metric_name: "spend", value: 2100, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-17", metric_name: "spend", value: 1900, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-18", metric_name: "spend", value: 2150, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-19", metric_name: "spend", value: 2080, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-20", metric_name: "spend", value: 1720, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-21", metric_name: "spend", value: 1600, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-22", metric_name: "spend", value: 2220, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-23", metric_name: "spend", value: 2300, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-24", metric_name: "spend", value: 2360, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-25", metric_name: "spend", value: 2430, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-26", metric_name: "spend", value: 2380, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-27", metric_name: "spend", value: 1920, source: "meta_ads", period_type: "daily" },
  { date: "2024-04-28", metric_name: "spend", value: 20912, source: "meta_ads", period_type: "daily" },
];
