// ============================================================
// Mock: Google Ads S4X (Payload Normalizado)
// Representa o formato final após importação e normalização.
// ============================================================

import { GoogleAdsS4XPayload } from "@/types/google-ads-s4x";

export const mockGoogleAdsS4XPayload: GoogleAdsS4XPayload = {
  meta: {
    accountName: "Railog Logística — Google Ads",
    accountId: "123-456-7890",
    periodToken: "LAST_30_DAYS",
    dateStart: "2024-04-01",
    dateEnd: "2024-04-30",
    timezone: "America/Sao_Paulo",
    executedAt: "2024-05-15T10:00:00Z"
  },
  config: {
    templateId: "google_ads_s4x",
    templateLabel: "Google Ads S4X",
    templateVersion: "1.0",
    source: "Google Sheets",
    dateStart: "2024-04-01",
    dateEnd: "2024-04-30"
  },
  summary: {
    impressions: 1248000,
    clicks: 68420,
    cost: 87240.50,
    conversions: 2842,
    conversionValue: 412800.75,
    allConversions: 3120,
    allConversionsValue: 450000,
    ctr: 0.0548,
    avgCpc: 1.275,
    cpa: 30.69,
    conversionRate: 0.0415,
    roas: 4.73,
    avgCpm: 69.90
  },
  dailyPerformance: [
    {
      date: "2024-04-28",
      campaignName: "Search — Produtos Quentes | Exato",
      campaignStatus: "ENABLED",
      channelType: "SEARCH",
      impressions: 18420,
      clicks: 842,
      ctr: 0.0457,
      avgCpc: 1.76,
      cost: 1482.60,
      conversions: 48,
      conversionValue: 8640,
      costPerConversion: 30.89,
      allConversions: 52,
      allConversionsValue: 9360,
      avgCpm: 80.48,
      conversionRate: 0.057,
      roas: 5.83,
      aiKey: "search_hot_exact"
    },
    {
      date: "2024-04-28",
      campaignName: "Performance Max — E-commerce",
      campaignStatus: "ENABLED",
      channelType: "PERFORMANCE_MAX",
      impressions: 42800,
      clicks: 1840,
      ctr: 0.0430,
      avgCpc: 1.50,
      cost: 2760,
      conversions: 95,
      conversionValue: 18050,
      costPerConversion: 29.05,
      allConversions: 102,
      allConversionsValue: 19500,
      avgCpm: 64.48,
      conversionRate: 0.051,
      roas: 6.54,
      aiKey: "pmax_ecomm"
    }
  ],
  campaigns: [
    {
      campaignName: "Search — Produtos Quentes | Exato",
      campaignStatus: "ENABLED",
      channelType: "SEARCH",
      impressions: 184200,
      clicks: 8420,
      ctr: 0.0457,
      avgCpc: 1.76,
      cost: 14826,
      conversions: 480,
      conversionValue: 86400,
      costPerConversion: 30.89,
      allConversions: 520,
      allConversionsValue: 93600,
      interactionRate: 0.0457,
      interactions: 8420,
      searchImpressionShare: 0.85,
      searchRankLostImpressionShare: 0.05,
      searchBudgetLostImpressionShare: 0.10,
      avgCpm: 80.48,
      conversionRate: 0.057,
      roas: 5.83,
      aiKey: "search_hot_exact"
    }
  ],
  adGroups: [
    {
      campaignName: "Search — Produtos Quentes | Exato",
      adGroupName: "Produtos Destaque",
      adGroupStatus: "ENABLED",
      impressions: 92100,
      clicks: 4210,
      ctr: 0.0457,
      avgCpc: 1.76,
      cost: 7413,
      conversions: 240,
      conversionValue: 43200,
      costPerConversion: 30.89,
      allConversions: 260,
      allConversionsValue: 46800,
      interactions: 4210,
      interactionRate: 0.0457,
      avgCost: 1.76,
      avgCpm: 80.48,
      conversionRate: 0.057,
      roas: 5.83,
      aiKey: "adgroup_hot_feat"
    }
  ],
  keywords: [
    {
      campaignName: "Search — Produtos Quentes | Exato",
      adGroupName: "Produtos Destaque",
      keyword: "comprar tênis online",
      matchType: "EXACT",
      status: "ENABLED",
      qualityScore: 8,
      creativeQualityScore: "ABOVE_AVERAGE",
      postClickQualityScore: "AVERAGE",
      searchPredictedCtr: "ABOVE_AVERAGE",
      impressions: 32000,
      clicks: 1820,
      ctr: 0.0569,
      avgCpc: 1.76,
      cost: 3203.20,
      conversions: 120,
      conversionValue: 21600,
      costPerConversion: 26.69,
      allConversions: 130,
      allConversionsValue: 23400,
      conversionRate: 0.0659,
      roas: 6.74,
      aiKey: "kw_tenis_online"
    }
  ],
  searchTerms: [
    {
      campaignName: "Search — Produtos Quentes | Exato",
      adGroupName: "Produtos Destaque",
      termMatchType: "EXACT",
      searchTerm: "melhor tênis de corrida 2024",
      termStatus: "ADDED",
      impressions: 1200,
      clicks: 85,
      ctr: 0.0708,
      avgCpc: 1.45,
      cost: 123.25,
      conversions: 5,
      conversionValue: 950,
      costPerConversion: 24.65,
      allConversions: 5,
      allConversionsValue: 950,
      avgCpm: 102.71,
      conversionRate: 0.0588,
      roas: 7.71,
      aiKey: "st_melhor_tenis"
    }
  ],
  negativeKeywords: [
    {
      campaignName: "Search — Produtos Quentes | Exato",
      negativeOrigin: "CAMPAIGN",
      negativeList: "Geral",
      negativeKeyword: "grátis",
      matchType: "BROAD",
      aiKey: "neg_gratis"
    }
  ],
  adsAndAssets: [
    {
      campaignName: "Search — Produtos Quentes | Exato",
      adGroupName: "Produtos Destaque",
      adStatus: "ENABLED",
      assetType: "HEADLINE",
      assetText: "Melhores Tênis em Promoção",
      metricsOrigin: "ASSET",
      impressions: 5400,
      clicks: 210,
      ctr: 0.0388,
      avgCpc: 1.85,
      cost: 388.50,
      conversions: 12,
      conversionValue: 1800,
      costPerConversion: 32.37,
      allConversions: 12,
      allConversionsValue: 1800,
      avgCpm: 71.94,
      conversionRate: 0.0571,
      roas: 4.63,
      aiKey: "asset_headline_1",
      isAggregatable: false
    }
  ],
  diagnostics: {
    templateValidation: { isValid: true, errors: [], warnings: [] },
    schemaValidation: { isValid: true, errors: [], warnings: [] },
    warnings: [],
    errors: [],
    rowCounts: {
      "Performance Diária": 30,
      "Campanhas": 5,
      "Grupos de Anúncios": 15,
      "Palavras-Chave": 50,
      "Termos de Pesquisa": 100,
      "Palavras-Chave Negativas": 20,
      "Anúncios (Recursos)": 40
    },
    ignoredRows: 0,
    sourceSpreadsheetId: "mock_spreadsheet_id",
    importedAt: "2024-05-15T10:00:00Z",
    snapshotVersion: "google_ads_s4x_v1"
  }
};
