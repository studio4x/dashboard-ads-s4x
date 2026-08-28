/* eslint-disable @typescript-eslint/no-explicit-any */

export type DashboardMetricPlatform = "google_ads" | "meta_ads";

export type DashboardMetricFilters = {
  campaignNames: string[];
  campaignStatuses: string[];
  platforms: DashboardMetricPlatform[];
};

export type DashboardMetricFilterOptions = {
  campaignNames: string[];
  campaignStatuses: string[];
  platforms: DashboardMetricPlatform[];
};

const EMPTY_FILTERS: DashboardMetricFilters = {
  campaignNames: [],
  campaignStatuses: [],
  platforms: [],
};

const FILTERED_COLLECTIONS = [
  "dailyPerformance", "overview", "campaigns", "adGroups", "keywords",
  "searchTerms", "negativeKeywords", "adsAndAssets",
] as const;

function uniqueStrings(value: unknown, upperCase = false) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => upperCase ? item.toUpperCase() : item)));
}

export function normalizeDashboardMetricFilters(value: unknown): DashboardMetricFilters {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    campaignNames: uniqueStrings(source.campaignNames).slice(0, 500),
    campaignStatuses: uniqueStrings(source.campaignStatuses, true).slice(0, 50),
    platforms: uniqueStrings(source.platforms)
      .filter((item): item is DashboardMetricPlatform => item === "google_ads" || item === "meta_ads"),
  };
}

export function hasDashboardMetricFilters(filters: DashboardMetricFilters) {
  return filters.campaignNames.length > 0 || filters.campaignStatuses.length > 0 || filters.platforms.length > 0;
}

function campaignName(row: any) {
  return String(row?.campaignName || row?.campaign_name || row?.campaign || "").trim();
}

function campaignId(row: any) {
  return String(row?.campaignId || row?.campaign_id || "").trim();
}

function campaignStatus(row: any, allowGenericStatus = false) {
  const value = row?.campaignEffectiveStatus || row?.campaign_effective_status
    || row?.effectiveStatus || row?.effective_status
    || row?.campaignStatus || row?.campaign_status
    || (allowGenericStatus ? row?.status : null);
  return String(value || "").trim().toUpperCase();
}

function rowPlatform(row: any, fallback?: DashboardMetricPlatform) {
  const value = String(row?.platform || "").trim().toLowerCase();
  if (value === "google_ads" || value === "meta_ads") return value as DashboardMetricPlatform;
  return fallback;
}

function payloadPlatform(payload: any): DashboardMetricPlatform | undefined {
  const version = String(payload?.diagnostics?.snapshotVersion || "").toLowerCase();
  const template = String(payload?.config?.templateId || "").toLowerCase();
  if (version.startsWith("meta_ads") || template.startsWith("meta_ads")) return "meta_ads";
  if (version.startsWith("google_ads") || template.startsWith("google_ads")) return "google_ads";
  return undefined;
}

function isIntegratedPayload(payload: any) {
  const version = String(payload?.diagnostics?.snapshotVersion || "").toLowerCase();
  const template = String(payload?.config?.templateId || "").toLowerCase();
  return version.startsWith("google_meta_ads") || template.startsWith("google_meta_ads");
}

type CampaignMeta = { status: string; platform?: DashboardMetricPlatform };

function collectCampaignMetadata(payload: any) {
  const byId = new Map<string, CampaignMeta>();
  const byName = new Map<string, CampaignMeta>();
  const addRows = (rows: unknown, fallback?: DashboardMetricPlatform, allowGenericStatus = false) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      const name = campaignName(row);
      const id = campaignId(row);
      const status = campaignStatus(row, allowGenericStatus);
      const platform = rowPlatform(row, fallback);
      const meta = { status, platform };
      if (id && (status || platform)) byId.set(`${platform || ""}:${id}`, meta);
      if (name && (status || platform)) byName.set(`${platform || ""}:${name.toLocaleLowerCase("pt-BR")}`, meta);
    });
  };

  const basePlatform = payloadPlatform(payload);
  addRows(payload?.campaigns, basePlatform, true);
  addRows(payload?.dailyPerformance, basePlatform);
  addRows(payload?.google_ads, "google_ads");
  addRows(payload?.meta_ads, "meta_ads");
  addRows(payload?.googlePayload?.campaigns, "google_ads", true);
  addRows(payload?.googlePayload?.dailyPerformance, "google_ads");
  addRows(payload?.metaPayload?.dailyPerformance, "meta_ads");
  return { byId, byName };
}

