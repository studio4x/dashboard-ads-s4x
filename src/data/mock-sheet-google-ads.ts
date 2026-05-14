// ============================================================
// Mock: Google Ads (aba "google_ads" e "campaigns" do Sheets)
// ============================================================

import type { CampaignRow, KeywordRow, MetricRow } from "@/types/sheet-rows";

export const mockGoogleAdsCampaigns: CampaignRow[] = [
  { date: "2024-04-28", campaign_id: "11234567890", campaign_name: "Search — Produtos Quentes | Exato", platform: "google_ads", impressions: 18420, clicks: 842, cost: 1482.60, conversions: 48, revenue: 8640, ctr: 4.57, cpc: 1.76, cpa: 30.89, roas: 5.83, status: "active", ad_group: "Produtos Destaque", objective: "Conversões" },
  { date: "2024-04-28", campaign_id: "11234567891", campaign_name: "Search — Marca | Todos os Tipos", platform: "google_ads", impressions: 9240, clicks: 1280, cost: 384, conversions: 62, revenue: 11160, ctr: 13.85, cpc: 0.30, cpa: 6.19, roas: 29.06, status: "active", ad_group: "Marca Principal", objective: "Conversões" },
  { date: "2024-04-28", campaign_id: "11234567892", campaign_name: "Performance Max — E-commerce", platform: "google_ads", impressions: 42800, clicks: 1840, cost: 2760, conversions: 95, revenue: 18050, ctr: 4.30, cpc: 1.50, cpa: 29.05, roas: 6.54, status: "active", objective: "Vendas" },
  { date: "2024-04-28", campaign_id: "11234567893", campaign_name: "Display — Remarketing | Carrinho Abandonado", platform: "google_ads", impressions: 124000, clicks: 980, cost: 490, conversions: 28, revenue: 5040, ctr: 0.79, cpc: 0.50, cpa: 17.50, roas: 10.29, status: "active", objective: "Remarketing" },
  { date: "2024-04-28", campaign_id: "11234567894", campaign_name: "Shopping — Catálogo Completo", platform: "google_ads", impressions: 31000, clicks: 1420, cost: 1136, conversions: 52, revenue: 9360, ctr: 4.58, cpc: 0.80, cpa: 21.85, roas: 8.24, status: "active", objective: "Vendas" },
  { date: "2024-04-28", campaign_id: "11234567895", campaign_name: "Vídeo — Awareness | YouTube", platform: "google_ads", impressions: 89000, clicks: 420, cost: 630, conversions: 12, revenue: 2160, ctr: 0.47, cpc: 1.50, cpa: 52.50, roas: 3.43, status: "active", objective: "Alcance" },
];

export const mockGoogleAdsKpis = {
  total_spend: 87240, total_revenue: 412800, total_conversions: 2842,
  total_clicks: 68420, total_impressions: 1248000, avg_ctr: 5.48,
  avg_cpc: 1.27, avg_cpa: 30.70, avg_roas: 4.73,
  prev_total_spend: 81200, prev_total_revenue: 374200, prev_total_conversions: 2540,
};

