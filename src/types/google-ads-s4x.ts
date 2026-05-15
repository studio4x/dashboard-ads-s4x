/**
 * Payload Normalizado para o Template Google Ads S4X (v1.0)
 */

export interface GoogleAdsS4XMeta {
  accountName?: string | null;
  accountId?: string | null;
  periodToken?: string | null;
  dateStart?: string | null; // YYYY-MM-DD
  dateEnd?: string | null;   // YYYY-MM-DD
  queryCondition?: string | null;
  executedAt?: string | null;
  timezone?: string | null;
}

export interface GoogleAdsS4XConfig {
  templateId: string;
  templateLabel: string;
  templateVersion: string;
  source: string;
  periodToken?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  notes?: string | null;
}

export interface GoogleAdsS4XSummary {
  impressions: number | null;
  clicks: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cpa: number | null;
  conversionRate: number | null;
  roas: number | null;
  avgCpm: number | null;
}

export interface GoogleAdsS4XDailyPerformance {
  date: string;
  campaignName: string;
  campaignStatus: string;
  channelType: string;
  aggregationScope?: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  avgCpm: number | null;
  conversionRate: number | null;
  roas: number | null;
  aiKey: string | null;
}

export interface GoogleAdsS4XCampaign {
  campaignName: string;
  campaignStatus: string;
  channelType: string;
  aggregationScope?: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  interactionRate: number | null;
  interactions: number | null;
  searchImpressionShare: number | null;
  searchRankLostImpressionShare: number | null;
  searchBudgetLostImpressionShare: number | null;
  avgCpm: number | null;
  conversionRate: number | null;
  roas: number | null;
  aiKey: string | null;
}

export interface GoogleAdsS4XAdGroup {
  campaignName: string;
  adGroupName: string;
  adGroupStatus: string;
  aggregationScope?: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  interactions: number | null;
  interactionRate: number | null;
  avgCost: number | null;
  avgCpm: number | null;
  conversionRate: number | null;
  roas: number | null;
  aiKey: string | null;
}

export interface GoogleAdsS4XKeyword {
  campaignName: string;
  adGroupName: string;
  keyword: string;
  matchType: string;
  status: string;
  aggregationScope?: string | null;
  qualityScore: number | null;
  creativeQualityScore: string | null;
  postClickQualityScore: string | null;
  searchPredictedCtr: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  conversionRate: number | null;
  roas: number | null;
  aiKey: string | null;
}

export interface GoogleAdsS4XSearchTerm {
  campaignName: string;
  adGroupName: string;
  termMatchType: string;
  searchTerm: string;
  termStatus: string;
  aggregationScope?: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  avgCpm: number | null;
  conversionRate: number | null;
  roas: number | null;
  aiKey: string | null;
}

export interface GoogleAdsS4XNegativeKeyword {
  campaignName: string;
  negativeOrigin: string | null;
  negativeList: string | null;
  negativeKeyword: string;
  matchType: string;
  aiKey: string | null;
}

export interface GoogleAdsS4XAdAsset {
  campaignName: string;
  adGroupName: string;
  adStatus: string | null;
  assetType: string;
  assetText: string;
  metricsOrigin: string;
  aggregationScope?: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avgCpc: number | null;
  cost: number | null;
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;
  allConversions: number | null;
  allConversionsValue: number | null;
  avgCpm: number | null;
  conversionRate: number | null;
  roas: number | null;
  aiKey: string | null;
  isAggregatable: boolean;
}

export interface GoogleAdsS4XDiagnostics {
  templateValidation: any;
  schemaValidation: any;
  warnings: any[];
  errors: any[];
  exportLogs?: any[];
  rowCounts: Record<string, number>;
  ignoredRows: number;
  sourceSpreadsheetId: string;
  importedAt: string;
  snapshotVersion: string;
}

export interface GoogleAdsS4XPayload {
  meta: GoogleAdsS4XMeta;
  config: GoogleAdsS4XConfig;
  summary: GoogleAdsS4XSummary;
  dailyPerformance: GoogleAdsS4XDailyPerformance[];
  campaigns: GoogleAdsS4XCampaign[];
  adGroups: GoogleAdsS4XAdGroup[];
  keywords: GoogleAdsS4XKeyword[];
  searchTerms: GoogleAdsS4XSearchTerm[];
  negativeKeywords: GoogleAdsS4XNegativeKeyword[];
  adsAndAssets: GoogleAdsS4XAdAsset[];
  diagnostics: GoogleAdsS4XDiagnostics;
}
