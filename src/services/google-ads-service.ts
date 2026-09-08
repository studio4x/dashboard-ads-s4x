import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { DataSourceService } from "@/services/data-source-service";
import { GoogleAdsApiError, GoogleAdsRestClient } from "@/lib/google-ads-api/client";
import { discoverGoogleAdsAccounts } from "@/lib/google-ads-api/discovery";
import { buildGoogleAdsApiPayload } from "@/lib/google-ads-api/normalizer";
import { googleAdsQueries } from "@/lib/google-ads-api/queries";
import { googleAdsAnalyticsQueries } from "@/lib/google-ads-api/queries";
import { normalizeAnalyticsRows, normalizeChangeEvents, normalizeConfigurationSnapshot, type GoogleAdsAnalyticDataset, type GoogleAdsDatasetStatus } from "@/lib/google-ads-api/analytics";
import { getGoogleAdsSettings, resolveGoogleAdsApiVersion } from "@/lib/google-ads-api/settings";
import { readGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";
import { buildIntegratedAdsPayload } from "@/lib/dashboard/integrated-payload";
import type { GoogleAdsAccessibleAccount, GoogleAdsApiRow } from "@/types/google-ads-api";

type SourceCreateInput = {
  connectionId: string;
  clientId: string;
  dashboardId: string;
  name: string;
  account: GoogleAdsAccessibleAccount;
  historyDays: number;
  lookbackDays: number;
  syncInterval: string;
};

type DatasetName = "dailyRows" | "campaignRows" | "adGroupRows" | "keywordRows" | "searchTermRows"
  | "campaignNegativeRows" | "sharedNegativeRows" | "campaignSharedSetRows" | "adRows" | "adAssetRows" | "pmaxAssetRows" | "accountBudgetRows";

type AnalyticsQueryResult = {
  rows: Record<GoogleAdsAnalyticDataset, GoogleAdsApiRow[]>;
  statuses: Record<string, GoogleAdsDatasetStatus>;
  warnings: string[];
  requestIds: string[];
  configurationRows: Record<string, GoogleAdsApiRow[]>;
  changeEventRows: GoogleAdsApiRow[];
};

type GooglePayloadLike = {
  dailyPerformance?: unknown[];
  diagnostics?: { snapshotVersion?: string };
  summary?: Record<string, unknown>;
  meta?: { dateStart?: string | null; dateEnd?: string | null };
  googlePayload?: GooglePayloadLike;
  comparisonPayloads?: { google_ads?: GooglePayloadLike };
  [key: string]: unknown;
};

function payloadRecord(value: unknown): GooglePayloadLike | null {
  return value && typeof value === "object" ? value as GooglePayloadLike : null;
}

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - Math.max(0, days));
  return isoDate(date);
}

function describeGoogleAdsError(error: unknown) {
  if (!(error instanceof GoogleAdsApiError)) return error instanceof Error ? error.message : "consulta indisponível";
  const details = [
    error.message,
    `HTTP ${error.statusCode}`,
    error.apiStatus ? `status=${error.apiStatus}` : null,
    error.errorCodes.length ? `codes=${error.errorCodes.join(",")}` : null,
    error.requestId ? `request_id=${error.requestId}` : null,
  ].filter(Boolean);
  return details.join(" | ");
}