export const mockGoogleAdsDaily: MetricRow[] = [
  { date: "2024-04-01", metric_name: "spend", value: 2640, source: "google_ads", period_type: "daily" },
  { date: "2024-04-02", metric_name: "spend", value: 2890, source: "google_ads", period_type: "daily" },
  { date: "2024-04-03", metric_name: "spend", value: 2720, source: "google_ads", period_type: "daily" },
  { date: "2024-04-04", metric_name: "spend", value: 3050, source: "google_ads", period_type: "daily" },
  { date: "2024-04-05", metric_name: "spend", value: 2980, source: "google_ads", period_type: "daily" },
  { date: "2024-04-06", metric_name: "spend", value: 2200, source: "google_ads", period_type: "daily" },
  { date: "2024-04-07", metric_name: "spend", value: 1950, source: "google_ads", period_type: "daily" },
  { date: "2024-04-08", metric_name: "spend", value: 3120, source: "google_ads", period_type: "daily" },
  { date: "2024-04-09", metric_name: "spend", value: 3280, source: "google_ads", period_type: "daily" },
  { date: "2024-04-10", metric_name: "spend", value: 3450, source: "google_ads", period_type: "daily" },
  { date: "2024-04-11", metric_name: "spend", value: 3620, source: "google_ads", period_type: "daily" },
  { date: "2024-04-12", metric_name: "spend", value: 3520, source: "google_ads", period_type: "daily" },
  { date: "2024-04-13", metric_name: "spend", value: 2800, source: "google_ads", period_type: "daily" },
  { date: "2024-04-14", metric_name: "spend", value: 2550, source: "google_ads", period_type: "daily" },
  { date: "2024-04-15", metric_name: "spend", value: 2850, source: "google_ads", period_type: "daily" },
  { date: "2024-04-16", metric_name: "spend", value: 3020, source: "google_ads", period_type: "daily" },
  { date: "2024-04-17", metric_name: "spend", value: 2750, source: "google_ads", period_type: "daily" },
  { date: "2024-04-18", metric_name: "spend", value: 3150, source: "google_ads", period_type: "daily" },
  { date: "2024-04-19", metric_name: "spend", value: 3000, source: "google_ads", period_type: "daily" },
  { date: "2024-04-20", metric_name: "spend", value: 2480, source: "google_ads", period_type: "daily" },
  { date: "2024-04-21", metric_name: "spend", value: 2300, source: "google_ads", period_type: "daily" },
  { date: "2024-04-22", metric_name: "spend", value: 3200, source: "google_ads", period_type: "daily" },
  { date: "2024-04-23", metric_name: "spend", value: 3350, source: "google_ads", period_type: "daily" },
  { date: "2024-04-24", metric_name: "spend", value: 3420, source: "google_ads", period_type: "daily" },
  { date: "2024-04-25", metric_name: "spend", value: 3520, source: "google_ads", period_type: "daily" },
  { date: "2024-04-26", metric_name: "spend", value: 3440, source: "google_ads", period_type: "daily" },
  { date: "2024-04-27", metric_name: "spend", value: 2780, source: "google_ads", period_type: "daily" },
  { date: "2024-04-28", metric_name: "spend", value: 6883, source: "google_ads", period_type: "daily" },
];

export const mockKeywords: KeywordRow[] = [
  { date: "2024-04-28", keyword: "comprar tênis online", match_type: "exact", campaign_name: "Search — Produtos Quentes | Exato", ad_group: "Calçados", impressions: 3200, clicks: 182, cost: 320.32, conversions: 12, ctr: 5.69, cpc: 1.76, quality_score: 8, position: 1.2 },
  { date: "2024-04-28", keyword: "roupa academia feminina", match_type: "phrase", campaign_name: "Search — Produtos Quentes | Exato", ad_group: "Roupas Fitness", impressions: 2840, clicks: 154, cost: 271.04, conversions: 9, ctr: 5.42, cpc: 1.76, quality_score: 7, position: 1.5 },
  { date: "2024-04-28", keyword: "loja xyz", match_type: "exact", campaign_name: "Search — Marca | Todos os Tipos", ad_group: "Marca Principal", impressions: 4800, clicks: 680, cost: 204, conversions: 34, ctr: 14.17, cpc: 0.30, quality_score: 10, position: 1.0 },
  { date: "2024-04-28", keyword: "site loja xyz", match_type: "exact", campaign_name: "Search — Marca | Todos os Tipos", ad_group: "Marca Principal", impressions: 2100, clicks: 310, cost: 93, conversions: 16, ctr: 14.76, cpc: 0.30, quality_score: 10, position: 1.0 },
  { date: "2024-04-28", keyword: "mochila escolar barata", match_type: "broad", campaign_name: "Search — Produtos Quentes | Exato", ad_group: "Bolsas e Mochilas", impressions: 5600, clicks: 198, cost: 347.82, conversions: 8, ctr: 3.54, cpc: 1.76, quality_score: 6, position: 2.1 },
  { date: "2024-04-28", keyword: "tênis corrida masculino", match_type: "phrase", campaign_name: "Search — Produtos Quentes | Exato", ad_group: "Calçados", impressions: 2400, clicks: 108, cost: 189.96, conversions: 7, ctr: 4.50, cpc: 1.76, quality_score: 7, position: 1.8 },
];
