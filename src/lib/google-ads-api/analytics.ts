import { createHash } from "node:crypto";
import type { GoogleAdsApiRow } from "@/types/google-ads-api";

export const GOOGLE_ADS_ANALYTIC_DATASETS = [
  "campaign_daily", "ad_group_daily", "keyword_daily", "search_terms_daily", "pmax_search_terms_daily",
  "ad_daily", "asset_daily", "pmax_asset_group", "pmax_asset_group_asset", "device_daily", "network_daily",
  "time_daily", "location_daily", "landing_page_daily", "conversion_action_daily", "placement_daily",
  "shopping_daily", "demographics_age_daily", "demographics_gender_daily",
] as const;

export type GoogleAdsAnalyticDataset = typeof GOOGLE_ADS_ANALYTIC_DATASETS[number];
export type GoogleAdsDatasetStatus = "success" | "error" | "not_applicable" | "unsupported" | "no_data";

type JsonRecord = Record<string, unknown>;
type AnalyticsSource = { dataSourceId: string; customerId: string; managerCustomerId?: string | null; observedAt: string };

export type ParsedChangeResourceIds = {
  campaignId: string | null;
  adGroupId: string | null;
  criterionId: string | null;
  adId: string | null;
  assetId: string | null;
  campaignBudgetId: string | null;
};

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function get(source: JsonRecord | undefined, key: string) {
  return source?.[key];
}

function stringValue(source: JsonRecord | undefined, key: string) {
  const raw = get(source, key);
  return raw === null || raw === undefined ? null : String(raw);
}