function normalizeCustomerId(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function extractGooglePayload(payload: unknown): GooglePayloadLike | null {
  const candidate = payloadRecord(payload);
  if (!candidate) return null;
  if (candidate.googlePayload?.dailyPerformance) return candidate.googlePayload;
  if (String(candidate.diagnostics?.snapshotVersion || "").startsWith("google_ads_s4x")) return candidate;
  return null;
}

function extractGoogleSheetsComparisonPayload(payload: unknown) {
  const candidate = payloadRecord(payload);
  return candidate?.comparisonPayloads?.google_ads || extractGooglePayload(payload);
}

async function queryDatasets(client: GoogleAdsRestClient, customerId: string, loginCustomerId: string | null, start: string, end: string): Promise<AnalyticsQueryResult & { data: Record<DatasetName, GoogleAdsApiRow[]>; financialError: string | null }> {
  const required: Array<[DatasetName, string]> = [
    ["dailyRows", googleAdsAnalyticsQueries.campaignDaily(start, end)],
    ["campaignRows", googleAdsQueries.campaigns(start, end)],
    ["adGroupRows", googleAdsAnalyticsQueries.adGroupDaily(start, end)],
    ["keywordRows", googleAdsAnalyticsQueries.keywordDaily(start, end)],
    ["searchTermRows", googleAdsAnalyticsQueries.searchTermsDaily(start, end)],
  ];
  const optional: Array<[DatasetName, string]> = [
    ["accountBudgetRows", googleAdsQueries.accountBudget],
    ["campaignNegativeRows", googleAdsQueries.campaignNegatives],
    ["sharedNegativeRows", googleAdsQueries.sharedNegatives],
    ["campaignSharedSetRows", googleAdsQueries.campaignSharedSets],
    ["adRows", googleAdsAnalyticsQueries.adDaily(start, end)],
    ["adAssetRows", googleAdsAnalyticsQueries.assetDaily(start, end)],
    ["pmaxAssetRows", googleAdsAnalyticsQueries.pmaxAssets],
  ];
  const data: Record<DatasetName, GoogleAdsApiRow[]> = {
    dailyRows: [], campaignRows: [], adGroupRows: [], keywordRows: [], searchTermRows: [],
    campaignNegativeRows: [], sharedNegativeRows: [], campaignSharedSetRows: [],
    adRows: [], adAssetRows: [], pmaxAssetRows: [], accountBudgetRows: [],
  };
  const requestIds: string[] = [];
  const warnings: string[] = [];
  let financialError: string | null = null;
  const statuses: Record<string, GoogleAdsDatasetStatus> = {};
  const statusForQueryError = (error: unknown): GoogleAdsDatasetStatus => {
    const message = error instanceof Error ? error.message : String(error || "");
    return /unrecognized field|invalid field|not compatible|cannot be selected|query.*invalid|invalid.*query/i.test(message) ? "unsupported" : "error";
  };

  const requiredResults = await Promise.allSettled(required.map(async ([name, query]) => [name, await client.search(customerId, query, loginCustomerId)] as const));
  requiredResults.forEach((result, index) => {
    const [name] = required[index];
    if (result.status === "fulfilled") {
      data[name] = result.value[1].rows;
      requestIds.push(...result.value[1].requestIds);
      statuses[name] = result.value[1].rows.length ? "success" : "no_data";
    } else {
      statuses[name] = statusForQueryError(result.reason);
      warnings.push(`${name}: ${describeGoogleAdsError(result.reason)}`);
    }
  });

  const optionalResults = await Promise.allSettled(optional.map(async ([name, query]) => [name, await client.search(customerId, query, loginCustomerId)] as const));
  optionalResults.forEach((result, index) => {
    const [name] = optional[index];
    if (result.status === "fulfilled") {
      data[name] = result.value[1].rows;
      requestIds.push(...result.value[1].requestIds);
      statuses[name] = result.value[1].rows.length ? "success" : "no_data";
    } else {
      const message = describeGoogleAdsError(result.reason);
      warnings.push(`${name}: ${message}`);
      statuses[name] = statusForQueryError(result.reason);
      if (name === "accountBudgetRows") financialError = message;
    }
  });

  if (statuses.dailyRows === "error" || statuses.dailyRows === "unsupported") {
    const dailyFailure = requiredResults[required.findIndex(([name]) => name === "dailyRows")];
    if (dailyFailure?.status === "rejected" && dailyFailure.reason instanceof Error) {
      dailyFailure.reason.message = `dailyRows: ${describeGoogleAdsError(dailyFailure.reason)}`;
      throw dailyFailure.reason;
    }
    throw new Error(warnings.find((warning) => warning.startsWith("dailyRows:")) || "Dataset diário de campanha indisponível.");
  }

  const analyticsRows = {} as Record<GoogleAdsAnalyticDataset, GoogleAdsApiRow[]>;
  const configurationRows: Record<string, GoogleAdsApiRow[]> = {};
  const changeEventRows: GoogleAdsApiRow[] = [];
  const analyticsSpecs: Array<{ key: string; dataset?: GoogleAdsAnalyticDataset; query: string; applicable?: boolean }> = [
    { key: "pmaxSearchTerms", dataset: "pmax_search_terms_daily", query: googleAdsAnalyticsQueries.pmaxSearchTermsDaily(start, end) },
    { key: "pmaxAssetGroups", dataset: "pmax_asset_group", query: googleAdsAnalyticsQueries.pmaxAssetGroups },
    { key: "deviceDaily", dataset: "device_daily", query: googleAdsAnalyticsQueries.deviceDaily(start, end) },
    { key: "networkDaily", dataset: "network_daily", query: googleAdsAnalyticsQueries.networkDaily(start, end) },
    { key: "timeDaily", dataset: "time_daily", query: googleAdsAnalyticsQueries.timeDaily(start, end) },
    { key: "locationDaily", dataset: "location_daily", query: googleAdsAnalyticsQueries.locationDaily(start, end) },
    { key: "landingPageDaily", dataset: "landing_page_daily", query: googleAdsAnalyticsQueries.landingPageDaily(start, end) },
    { key: "conversionActionDaily", dataset: "conversion_action_daily", query: googleAdsAnalyticsQueries.conversionActionDaily(start, end) },
    { key: "placements", dataset: "placement_daily", query: googleAdsAnalyticsQueries.placements(start, end) },
    { key: "shopping", dataset: "shopping_daily", query: googleAdsAnalyticsQueries.shopping(start, end) },
    { key: "demographicsAge", dataset: "demographics_age_daily", query: googleAdsAnalyticsQueries.demographicsAge(start, end) },
    { key: "demographicsGender", dataset: "demographics_gender_daily", query: googleAdsAnalyticsQueries.demographicsGender(start, end) },
    { key: "conversionActions", query: googleAdsAnalyticsQueries.conversionActions },
    { key: "conversionGoals", query: googleAdsAnalyticsQueries.conversionGoals },
    { key: "budgets", query: googleAdsAnalyticsQueries.budgets },
    { key: "bidding", query: googleAdsAnalyticsQueries.bidding },
    // Google only accepts a maximum 30-day window for change_event, regardless
    // of the performance history configured for the source.
    { key: "changeEvents", query: googleAdsAnalyticsQueries.changeEvents(daysAgo(30), end) },
  ];
  const channelTypes = new Set((data.dailyRows || []).map((row) => String(row.campaign?.advertisingChannelType || "").toUpperCase()));
  const isPmax = channelTypes.has("PERFORMANCE_MAX");
  const isShopping = isPmax || channelTypes.has("SHOPPING");
  const isDisplayOrVideo = channelTypes.has("DISPLAY") || channelTypes.has("VIDEO") || channelTypes.has("VIDEO_PARTNERS");
  analyticsSpecs.forEach((spec) => {
    spec.applicable = spec.key === "pmaxSearchTerms" || spec.key === "pmaxAssetGroups" ? isPmax
      : spec.key === "shopping" ? isShopping : spec.key === "placements" ? isDisplayOrVideo || isPmax : true;
    if (!spec.applicable && spec.dataset) statuses[spec.dataset] = "not_applicable";
  });
  const analyticsResults = await Promise.all(analyticsSpecs.map(async (spec) => {
    if (!spec.applicable) return { spec, result: null as Awaited<ReturnType<GoogleAdsRestClient["search"]>> | null, error: null };
    try { return { spec, result: await client.search(customerId, spec.query, loginCustomerId), error: null }; }
    catch (error) { return { spec, result: null, error }; }
  }));
  analyticsResults.forEach(({ spec, result, error }) => {
    if (!spec.dataset && spec.key === "changeEvents") {
      if (result) { changeEventRows.push(...result.rows); requestIds.push(...result.requestIds); statuses.changeEvents = result.rows.length ? "success" : "no_data"; }
      else { statuses.changeEvents = statusForQueryError(error); warnings.push(`changeEvents: ${describeGoogleAdsError(error)}`); }
      return;
    }
    if (!spec.dataset) {
      if (result) { configurationRows[spec.key] = result.rows; requestIds.push(...result.requestIds); statuses[spec.key] = result.rows.length ? "success" : "no_data"; }
      else { statuses[spec.key] = statusForQueryError(error); warnings.push(`${spec.key}: ${describeGoogleAdsError(error)}`); }
      return;
    }
    if (result) { analyticsRows[spec.dataset] = result.rows; requestIds.push(...result.requestIds); statuses[spec.dataset] = result.rows.length ? "success" : "no_data"; }
    else { analyticsRows[spec.dataset] = []; statuses[spec.dataset] = statusForQueryError(error); warnings.push(`${spec.key}: ${describeGoogleAdsError(error)}`); }
  });
  analyticsRows.campaign_daily = data.dailyRows || [];
  analyticsRows.ad_group_daily = data.adGroupRows || [];
  analyticsRows.keyword_daily = data.keywordRows || [];
  analyticsRows.search_terms_daily = data.searchTermRows || [];
  analyticsRows.ad_daily = data.adRows || [];
  analyticsRows.asset_daily = data.adAssetRows || [];
  analyticsRows.pmax_asset_group_asset = data.pmaxAssetRows || [];
  statuses.campaign_daily = statuses.dailyRows;
  statuses.ad_group_daily = statuses.adGroupRows;
  statuses.keyword_daily = statuses.keywordRows;
  statuses.search_terms_daily = statuses.searchTermRows;
  statuses.ad_daily = statuses.adRows || "not_applicable";
  statuses.asset_daily = statuses.adAssetRows || "not_applicable";
  statuses.pmax_asset_group_asset = statuses.pmaxAssetRows || (isPmax ? "no_data" : "not_applicable");
  return { data, warnings, requestIds: Array.from(new Set(requestIds)), financialError, rows: analyticsRows, statuses, configurationRows, changeEventRows };
}

function compareMetric(apiValue: number, sheetValue: number, tolerancePercent: number) {
  const absoluteDifference = apiValue - sheetValue;
  const percentDifference = sheetValue === 0 ? (apiValue === 0 ? 0 : null) : (absoluteDifference / sheetValue) * 100;
  return {
    api: apiValue,
    googleSheets: sheetValue,
    absoluteDifference,
    percentDifference,
    tolerancePercent,
    withinTolerance: percentDifference !== null && Math.abs(percentDifference) <= tolerancePercent,
  };
}

async function persistAnalytics(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  source: { id: string; customer_id: string; manager_customer_id?: string | null },
  queried: AnalyticsQueryResult,
  dateStart: string,
  dateEnd: string,
  observedAt: string,
  apiVersion: string,
) {
  const context = { dataSourceId: source.id, customerId: source.customer_id, managerCustomerId: source.manager_customer_id, observedAt };
  const persistenceWarnings: string[] = [];
  const persistedRows: Record<string, number> = {};
  const chunks = <T>(items: T[], size = 500) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

  for (const [dataset, rows] of Object.entries(queried.rows) as Array<[GoogleAdsAnalyticDataset, GoogleAdsApiRow[]]>) {
    if (!rows?.length) { persistedRows[dataset] = 0; continue; }
    try {
      const normalized = normalizeAnalyticsRows(dataset, rows, context);
      for (const chunk of chunks(normalized)) {
        const { error } = await supabase.from("google_ads_analytics_rows").upsert(chunk, { onConflict: "data_source_id,dataset,row_key" });
        if (error) throw error;
      }
      persistedRows[dataset] = normalized.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "persistência indisponível";
      persistenceWarnings.push(`${dataset}: ${message}`);
      persistedRows[dataset] = 0;
    }
  }

  const configurations = [
    ["conversion_action", queried.configurationRows.conversionActions || []],
    ["conversion_goal", queried.configurationRows.conversionGoals || []],
    ["campaign_budget", queried.configurationRows.budgets || []],
    ["campaign_bidding", queried.configurationRows.bidding || []],
    ["keyword_quality", queried.rows.keyword_daily || []],
  ] as const;
  for (const [configType, rows] of configurations) {
    if (!rows.length) continue;
    try {
      const snapshots = normalizeConfigurationSnapshot(configType, rows, context);
      for (const chunk of chunks(snapshots)) {
        const { error } = await supabase.from("google_ads_config_history").upsert(chunk, { onConflict: "data_source_id,config_type,resource_name,observed_on" });
        if (error) throw error;
      }
    } catch (error) {
      persistenceWarnings.push(`${configType}: ${error instanceof Error ? error.message : "persistência indisponível"}`);
    }
  }

  if (queried.changeEventRows.length) {
    try {
      const events = normalizeChangeEvents(queried.changeEventRows, context);
      for (const chunk of chunks(events)) {
        const { error } = await supabase.from("google_ads_change_events").upsert(chunk, { onConflict: "data_source_id,customer_id,google_resource_name" });
        if (error) throw error;
      }
    } catch (error) {
      persistenceWarnings.push(`changeEvents: ${error instanceof Error ? error.message : "persistência indisponível"}`);
    }
  }

  try {
    const receivedRowsByDataset: Record<string, number> = {
      ...Object.fromEntries(Object.entries(queried.rows).map(([dataset, rows]) => [dataset, rows?.length || 0])),
      conversionActions: queried.configurationRows.conversionActions?.length || 0,
      conversionGoals: queried.configurationRows.conversionGoals?.length || 0,
      budgets: queried.configurationRows.budgets?.length || 0,
      bidding: queried.configurationRows.bidding?.length || 0,
      changeEvents: queried.changeEventRows.length,
    };
    const runs = Object.entries(queried.statuses).map(([dataset, status]) => ({
      data_source_id: source.id, customer_id: source.customer_id, dataset, status,
      queried_from: dateStart, queried_to: dateEnd, received_rows: receivedRowsByDataset[dataset] || 0,
      inserted_rows: persistedRows[dataset] || 0, updated_rows: 0, request_ids: queried.requestIds.slice(0, 30),
      warning: queried.warnings.find((warning) => warning.toLowerCase().startsWith(`${dataset}:`)) || null,
      error: status === "error" ? (queried.warnings.find((warning) => warning.toLowerCase().startsWith(`${dataset}:`)) || null) : null,
      capabilities: { apiVersion, source: "google_ads_api" },
    }));
    if (runs.length) {
      const { error } = await supabase.from("google_ads_analytics_runs").insert(runs);
      if (error) throw error;
    }
  } catch (error) {
    persistenceWarnings.push(`analyticsRuns: ${error instanceof Error ? error.message : "persistência indisponível"}`);
  }
  return { persistenceWarnings, persistedRows };
}

export const GoogleAdsService = {
  async listConnections() {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_google_ads_connections" });
    const { data, error } = await supabase
      .from("google_ads_connections")
      .select("id,name,google_user_id,google_user_email,granted_scopes,status,last_validated_at,last_error,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listSources() {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_google_ads_sources" });
    const { data, error } = await supabase
      .from("data_sources")
      .select("*,clients(name),dashboards:dashboards!data_sources_dashboard_id_fkey(name,dashboard_type),google_ads_sources(*,google_ads_connections(id,name,status,google_user_email))")
      .eq("type", "google_ads")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async discoverAccounts(connectionId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "discover_google_ads_accounts" });
    const { data: connection, error } = await supabase
      .from("google_ads_connections")
      .select("id,status")
      .eq("id", connectionId)
      .maybeSingle();
    if (error) throw error;
    if (!connection || connection.status !== "active") throw new Error("Conexão Google Ads inativa.");
    const settings = await getGoogleAdsSettings();
    const client = new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(connectionId));
    const result = await discoverGoogleAdsAccounts(client);
    await supabase.from("google_ads_connections").update({
      last_validated_at: new Date().toISOString(), last_error: null,
    }).eq("id", connectionId);
    return result;
  },

  async createSource(input: SourceCreateInput) {
    if (input.account.manager) throw new Error("Selecione uma conta cliente, não uma conta gerenciadora/MCC.");
    const customerId = normalizeCustomerId(input.account.customerId);
    const managerCustomerId = input.account.loginCustomerId ? normalizeCustomerId(input.account.loginCustomerId) : null;
    if (!/^\d{10}$/.test(customerId) || (managerCustomerId && !/^\d{10}$/.test(managerCustomerId))) {
      throw new Error("Customer ID ou Manager Customer ID inválido.");
    }

    const supabase = await createAdminClient({ actor: "api_admin", action: "create_google_ads_source" });
    const { data: connection, error: connectionError } = await supabase
      .from("google_ads_connections").select("id,status").eq("id", input.connectionId).eq("status", "active").maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) throw new Error("Conexão Google Ads ativa não encontrada.");

    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards").select("id,client_id,dashboard_type").eq("id", input.dashboardId).eq("client_id", input.clientId).maybeSingle();
    if (dashboardError) throw dashboardError;
    if (!dashboard) throw new Error("Dashboard não pertence ao cliente selecionado.");
    if (!String(dashboard.dashboard_type || "").includes("google")) throw new Error("Selecione um dashboard compatível com Google Ads.");

    const settings = await getGoogleAdsSettings();
    const client = new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(input.connectionId));
    const verification = await client.search(customerId, googleAdsQueries.customer, managerCustomerId);
    const verified = verification.rows[0]?.customer;
    if (!verified || Object.keys(verified).length === 0) throw new Error("A conta Google Ads não retornou dados de validação e não pode ser vinculada.");
    if (Boolean(verified.manager)) throw new Error("A conta escolhida é uma gerenciadora/MCC e não pode ser usada como conta de relatório.");

    const { data: source, error: sourceError } = await supabase.from("data_sources").insert({
      client_id: input.clientId, dashboard_id: input.dashboardId, name: input.name,
      type: "google_ads", status: "active", sync_interval: input.syncInterval,
    }).select().single();
    if (sourceError) throw sourceError;

    try {
      const { error: configError } = await supabase.from("google_ads_sources").insert({
        data_source_id: source.id, connection_id: input.connectionId, customer_id: customerId,
        customer_name: String(verified.descriptiveName || input.account.descriptiveName), customer_is_manager: false,
        customer_is_test: typeof verified.testAccount === "boolean" ? verified.testAccount : input.account.testAccount,
        manager_customer_id: managerCustomerId, manager_customer_name: input.account.loginCustomerName || null,
        currency_code: String(verified.currencyCode || input.account.currencyCode || "") || null,
        timezone: String(verified.timeZone || input.account.timeZone || "") || null,
        history_days: input.historyDays, lookback_days: input.lookbackDays,
      });
      if (configError) throw configError;
      return source;
    } catch (error) {
      await supabase.from("data_sources").delete().eq("id", source.id);
      throw error;
    }
  },

  async deleteSource(sourceId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "delete_google_ads_source" });
    const { error } = await supabase.from("data_sources").delete().eq("id", sourceId).eq("type", "google_ads");
    if (error) throw error;
  },

  async getActiveSources() {
    const supabase = await createAdminClient({ actor: "cron", action: "list_active_google_ads_sources" });
    const { data, error } = await supabase
      .from("data_sources").select("id,sync_interval,google_ads_sources(last_import_at)")
      .eq("type", "google_ads").eq("status", "active");
    if (error) throw error;
    return data || [];
  },

  async syncSource(sourceId: string) {
    const startedAt = new Date().toISOString();
    const logId = randomUUID();
    const supabase = await createAdminClient({ actor: "system", action: "sync_google_ads_source" });
    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("id,client_id,dashboard_id,name,status,sync_interval,dashboards:dashboards!data_sources_dashboard_id_fkey(id,dashboard_type,metrics_source_id,google_metrics_source_id,meta_metrics_source_id),google_ads_sources(*,google_ads_connections(id,status))")
      .eq("id", sourceId).eq("type", "google_ads").maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.status !== "active") throw new Error("Fonte Google Ads ativa não encontrada.");
    const config = relation(source.google_ads_sources);
    const dashboard = relation(source.dashboards);
    const connection = relation(config?.google_ads_connections);
    if (!config || !dashboard || !connection || connection.status !== "active") throw new Error("Conexão Google Ads inválida ou expirada.");

    try {
      const settings = await getGoogleAdsSettings();
      const apiVersion = resolveGoogleAdsApiVersion(settings);
      const historyDays = Number(config.history_days || settings.default_history_days);
      const dateStart = daysAgo(historyDays - 1);
      const dateEnd = isoDate(new Date());
      const client = new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(connection.id));
      const queried = await queryDatasets(client, config.customer_id, config.manager_customer_id, dateStart, dateEnd);
      const payload = buildGoogleAdsApiPayload({
        customerId: config.customer_id, customerName: config.customer_name,
        managerCustomerId: config.manager_customer_id, timezone: config.timezone, apiVersion, dateStart, dateEnd,
        currency: config.currency_code,
        ...queried.data, warnings: queried.warnings,
        analyticsDiagnostics: {
          datasets: queried.statuses,
          rows: Object.fromEntries(Object.entries(queried.rows).map(([dataset, rows]) => [dataset, rows.length])),
          period: { from: dateStart, to: dateEnd }, warnings: queried.warnings,
        },
        financialError: queried.financialError,
      });
      const persistedAnalytics = await persistAnalytics(
        supabase,
        { id: source.id, customer_id: config.customer_id, manager_customer_id: config.manager_customer_id },
        queried,
        dateStart,
        dateEnd,
        new Date().toISOString(),
        apiVersion,
      );
      if (persistedAnalytics.persistenceWarnings.length) {
        payload.diagnostics.warnings.push(...persistedAnalytics.persistenceWarnings.map((warning) => `analytics persistence: ${warning}`));
        if (payload.diagnostics.googleAdsAnalytics) payload.diagnostics.googleAdsAnalytics.warnings.push(...persistedAnalytics.persistenceWarnings);
      }
      const preferredIds = await DataSourceService.getPreferredSnapshotSourceIds(
        source.dashboard_id,
        dashboard.dashboard_type,
        dashboard.metrics_source_id,
        {
          googleAdsSourceId: dashboard.google_metrics_source_id,
          metaAdsSourceId: dashboard.meta_metrics_source_id,
        },
      );
      const previousSnapshot = await DashboardService.getLatestSnapshot(source.dashboard_id, {
        bypassRls: true, dataSourceIds: preferredIds.length ? preferredIds : undefined,
      });
      const snapshotPayload = dashboard.dashboard_type === "google_meta_ads_s4x"
        ? buildIntegratedAdsPayload({
          sourceRole: "google_ads", importedPayload: payload, previousPayload: previousSnapshot?.payload_json,
          sourceLabel: "Google Ads API + fonte Meta prioritária", sourceReference: config.customer_id,
        })
        : payload;
      const finishedAt = new Date().toISOString();
      await DashboardService.saveSnapshot({
        client_id: source.client_id, dashboard_id: source.dashboard_id, data_source_id: source.id,
        period_start: dateStart, period_end: dateEnd, source_type: "google_ads", payload_json: snapshotPayload, imported_at: finishedAt,
      });
      await supabase.from("google_ads_sources").update({ last_import_at: finishedAt, last_import_status: "success", last_error: null }).eq("data_source_id", source.id);
      if (dashboard.dashboard_type !== "google_meta_ads_s4x") {
        await supabase.from("dashboards").update({ metrics_source_id: source.id }).eq("id", source.dashboard_id);
      } else if (!dashboard.google_metrics_source_id) {
        await supabase.from("dashboards")
          .update({ google_metrics_source_id: source.id })
          .eq("id", source.dashboard_id)
          .is("google_metrics_source_id", null);
      }
      const rowCounts = payload.diagnostics.rowCounts;
      const rowsRead = Object.values(rowCounts).reduce((sum, count) => sum + Number(count || 0), 0);
      await DataSourceService.saveImportLog({
        id: logId, client_id: source.client_id, dashboard_id: source.dashboard_id, data_source_id: source.id,
        source_type: "google_ads", status: queried.warnings.length ? "success_with_warnings" : "success",
        started_at: startedAt, finished_at: finishedAt,
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        tabs_read: Object.keys(rowCounts), rows_read: rowsRead, warnings: queried.warnings.length, errors: 0,
        metadata: { date_start: dateStart, date_end: dateEnd, api_version: apiVersion, customer_id: config.customer_id, request_ids: queried.requestIds.slice(0, 30) },
      });
      return {
        success: true, customerId: config.customer_id, dateStart, dateEnd, rowCounts,
        warnings: queried.warnings, durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
      };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar Google Ads.";
      await supabase.from("google_ads_sources").update({
        last_import_at: finishedAt, last_import_status: "failed", last_error: message.slice(0, 1000),
      }).eq("data_source_id", source.id);
      const authFailure = (error instanceof GoogleAdsApiError && error.authRelated) || /invalid_grant|refresh token/i.test(message);
      if (authFailure) {
        await supabase.from("google_ads_connections").update({ status: "expired", last_error: message.slice(0, 1000) }).eq("id", connection.id);
      }
      await DataSourceService.saveImportLog({
        id: logId, client_id: source.client_id, dashboard_id: source.dashboard_id, data_source_id: source.id,
        source_type: "google_ads", status: "failed", started_at: startedAt, finished_at: finishedAt,
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(), tabs_read: [], rows_read: 0,
        warnings: 0, errors: 1, error_details: message.slice(0, 1000),
        metadata: error instanceof GoogleAdsApiError ? { request_id: error.requestId, error_code: error.errorCode } : {},
      }).catch(() => undefined);
      throw error;
    }
  },

  async compareWithGoogleSheets(sourceId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "compare_google_ads_sources" });
    const { data: source, error } = await supabase.from("data_sources")
      .select("id,dashboard_id,name").eq("id", sourceId).eq("type", "google_ads").maybeSingle();
    if (error) throw error;
    if (!source) throw new Error("Fonte Google Ads não encontrada.");
    const { data: sheetSources, error: sheetError } = await supabase.from("data_sources")
      .select("id,name,status,google_sheet_sources(source_role,last_import_status)")
      .eq("dashboard_id", source.dashboard_id).eq("type", "google_sheets").eq("status", "active");
    if (sheetError) throw sheetError;
    const sheetSource = (sheetSources || []).find((item) => {
      const sheet = relation(item.google_sheet_sources);
      return !sheet?.source_role || sheet.source_role === "google_ads";
    });
    if (!sheetSource) throw new Error("Nenhuma fonte Google Sheets de Google Ads ativa foi encontrada neste dashboard.");
    const [apiSnapshot, sheetSnapshot] = await Promise.all([
      DashboardService.getLatestSnapshot(source.dashboard_id, { bypassRls: true, dataSourceId: source.id }),
      DashboardService.getLatestSnapshot(source.dashboard_id, { bypassRls: true, dataSourceId: sheetSource.id }),
    ]);
    const apiPayload = extractGooglePayload(apiSnapshot?.payload_json);
    const sheetPayload = extractGoogleSheetsComparisonPayload(sheetSnapshot?.payload_json);
    if (!apiPayload || !sheetPayload) throw new Error("Sincronize as duas fontes antes de comparar.");
    const metricTolerance: Record<string, number> = { impressions: 0.5, clicks: 0.5, cost: 0.5, conversions: 2, conversionValue: 2, ctr: 0.5, avgCpc: 0.5, cpa: 2, roas: 2 };
    const metrics = Object.fromEntries(Object.entries(metricTolerance).map(([key, tolerance]) => [
      key, compareMetric(Number(apiPayload.summary?.[key] || 0), Number(sheetPayload.summary?.[key] || 0), tolerance),
    ]));
    const collections = Object.fromEntries(["campaigns", "adGroups", "keywords", "searchTerms", "negativeKeywords"].map((key) => [
      key, { api: Array.isArray(apiPayload[key]) ? apiPayload[key].length : 0, googleSheets: Array.isArray(sheetPayload[key]) ? sheetPayload[key].length : 0 },
    ]));
    return {
      apiSource: source.name, googleSheetsSource: sheetSource.name,
      apiImportedAt: apiSnapshot.imported_at, googleSheetsImportedAt: sheetSnapshot.imported_at,
      period: { api: [apiPayload.meta?.dateStart, apiPayload.meta?.dateEnd], googleSheets: [sheetPayload.meta?.dateStart, sheetPayload.meta?.dateEnd] },
      metrics, collections,
      note: "Diferenças recentes podem refletir atribuição, timezone e atualização da API. Compare o mesmo período antes de desativar a planilha.",
    };
  },

  async queryAnalytics(sourceId: string, filters: {
    dataset?: string | null; from?: string | null; to?: string | null; campaignId?: string | null;
    adGroupId?: string | null; device?: string | null; network?: string | null; limit?: number;
  }) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "query_google_ads_analytics" });
    const { data: source, error: sourceError } = await supabase.from("data_sources")
      .select("id,name,dashboard_id,type,google_ads_sources(customer_id,manager_customer_id)")
      .eq("id", sourceId).eq("type", "google_ads").maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) throw new Error("Fonte Google Ads não encontrada.");
    const limit = Math.min(Math.max(Number(filters.limit) || 1000, 1), 10000);
    if (filters.dataset === "change_events") {
      let query = supabase.from("google_ads_change_events").select("*").eq("data_source_id", sourceId).order("change_date_time", { ascending: false }).limit(limit);
      if (filters.from) query = query.gte("change_date_time", `${filters.from}T00:00:00.000Z`);
      if (filters.to) query = query.lte("change_date_time", `${filters.to}T23:59:59.999Z`);
      const { data, error } = await query;
      if (error) throw error;
      return { source, dataset: "change_events", rows: data || [] };
    }
    let query = supabase.from("google_ads_analytics_rows").select("*").eq("data_source_id", sourceId).order("observed_date", { ascending: true }).limit(limit);
    if (filters.dataset) query = query.eq("dataset", filters.dataset);
    if (filters.from) query = query.gte("observed_date", filters.from);
    if (filters.to) query = query.lte("observed_date", filters.to);
    if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
    if (filters.adGroupId) query = query.eq("ad_group_id", filters.adGroupId);
    if (filters.device) query = query.eq("dimensions->>device", filters.device);
    if (filters.network) query = query.eq("dimensions->>network", filters.network);
    const [{ data, error }, { data: runs, error: runsError }] = await Promise.all([
      query,
      supabase.from("google_ads_analytics_runs").select("*").eq("data_source_id", sourceId).order("created_at", { ascending: false }).limit(500),
    ]);
    if (error) throw error;
    if (runsError) throw runsError;
    return { source, dataset: filters.dataset || null, rows: data || [], runs: runs || [] };
  },
};
