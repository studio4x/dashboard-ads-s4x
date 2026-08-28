import { MetricsHelper } from "../google-sheets/metrics-helper.ts";
import { buildGoogleAdsFinancialStatus, calculateAverageDailySpend, microsToCurrency } from "../ads-financial.ts";
import type {
  GoogleAdsS4XAdAsset,
  GoogleAdsS4XAdGroup,
  GoogleAdsS4XCampaign,
  GoogleAdsS4XDailyPerformance,
  GoogleAdsS4XKeyword,
  GoogleAdsS4XNegativeKeyword,
  GoogleAdsS4XPayload,
  GoogleAdsS4XSearchTerm,
} from "@/types/google-ads-s4x";
import type { GoogleAdsApiRow } from "@/types/google-ads-api";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function value(source: UnknownRecord | undefined, key: string) {
  return source?.[key];
}

function text(source: UnknownRecord | undefined, key: string, fallback = "") {
  const result = value(source, key);
  return result === null || result === undefined ? fallback : String(result);
}

function number(source: UnknownRecord | undefined, key: string) {
  const parsed = Number(value(source, key) ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(source: UnknownRecord | undefined, key: string) {
  const raw = value(source, key);
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function stableKey(...parts: Array<string | number | null | undefined>) {
  return parts.map((part) => String(part ?? "").trim()).join(":");
}

export { microsToCurrency } from "../ads-financial.ts";

export function ratioToPercent(valueAsRatio: unknown) {
  if (valueAsRatio === null || valueAsRatio === undefined || valueAsRatio === "") return null;
  const parsed = Number(valueAsRatio);
  return Number.isFinite(parsed) ? parsed * 100 : null;
}

export function deriveGoogleAdsMetrics(input: {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  interactions?: number;
}) {
  const safe = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null;
  return {
    ctr: input.impressions > 0 ? (input.clicks / input.impressions) * 100 : null,
    avgCpc: safe(input.cost, input.clicks),
    costPerConversion: safe(input.cost, input.conversions),
    cpa: safe(input.cost, input.conversions),
    conversionRate: input.clicks > 0 ? (input.conversions / input.clicks) * 100 : null,
    roas: safe(input.conversionValue, input.cost),
    avgCpm: input.impressions > 0 ? (input.cost / input.impressions) * 1000 : null,
    interactionRate: input.impressions > 0 ? ((input.interactions || 0) / input.impressions) * 100 : null,
  };
}

function metrics(row: GoogleAdsApiRow) {
  const source = row.metrics;
  const base = {
    impressions: number(source, "impressions"),
    clicks: number(source, "clicks"),
    cost: microsToCurrency(value(source, "costMicros")),
    conversions: number(source, "conversions"),
    conversionValue: number(source, "conversionsValue"),
    allConversions: number(source, "allConversions"),
    allConversionsValue: number(source, "allConversionsValue"),
    interactions: number(source, "interactions"),
  };
  return { ...base, ...deriveGoogleAdsMetrics(base) };
}

export function normalizeDailyPerformance(row: GoogleAdsApiRow): GoogleAdsS4XDailyPerformance {
  const campaignId = text(row.campaign, "id") || null;
  const calculated = metrics(row);
  return {
    date: text(row.segments, "date"), campaignId,
    campaignName: text(row.campaign, "name", "Sem campanha"),
    campaignStatus: text(row.campaign, "status"), channelType: text(row.campaign, "advertisingChannelType"),
    aggregationScope: "CAMPAIGN_DATE", ...calculated,
    aiKey: stableKey("campaign_date", campaignId, text(row.segments, "date")),
  };
}

export function normalizeCampaign(row: GoogleAdsApiRow): GoogleAdsS4XCampaign {
  const campaignId = text(row.campaign, "id") || null;
  const calculated = metrics(row);
  return {
    campaignId, campaignName: text(row.campaign, "name", "Sem campanha"),
    campaignStatus: text(row.campaign, "status"), channelType: text(row.campaign, "advertisingChannelType"),
    aggregationScope: "CAMPAIGN", ...calculated,
    interactionRate: ratioToPercent(value(row.metrics, "interactionRate")) ?? calculated.interactionRate,
    searchImpressionShare: ratioToPercent(value(row.metrics, "searchImpressionShare")),
    searchRankLostImpressionShare: ratioToPercent(value(row.metrics, "searchRankLostImpressionShare")),
    searchBudgetLostImpressionShare: ratioToPercent(value(row.metrics, "searchBudgetLostImpressionShare")),
    aiKey: stableKey("campaign", campaignId),
  };
}

export function normalizeAdGroup(row: GoogleAdsApiRow): GoogleAdsS4XAdGroup {
  const campaignId = text(row.campaign, "id") || null;
  const adGroupId = text(row.adGroup, "id") || null;
  const calculated = metrics(row);
  return {
    campaignId, adGroupId, campaignName: text(row.campaign, "name", "Sem campanha"),
    adGroupName: text(row.adGroup, "name", "Sem grupo"), adGroupStatus: text(row.adGroup, "status"),
    aggregationScope: "AD_GROUP", ...calculated,
    interactionRate: ratioToPercent(value(row.metrics, "interactionRate")) ?? calculated.interactionRate,
    avgCost: microsToCurrency(value(row.metrics, "averageCost")) || calculated.avgCpc,
    aiKey: stableKey("ad_group", campaignId, adGroupId),
  };
}

export function normalizeKeyword(row: GoogleAdsApiRow): GoogleAdsS4XKeyword {
  const campaignId = text(row.campaign, "id") || null;
  const adGroupId = text(row.adGroup, "id") || null;
  const criterionId = text(row.adGroupCriterion, "criterionId") || null;
  const keyword = record(row.adGroupCriterion?.keyword);
  const quality = record(row.adGroupCriterion?.qualityInfo);
  return {
    campaignId, adGroupId, criterionId,
    campaignName: text(row.campaign, "name", "Sem campanha"), adGroupName: text(row.adGroup, "name", "Sem grupo"),
    keyword: text(keyword, "text"), matchType: text(keyword, "matchType"), status: text(row.adGroupCriterion, "status"),
    aggregationScope: "KEYWORD", qualityScore: nullableNumber(quality, "qualityScore"),
    creativeQualityScore: text(quality, "creativeQualityScore") || null,
    postClickQualityScore: text(quality, "postClickQualityScore") || null,
    searchPredictedCtr: text(quality, "searchPredictedCtr") || null,
    ...metrics(row), aiKey: stableKey("keyword", campaignId, adGroupId, criterionId),
  };
}

export function normalizeSearchTerm(row: GoogleAdsApiRow): GoogleAdsS4XSearchTerm {
  const campaignId = text(row.campaign, "id") || null;
  const adGroupId = text(row.adGroup, "id") || null;
  const term = text(row.searchTermView, "searchTerm");
  return {
    campaignId, adGroupId, campaignName: text(row.campaign, "name", "Sem campanha"),
    adGroupName: text(row.adGroup, "name", "Sem grupo"), termMatchType: text(row.segments, "searchTermMatchType"),
    searchTerm: term, termStatus: text(row.searchTermView, "status"), aggregationScope: "SEARCH_TERM",
    ...metrics(row), aiKey: stableKey("search_term", campaignId, adGroupId, term),
  };
}

export function normalizeCampaignNegative(row: GoogleAdsApiRow): GoogleAdsS4XNegativeKeyword {
  const campaignId = text(row.campaign, "id") || null;
  const criterionId = text(row.campaignCriterion, "criterionId") || null;
  const keyword = record(row.campaignCriterion?.keyword);
  return {
    campaignId, criterionId, campaignName: text(row.campaign, "name", "Sem campanha"),
    negativeOrigin: "CAMPAIGN", negativeList: null, negativeKeyword: text(keyword, "text"),
    matchType: text(keyword, "matchType"), aiKey: stableKey("negative", campaignId, criterionId),
  };
}

export function normalizeSharedNegatives(sharedRows: GoogleAdsApiRow[], associationRows: GoogleAdsApiRow[]) {
  const campaignsBySharedSet = new Map<string, Array<{ id: string; name: string }>>();
  associationRows.forEach((row) => {
    const sharedSetId = text(row.sharedSet, "id");
    const list = campaignsBySharedSet.get(sharedSetId) || [];
    list.push({ id: text(row.campaign, "id"), name: text(row.campaign, "name", "Sem campanha") });
    campaignsBySharedSet.set(sharedSetId, list);
  });

  return sharedRows.flatMap((row): GoogleAdsS4XNegativeKeyword[] => {
    const sharedSetId = text(row.sharedSet, "id");
    const criterionId = text(row.sharedCriterion, "criterionId") || null;
    const keyword = record(row.sharedCriterion?.keyword);
    const campaigns = campaignsBySharedSet.get(sharedSetId) || [{ id: "", name: "Lista compartilhada" }];
    return campaigns.map((campaign) => ({
      campaignId: campaign.id || null, criterionId, sharedSetId: sharedSetId || null, campaignName: campaign.name,
      negativeOrigin: "CAMPAIGN_LIST", negativeList: text(row.sharedSet, "name") || null,
      negativeKeyword: text(keyword, "text"), matchType: text(keyword, "matchType"),
      aiKey: stableKey("shared_negative", campaign.id, sharedSetId, criterionId),
    }));
  });
}

function normalizeAdBase(row: GoogleAdsApiRow): GoogleAdsS4XAdAsset {
  const ad = record(row.adGroupAd?.ad);
  const campaignId = text(row.campaign, "id") || null;
  const adGroupId = text(row.adGroup, "id") || null;
  const adId = text(ad, "id") || null;
  const urls = Array.isArray(ad.finalUrls) ? ad.finalUrls.map(String).join(", ") : "";
  return {
    campaignId, adGroupId, adId, assetId: null, campaignName: text(row.campaign, "name", "Sem campanha"),
    adGroupName: text(row.adGroup, "name", "Sem grupo"), adStatus: text(row.adGroupAd, "status") || null,
    assetType: `AD_${text(ad, "type", "UNKNOWN")}`, assetText: text(ad, "name") || urls || `Anúncio ${adId}`,
    metricsOrigin: "AD", aggregationScope: "AD", ...metrics(row), aiKey: stableKey("ad", campaignId, adGroupId, adId),
    isAggregatable: true,
  };
}

function textAssets(valueToRead: unknown) {
  return Array.isArray(valueToRead)
    ? valueToRead.map((item) => text(record(item), "text")).filter(Boolean)
    : [];
}

export function normalizeAd(row: GoogleAdsApiRow): GoogleAdsS4XAdAsset[] {
  const base = normalizeAdBase(row);
  const responsive = record(record(row.adGroupAd?.ad).responsiveSearchAd);
  const details = [
    ...textAssets(responsive.headlines).map((assetText) => ({ assetType: "HEADLINE", assetText })),
    ...textAssets(responsive.descriptions).map((assetText) => ({ assetType: "DESCRIPTION", assetText })),
  ];
  return [base, ...details.map((detail, index): GoogleAdsS4XAdAsset => ({
    ...base, ...detail, metricsOrigin: "AD_TEXT", aggregationScope: "AD_ASSET_TEXT",
    impressions: null, clicks: null, ctr: null, avgCpc: null, cost: null, conversions: null,
    conversionValue: null, costPerConversion: null, allConversions: null, allConversionsValue: null,
    avgCpm: null, conversionRate: null, roas: null,
    aiKey: stableKey(base.aiKey, detail.assetType, index), isAggregatable: false,
  }))];
}

export function normalizeAdAsset(row: GoogleAdsApiRow): GoogleAdsS4XAdAsset {
  const assetId = text(row.asset, "id") || null;
  const campaignId = text(row.campaign, "id") || null;
  const adGroupId = text(row.adGroup, "id") || null;
  const ad = record(row.adGroupAd?.ad);
  return {
    campaignId, adGroupId, adId: text(ad, "id") || null, assetId,
    campaignName: text(row.campaign, "name", "Sem campanha"), adGroupName: text(row.adGroup, "name", "Sem grupo"),
    adStatus: text(row.adGroupAd, "status") || null,
    assetType: text(row.adGroupAdAssetView, "fieldType") || text(row.asset, "type", "ASSET"),
    assetText: text(record(row.asset?.textAsset), "text") || text(row.asset, "name") || `Asset ${assetId}`,
    metricsOrigin: "ASSET", aggregationScope: "AD_ASSET", ...metrics(row),
    aiKey: stableKey("asset", campaignId, adGroupId, text(ad, "id"), assetId), isAggregatable: false,
  };
}

export function normalizePmaxAsset(row: GoogleAdsApiRow): GoogleAdsS4XAdAsset {
  const campaignId = text(row.campaign, "id") || null;
  const assetId = text(row.asset, "id") || null;
  const assetGroupId = text(row.assetGroup, "id");
  return {
    campaignId, adGroupId: null, adId: null, assetId, campaignName: text(row.campaign, "name", "Sem campanha"),
    adGroupName: text(row.assetGroup, "name", "Grupo de recursos"), adStatus: text(row.assetGroupAsset, "status") || null,
    assetType: text(row.assetGroupAsset, "fieldType") || text(row.asset, "type", "ASSET"),
    assetText: text(record(row.asset?.textAsset), "text") || text(row.asset, "name") || `Asset ${assetId}`,
    metricsOrigin: "P_MAX_ASSET", aggregationScope: "ASSET_GROUP", impressions: null, clicks: null, ctr: null,
    avgCpc: null, cost: null, conversions: null, conversionValue: null, costPerConversion: null,
    allConversions: null, allConversionsValue: null, avgCpm: null, conversionRate: null, roas: null,
    aiKey: stableKey("pmax_asset", campaignId, assetGroupId, assetId), isAggregatable: false,
  };
}

export function buildGoogleAdsApiPayload(params: {
  customerId: string;
  customerName: string;
  managerCustomerId?: string | null;
  timezone?: string | null;
  apiVersion: string;
  dateStart: string;
  dateEnd: string;
  dailyRows: GoogleAdsApiRow[];
  campaignRows: GoogleAdsApiRow[];
  adGroupRows: GoogleAdsApiRow[];
  keywordRows: GoogleAdsApiRow[];
  searchTermRows: GoogleAdsApiRow[];
  campaignNegativeRows: GoogleAdsApiRow[];
  sharedNegativeRows: GoogleAdsApiRow[];
  campaignSharedSetRows: GoogleAdsApiRow[];
  adRows: GoogleAdsApiRow[];
  adAssetRows: GoogleAdsApiRow[];
  pmaxAssetRows: GoogleAdsApiRow[];
  accountBudgetRows?: GoogleAdsApiRow[];
  financialError?: string | null;
  currency?: string | null;
  warnings?: string[];
}): GoogleAdsS4XPayload {
  const dailyPerformance = params.dailyRows.map(normalizeDailyPerformance);
  const campaigns = params.campaignRows.map(normalizeCampaign);
  const adGroups = params.adGroupRows.map(normalizeAdGroup);
  const keywords = params.keywordRows.map(normalizeKeyword);
  const searchTerms = params.searchTermRows.map(normalizeSearchTerm);
  const negativeKeywords = [
    ...params.campaignNegativeRows.map(normalizeCampaignNegative),
    ...normalizeSharedNegatives(params.sharedNegativeRows, params.campaignSharedSetRows),
  ];
  const adsAndAssets = [
    ...params.adRows.flatMap(normalizeAd),
    ...params.adAssetRows.map(normalizeAdAsset),
    ...params.pmaxAssetRows.map(normalizePmaxAsset),
  ];
  const now = new Date().toISOString();
  const financialStatus = buildGoogleAdsFinancialStatus({
    rows: params.accountBudgetRows?.map((row) => row.accountBudget || row) || [],
    currency: params.currency,
    updatedAt: now,
    averageDailySpend: calculateAverageDailySpend(dailyPerformance),
    error: params.financialError,
    accountId: params.customerId,
    accountName: params.customerName,
  });
  return {
    meta: {
      accountName: params.customerName, accountId: params.customerId, dateStart: params.dateStart, dateEnd: params.dateEnd,
      queryCondition: `segments.date BETWEEN '${params.dateStart}' AND '${params.dateEnd}'`, executedAt: now,
      timezone: params.timezone || null,
    },
    config: {
      templateId: "google_ads_s4x", templateLabel: "Google Ads S4X", templateVersion: "1.0",
      source: "google_ads_api", dateStart: params.dateStart, dateEnd: params.dateEnd,
      notes: `Google Ads API ${params.apiVersion}; período completo reconsultado para preservar agregados.`,
    },
    summary: MetricsHelper.calculateSummary(dailyPerformance),
    dailyPerformance, campaigns, adGroups, keywords, searchTerms, negativeKeywords, adsAndAssets,
    financialStatus,
    diagnostics: {
      templateValidation: { isValid: true, source: "google_ads_api" },
      schemaValidation: { isValid: true, apiVersion: params.apiVersion }, warnings: params.warnings || [], errors: [],
      rowCounts: {
        dailyPerformance: dailyPerformance.length, campaigns: campaigns.length, adGroups: adGroups.length,
        keywords: keywords.length, searchTerms: searchTerms.length, negativeKeywords: negativeKeywords.length,
        adsAndAssets: adsAndAssets.length,
      },
      ignoredRows: 0, sourceCustomerId: params.customerId,
      sourceManagerCustomerId: params.managerCustomerId || null, sourceType: "google_ads_api",
      apiVersion: params.apiVersion, importedAt: now, snapshotVersion: "google_ads_s4x_v1",
    },
  };
}