function numberValue(source: JsonRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const raw = get(source, key);
    if (raw !== null && raw !== undefined && raw !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function hash(value: JsonRecord) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function dimensions(row: GoogleAdsApiRow): JsonRecord {
  const campaign = object(row.campaign);
  const adGroup = object(row.adGroup);
  const criterion = object(row.adGroupCriterion);
  const keyword = object(criterion.keyword);
  const searchTerm = object(row.searchTermView);
  const campaignSearchTerm = object(row.campaignSearchTermView);
  const adGroupAd = object(row.adGroupAd);
  const ad = object(adGroupAd.ad);
  const asset = object(row.asset);
  const assetGroup = object(row.assetGroup);
  const segments = object(row.segments);
  const landing = object(row.landingPageView);
  const geographic = object(row.geographicView);
  const ageRange = object(criterion.ageRange);
  const gender = object(criterion.gender);
  const matchedKeyword = object(segments.keyword);
  const matchedKeywordInfo = object(matchedKeyword.info);
  const placement = object(row.detailPlacementView);
  const budget = object(row.campaignBudget || row.accountBudget);
  const change = object(row.changeEvent);

  return {
    date: stringValue(segments, "date"),
    observedAt: null,
    campaignId: stringValue(campaign, "id"), campaignName: stringValue(campaign, "name"),
    campaignStatus: stringValue(campaign, "status"), campaignPrimaryStatus: stringValue(campaign, "primaryStatus"),
    campaignPrimaryStatusReasons: get(campaign, "primaryStatusReasons") ?? null,
    channelType: stringValue(campaign, "advertisingChannelType"), channelSubType: stringValue(campaign, "advertisingChannelSubType"),
    biddingStrategyType: stringValue(campaign, "biddingStrategyType"), biddingStrategy: stringValue(campaign, "biddingStrategy"),
    adGroupId: stringValue(adGroup, "id"), adGroupName: stringValue(adGroup, "name"),
    adGroupStatus: stringValue(adGroup, "status"), adGroupType: stringValue(adGroup, "type"),
    adGroupPrimaryStatus: stringValue(adGroup, "primaryStatus"), adGroupPrimaryStatusReasons: get(adGroup, "primaryStatusReasons") ?? null,
    criterionId: stringValue(criterion, "criterionId"), keywordText: stringValue(keyword, "text"), keywordMatchType: stringValue(keyword, "matchType"),
    keywordStatus: stringValue(criterion, "status"), keywordPrimaryStatus: stringValue(criterion, "primaryStatus"), keywordPrimaryStatusReasons: get(criterion, "primaryStatusReasons") ?? null,
    ageRange: stringValue(ageRange, "type") || stringValue(object(row.ageRangeView), "type"),
    gender: stringValue(gender, "type") || stringValue(object(row.genderView), "type"),
    searchTerm: stringValue(searchTerm, "searchTerm") || stringValue(campaignSearchTerm, "searchTerm"),
    searchTermStatus: stringValue(searchTerm, "status"), searchTermSource: stringValue(segments, "searchTermMatchSource"),
    searchTermMatchType: stringValue(segments, "searchTermMatchType"), searchTermTargetingStatus: stringValue(segments, "searchTermTargetingStatus"),
    matchedKeywordCriterion: stringValue(matchedKeyword, "adGroupCriterion") || stringValue(segments, "keywordAdGroupCriterion"),
    matchedKeywordText: stringValue(matchedKeywordInfo, "text") || stringValue(segments, "keywordInfoText"),
    matchedKeywordMatchType: stringValue(matchedKeywordInfo, "matchType") || stringValue(segments, "keywordInfoMatchType"),
    adId: stringValue(ad, "id"), adName: stringValue(ad, "name"), adStatus: stringValue(adGroupAd, "status"), adType: stringValue(ad, "type"),
    adPrimaryStatus: stringValue(adGroupAd, "primaryStatus"), adPrimaryStatusReasons: get(adGroupAd, "primaryStatusReasons") ?? null,
    assetId: stringValue(asset, "id"), assetName: stringValue(asset, "name"), assetType: stringValue(asset, "type"),
    assetGroupId: stringValue(assetGroup, "id"), assetGroupName: stringValue(assetGroup, "name"), assetGroupStatus: stringValue(assetGroup, "status"),
    assetGroupAdStrength: stringValue(assetGroup, "adStrength"), assetFieldType: stringValue(row.adGroupAdAssetView, "fieldType") || stringValue(row.assetGroupAsset, "fieldType"),
    device: stringValue(segments, "device"), network: stringValue(segments, "adNetworkType"), subNetwork: stringValue(segments, "adSubNetworkType"),
    dayOfWeek: stringValue(segments, "dayOfWeek"), hour: numberValue(segments, "hour"),
    country: stringValue(segments, "geoTargetCountry"), region: stringValue(segments, "geoTargetRegion"), state: stringValue(segments, "geoTargetState"),
    city: stringValue(segments, "geoTargetCity"), metro: stringValue(segments, "geoTargetMetro"), mostSpecificLocation: stringValue(segments, "geoTargetMostSpecificLocation"),
    locationType: stringValue(geographic, "locationType"), countryCriterionId: stringValue(geographic, "countryCriterionId"),
    landingPageUrl: stringValue(landing, "unexpandedFinalUrl"), landingPageSource: stringValue(segments, "landingPageSource"),
    conversionAction: stringValue(segments, "conversionAction"), conversionActionName: stringValue(segments, "conversionActionName"),
    conversionActionCategory: stringValue(segments, "conversionActionCategory"), externalConversionSource: stringValue(segments, "externalConversionSource"),
    productItemId: stringValue(segments, "productItemId"), productTitle: stringValue(segments, "productTitle"), productBrand: stringValue(segments, "productBrand"),
    productCategoryLevel1: stringValue(segments, "productCategoryLevel1"), productCategoryLevel2: stringValue(segments, "productCategoryLevel2"),
    productTypeL1: stringValue(segments, "productTypeL1"), productCondition: stringValue(segments, "productCondition"), productChannel: stringValue(segments, "productChannel"), productMerchantId: stringValue(segments, "productMerchantId"),
    placementName: stringValue(placement, "displayName") || stringValue(placement, "placement"),
    resourceName: stringValue(change, "changeResourceName") || stringValue(campaign, "resourceName") || stringValue(ad, "resourceName") || stringValue(asset, "resourceName") || stringValue(budget, "resourceName"),
  };
}

function metrics(row: GoogleAdsApiRow) {
  const raw = object(row.metrics);
  const impressions = numberValue(raw, "impressions") || 0;
  const clicks = numberValue(raw, "clicks") || 0;
  const costMicros = numberValue(raw, "costMicros") || 0;
  const conversions = numberValue(raw, "conversions") || 0;
  const conversionValue = numberValue(raw, "conversionsValue") || 0;
  const safe = (n: number, d: number) => d > 0 ? n / d : null;
  return {
    raw,
    derived: {
      cost: costMicros / 1_000_000, ctr: safe(clicks, impressions), avgCpc: safe(costMicros / 1_000_000, clicks),
      avgCpm: safe(costMicros / 1_000_000, impressions) === null ? null : (costMicros / 1_000_000 / impressions) * 1000,
      conversionRate: safe(conversions, clicks), cpa: safe(costMicros / 1_000_000, conversions), roas: safe(conversionValue, costMicros / 1_000_000),
    },
  };
}

export function analyticsRowKey(dataset: GoogleAdsAnalyticDataset, dims: JsonRecord) {
  const keys = [
    "date", "campaignId", "adGroupId", "criterionId", "searchTerm", "searchTermMatchType", "searchTermTargetingStatus", "matchedKeywordCriterion",
    "adId", "assetId", "assetGroupId", "assetFieldType", "device", "network", "subNetwork", "dayOfWeek", "hour",
    "landingPageUrl", "landingPageSource", "conversionAction", "countryCriterionId", "locationType", "country", "region", "city",
    "placementName", "productItemId", "keywordText", "ageRange", "gender",
  ];
  return hash({ dataset, ...Object.fromEntries(keys.map((key) => [key, dims[key] ?? null])) });
}

export type GoogleAdsAnalyticsRowInsert = {
  data_source_id: string; customer_id: string; manager_customer_id: string | null; dataset: GoogleAdsAnalyticDataset;
  observed_date: string | null; observed_at: string; row_key: string; campaign_id: string | null; ad_group_id: string | null;
  criterion_id: string | null; ad_id: string | null; asset_id: string | null; dimensions: JsonRecord; metrics: JsonRecord;
  derived_metrics: JsonRecord; raw_row: GoogleAdsApiRow;
};

export function normalizeAnalyticsRows(dataset: GoogleAdsAnalyticDataset, rows: GoogleAdsApiRow[], source: AnalyticsSource): GoogleAdsAnalyticsRowInsert[] {
  const normalized = rows.map((row) => {
    const dims = dimensions(row);
    const computed = metrics(row);
    dims.source = dataset === "pmax_search_terms_daily" ? "PERFORMANCE_MAX"
      : dataset === "search_terms_daily" ? "SEARCH" : null;
    dims.observedAt = source.observedAt;
    return {
      data_source_id: source.dataSourceId, customer_id: source.customerId, manager_customer_id: source.managerCustomerId || null, dataset,
      observed_date: typeof dims.date === "string" ? dims.date : null, observed_at: source.observedAt, row_key: analyticsRowKey(dataset, dims),
      campaign_id: typeof dims.campaignId === "string" ? dims.campaignId : null, ad_group_id: typeof dims.adGroupId === "string" ? dims.adGroupId : null,
      criterion_id: typeof dims.criterionId === "string" ? dims.criterionId : null, ad_id: typeof dims.adId === "string" ? dims.adId : null,
      asset_id: typeof dims.assetId === "string" ? dims.assetId : null, dimensions: dims, metrics: computed.raw, derived_metrics: computed.derived, raw_row: row,
    };
  });

  if (dataset !== "search_terms_daily") return normalized;

  // search_term_view can return a null-keyword aggregate alongside one or
  // more keyword-segmented rows. Keep the segmented facts (their keys include
  // the criterion) and discard only the aggregate when a match exists for the
  // same date/campaign/ad group/search-term dimensions.
  const matchedBases = new Set(normalized
    .filter((row) => row.dimensions.matchedKeywordCriterion !== null)
    .map((row) => analyticsRowKey(dataset, { ...row.dimensions, matchedKeywordCriterion: null })));
  return normalized.filter((row) => row.dimensions.matchedKeywordCriterion !== null
    || !matchedBases.has(analyticsRowKey(dataset, row.dimensions)));
}

export function normalizeConfigurationSnapshot(dataset: string, rows: GoogleAdsApiRow[], source: AnalyticsSource) {
  const snapshots = rows.map((row) => {
    const raw = object(row[dataset === "conversion_action" ? "conversionAction" : dataset === "conversion_goal" ? "customerConversionGoal" : dataset === "campaign_asset" ? "campaignAsset" : dataset === "campaign_budget" ? "campaignBudget" : dataset === "keyword_quality" ? "adGroupCriterion" : "campaign"]);
    const resourceName = stringValue(raw, "resourceName") || hash(raw);
    const campaign = object(row.campaign);
    const criterion = object(row.adGroupCriterion);
    return {
      data_source_id: source.dataSourceId, customer_id: source.customerId, config_type: dataset, resource_name: resourceName,
      observed_on: source.observedAt.slice(0, 10), observed_at: source.observedAt, campaign_id: stringValue(campaign, "id") || stringValue(criterion, "criterionId"),
      payload: row,
    };
  });
  return Array.from(new Map(snapshots.map((snapshot) => [
    `${snapshot.config_type}:${snapshot.resource_name}:${snapshot.observed_on}`,
    snapshot,
  ])).values());
}

const EMPTY_CHANGE_RESOURCE_IDS: ParsedChangeResourceIds = {
  campaignId: null, adGroupId: null, criterionId: null, adId: null, assetId: null, campaignBudgetId: null,
};

function numericId(value: string | undefined) {
  return value && /^\d+$/.test(value) ? value : null;
}

function parseResourceName(resourceName: string | null | undefined) {
  if (!resourceName) return null;
  const parts = resourceName.split("/");
  if (parts.length !== 4 || parts[0] !== "customers" || !/^\d{10}$/.test(parts[1])) return null;
  return { collection: parts[2], key: parts[3] };
}

function parseCompositeKey(key: string, expectedParts: number) {
  const values = key.split("~");
  if (values.length !== expectedParts) return null;
  const ids = values.slice(0, 2).map(numericId);
  if (ids.some((id) => !id) || (expectedParts === 3 && !values[2])) return null;
  return ids as string[];
}

/**
 * Parses IDs from change_resource_name according to the Google Ads resource
 * type. The resource name is authoritative; old/new resource payloads are not
 * required and malformed or unknown values intentionally produce null IDs.
 */
export function parseChangeResourceIds(changeResourceType: string | null | undefined, changeResourceName: string | null | undefined): ParsedChangeResourceIds {
  const resource = parseResourceName(changeResourceName);
  if (!resource) return { ...EMPTY_CHANGE_RESOURCE_IDS };

  switch (changeResourceType) {
    case "AD_GROUP":
      return resource.collection === "adGroups" && numericId(resource.key)
        ? { ...EMPTY_CHANGE_RESOURCE_IDS, adGroupId: resource.key }
        : { ...EMPTY_CHANGE_RESOURCE_IDS };
    case "AD_GROUP_CRITERION": {
      const ids = resource.collection === "adGroupCriteria" ? parseCompositeKey(resource.key, 2) : null;
      return ids ? { ...EMPTY_CHANGE_RESOURCE_IDS, adGroupId: ids[0], criterionId: ids[1] } : { ...EMPTY_CHANGE_RESOURCE_IDS };
    }
    case "AD_GROUP_AD": {
      const ids = resource.collection === "adGroupAds" ? parseCompositeKey(resource.key, 2) : null;
      return ids ? { ...EMPTY_CHANGE_RESOURCE_IDS, adGroupId: ids[0], adId: ids[1] } : { ...EMPTY_CHANGE_RESOURCE_IDS };
    }
    case "AD_GROUP_ASSET": {
      const ids = resource.collection === "adGroupAssets" ? parseCompositeKey(resource.key, 3) : null;
      return ids ? { ...EMPTY_CHANGE_RESOURCE_IDS, adGroupId: ids[0], assetId: ids[1] } : { ...EMPTY_CHANGE_RESOURCE_IDS };
    }
    case "CAMPAIGN":
      return resource.collection === "campaigns" && numericId(resource.key)
        ? { ...EMPTY_CHANGE_RESOURCE_IDS, campaignId: resource.key }
        : { ...EMPTY_CHANGE_RESOURCE_IDS };
    case "CAMPAIGN_CRITERION": {
      const ids = resource.collection === "campaignCriteria" ? parseCompositeKey(resource.key, 2) : null;
      return ids ? { ...EMPTY_CHANGE_RESOURCE_IDS, campaignId: ids[0], criterionId: ids[1] } : { ...EMPTY_CHANGE_RESOURCE_IDS };
    }
    case "CAMPAIGN_ASSET": {
      const ids = resource.collection === "campaignAssets" ? parseCompositeKey(resource.key, 3) : null;
      return ids ? { ...EMPTY_CHANGE_RESOURCE_IDS, campaignId: ids[0], assetId: ids[1] } : { ...EMPTY_CHANGE_RESOURCE_IDS };
    }
    case "CAMPAIGN_BUDGET":
      return resource.collection === "campaignBudgets" && numericId(resource.key)
        ? { ...EMPTY_CHANGE_RESOURCE_IDS, campaignBudgetId: resource.key }
        : { ...EMPTY_CHANGE_RESOURCE_IDS };
    case "ASSET":
      return resource.collection === "assets" && numericId(resource.key)
        ? { ...EMPTY_CHANGE_RESOURCE_IDS, assetId: resource.key }
        : { ...EMPTY_CHANGE_RESOURCE_IDS };
    default:
      return { ...EMPTY_CHANGE_RESOURCE_IDS };
  }
}

export function normalizeChangeEvents(rows: GoogleAdsApiRow[], source: AnalyticsSource) {
  return rows.flatMap((row) => {
    const event = object(row.changeEvent);
    const googleResourceName = stringValue(event, "resourceName");
    if (!googleResourceName) return [];
    const resourceName = stringValue(event, "changeResourceName");
    const type = stringValue(event, "changeResourceType") || null;
    const ids = parseChangeResourceIds(type, resourceName);
    return [{
      data_source_id: source.dataSourceId, customer_id: source.customerId, manager_customer_id: source.managerCustomerId || null,
      google_resource_name: googleResourceName, change_date_time: stringValue(event, "changeDateTime") || source.observedAt,
      change_resource_name: resourceName, change_resource_type: type, operation: stringValue(event, "resourceChangeOperation"),
      changed_fields: get(event, "changedFields") ?? {}, old_resource: get(event, "oldResource") ?? {}, new_resource: get(event, "newResource") ?? {},
      client_type: stringValue(event, "clientType"), user_email: stringValue(event, "userEmail"),
      campaign_id: ids.campaignId, campaign_name: null, ad_group_id: ids.adGroupId, ad_id: ids.adId,
      asset_id: ids.assetId, criterion_id: ids.criterionId, campaign_budget_id: ids.campaignBudgetId,
    }];
  });
}
