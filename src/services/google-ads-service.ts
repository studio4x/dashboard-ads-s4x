import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { DataSourceService } from "@/services/data-source-service";
import { GoogleAdsApiError, GoogleAdsRestClient } from "@/lib/google-ads-api/client";
import { discoverGoogleAdsAccounts } from "@/lib/google-ads-api/discovery";
import { buildGoogleAdsApiPayload } from "@/lib/google-ads-api/normalizer";
import { googleAdsQueries } from "@/lib/google-ads-api/queries";
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

async function queryDatasets(client: GoogleAdsRestClient, customerId: string, loginCustomerId: string | null, start: string, end: string) {
  const required: Array<[DatasetName, string]> = [
    ["dailyRows", googleAdsQueries.dailyPerformance(start, end)],
    ["campaignRows", googleAdsQueries.campaigns(start, end)],
    ["adGroupRows", googleAdsQueries.adGroups(start, end)],
    ["keywordRows", googleAdsQueries.keywords(start, end)],
    ["searchTermRows", googleAdsQueries.searchTerms(start, end)],
  ];
  const optional: Array<[DatasetName, string]> = [
    ["accountBudgetRows", googleAdsQueries.accountBudget],
    ["campaignNegativeRows", googleAdsQueries.campaignNegatives],
    ["sharedNegativeRows", googleAdsQueries.sharedNegatives],
    ["campaignSharedSetRows", googleAdsQueries.campaignSharedSets],
    ["adRows", googleAdsQueries.ads(start, end)],
    ["adAssetRows", googleAdsQueries.adAssets(start, end)],
    ["pmaxAssetRows", googleAdsQueries.pmaxAssets],
  ];
  const data: Record<DatasetName, GoogleAdsApiRow[]> = {
    dailyRows: [], campaignRows: [], adGroupRows: [], keywordRows: [], searchTermRows: [],
    campaignNegativeRows: [], sharedNegativeRows: [], campaignSharedSetRows: [],
    adRows: [], adAssetRows: [], pmaxAssetRows: [], accountBudgetRows: [],
  };
  const requestIds: string[] = [];
  const warnings: string[] = [];
  let financialError: string | null = null;

  const requiredResults = await Promise.all(required.map(async ([name, query]) => [name, await client.search(customerId, query, loginCustomerId)] as const));
  requiredResults.forEach(([name, result]) => {
    data[name] = result.rows;
    requestIds.push(...result.requestIds);
  });

  const optionalResults = await Promise.allSettled(optional.map(async ([name, query]) => [name, await client.search(customerId, query, loginCustomerId)] as const));
  optionalResults.forEach((result, index) => {
    const [name] = optional[index];
    if (result.status === "fulfilled") {
      data[name] = result.value[1].rows;
      requestIds.push(...result.value[1].requestIds);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : "consulta indisponível";
      warnings.push(`${name}: ${message}`);
      if (name === "accountBudgetRows") financialError = message;
    }
  });

  return { data, warnings, requestIds: Array.from(new Set(requestIds)), financialError };
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
        financialError: queried.financialError,
      });
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
};