function resolveMeta(row: any, metadata: ReturnType<typeof collectCampaignMetadata>, fallback?: DashboardMetricPlatform, allowGenericStatus = false) {
  const platform = rowPlatform(row, fallback);
  const id = campaignId(row);
  const name = campaignName(row).toLocaleLowerCase("pt-BR");
  const known = metadata.byId.get(`${platform || ""}:${id}`)
    || metadata.byName.get(`${platform || ""}:${name}`)
    || metadata.byId.get(`:${id}`)
    || metadata.byName.get(`:${name}`);
  return {
    name: campaignName(row),
    status: campaignStatus(row, allowGenericStatus) || known?.status || "",
    platform: platform || known?.platform,
  };
}

function matchesFilters(
  row: any,
  filters: DashboardMetricFilters,
  metadata: ReturnType<typeof collectCampaignMetadata>,
  fallback?: DashboardMetricPlatform,
  allowGenericStatus = false,
) {
  const resolved = resolveMeta(row, metadata, fallback, allowGenericStatus);
  if (filters.campaignNames.length > 0) {
    const selected = new Set(filters.campaignNames.map((item) => item.toLocaleLowerCase("pt-BR")));
    if (!resolved.name || !selected.has(resolved.name.toLocaleLowerCase("pt-BR"))) return false;
  }
  if (filters.campaignStatuses.length > 0 && (!resolved.status || !filters.campaignStatuses.includes(resolved.status))) return false;
  if (filters.platforms.length > 0 && (!resolved.platform || !filters.platforms.includes(resolved.platform))) return false;
  return true;
}

function filterPayloadCollections(payload: any, filters: DashboardMetricFilters, forcedPlatform?: DashboardMetricPlatform) {
  if (!payload || typeof payload !== "object") return payload;
  const output = { ...payload };
  const metadata = collectCampaignMetadata(payload);
  const defaultPlatform = forcedPlatform || payloadPlatform(payload);

  FILTERED_COLLECTIONS.forEach((key) => {
    if (!Array.isArray(payload[key])) return;
    const collectionPlatform = isIntegratedPayload(payload) && key !== "dailyPerformance" && key !== "overview"
      ? "google_ads"
      : defaultPlatform;
    output[key] = payload[key].filter((row: any) => matchesFilters(row, filters, metadata, collectionPlatform, key === "campaigns"));
  });
  if (Array.isArray(payload.google_ads)) {
    output.google_ads = payload.google_ads.filter((row: any) => matchesFilters(row, filters, metadata, "google_ads"));
  }
  if (Array.isArray(payload.meta_ads)) {
    output.meta_ads = payload.meta_ads.filter((row: any) => matchesFilters(row, filters, metadata, "meta_ads"));
  }
  if (payload.googlePayload) output.googlePayload = filterPayloadCollections(payload.googlePayload, filters, "google_ads");
  if (payload.metaPayload) output.metaPayload = filterPayloadCollections(payload.metaPayload, filters, "meta_ads");
  return output;
}

export function applyDashboardMetricFilters(payload: any, value: unknown) {
  const filters = normalizeDashboardMetricFilters(value);
  if (!hasDashboardMetricFilters(filters)) return payload;
  return filterPayloadCollections(payload, filters);
}

export function extractDashboardMetricFilterOptions(payload: any): DashboardMetricFilterOptions {
  if (!payload || typeof payload !== "object") return { ...EMPTY_FILTERS };
  const metadata = collectCampaignMetadata(payload);
  const names = new Set<string>();
  const statuses = new Set<string>();
  const platforms = new Set<DashboardMetricPlatform>();
  const addRows = (rows: unknown, fallback?: DashboardMetricPlatform, allowGenericStatus = false) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      const resolved = resolveMeta(row, metadata, fallback, allowGenericStatus);
      if (resolved.name) names.add(resolved.name);
      if (resolved.status) statuses.add(resolved.status);
      if (resolved.platform) platforms.add(resolved.platform);
    });
  };
  const basePlatform = payloadPlatform(payload);
  const detailPlatform = isIntegratedPayload(payload) ? "google_ads" : basePlatform;
  addRows(payload.dailyPerformance, basePlatform);
  addRows(payload.campaigns, detailPlatform, true);
  addRows(payload.google_ads, "google_ads");
  addRows(payload.meta_ads, "meta_ads");
  addRows(payload.googlePayload?.dailyPerformance, "google_ads");
  addRows(payload.googlePayload?.campaigns, "google_ads", true);
  addRows(payload.metaPayload?.dailyPerformance, "meta_ads");
  return {
    campaignNames: Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR")),
    campaignStatuses: Array.from(statuses).sort((a, b) => a.localeCompare(b, "pt-BR")),
    platforms: Array.from(platforms).sort(),
  };
}
