/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { DataSourceService } from "@/services/data-source-service";
import { MetaGraphClient, MetaGraphError } from "@/lib/meta-marketing/graph-client";
import { getMetaMarketingSettings, requireMetaAppSecret, resolveMetaApiVersion } from "@/lib/meta-marketing/settings";
import { readMetaAccessToken } from "@/lib/meta-marketing/token-vault";
import { buildMetaAdsApiPayload, mergeMetaDailyRows, normalizeMetaInsightRow } from "@/lib/meta-marketing/normalizer";
import { buildFinancialErrorStatus, buildMetaAdsFinancialStatus, calculateAverageDailySpend } from "@/lib/ads-financial";
import { buildIntegratedAdsPayload } from "@/lib/dashboard/integrated-payload";
import type { MetaAdAccountAsset, MetaCampaignAsset, MetaInsightRow } from "@/types/meta-marketing";
import { buildMetaInsightDateChunks } from "@/lib/meta-marketing/insight-chunks";

const INSIGHT_FIELDS = [
  "date_start", "date_stop", "account_id", "account_name", "campaign_id", "campaign_name",
  "adset_id", "adset_name", "ad_id", "ad_name", "reach", "impressions", "frequency",
  "spend", "cpm", "clicks", "inline_link_clicks", "cpc", "ctr", "inline_post_engagement",
  "actions", "cost_per_action_type", "action_values",
].join(",");

type SourceCreateInput = {
  connectionId: string;
  clientId: string;
  dashboardId: string;
  name: string;
  businessId?: string | null;
  businessName?: string | null;
  accounts: MetaAdAccountAsset[];
  historyDays: number;
  lookbackDays: number;
  syncInterval: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - Math.max(0, days));
  return isoDate(date);
}

function extractPreviousMetaPayload(payload: any) {
  if (!payload) return null;
  if (payload?.metaPayload?.dailyPerformance) return payload.metaPayload;
  if (String(payload?.diagnostics?.snapshotVersion || "").startsWith("meta_ads_s4x")) return payload;
  return null;
}

async function fetchInsights(
  client: MetaGraphClient,
  accountId: string,
  dateStart: string,
  dateEnd: string,
  attributionWindows: string[],
) {
  const allRows: MetaInsightRow[] = [];
  const chunks = buildMetaInsightDateChunks(dateStart, dateEnd, 30);
  for (const chunk of chunks) {
    const rows = await client.getAll<MetaInsightRow>(`act_${accountId}/insights`, {
      fields: INSIGHT_FIELDS,
      level: "ad",
      time_increment: 1,
      time_range: JSON.stringify({ since: chunk.dateStart, until: chunk.dateEnd }),
      action_attribution_windows: JSON.stringify(attributionWindows),
      limit: 500,
    }, 250);
    allRows.push(...rows);
  }
  return allRows;
}

async function fetchCampaigns(client: MetaGraphClient, accountId: string) {
  return client.getAll<MetaCampaignAsset>(`act_${accountId}/campaigns`, {
    fields: "id,name,status,effective_status",
    limit: 500,
  }, 100);
}

async function fetchAccountFinancialStatus(
  client: MetaGraphClient,
  accountId: string,
  accountName: string,
  averageDailySpend: number | null,
) {
  let account: Record<string, unknown>;
  try {
    account = await client.get<Record<string, unknown>>(`act_${accountId}`, {
      fields: "id,account_id,name,currency,amount_spent,spend_cap,balance,funding_source_details,is_prepay_account",
    });
  } catch (primaryError) {
    // Alguns modelos/permissões da Graph API podem rejeitar campos de billing opcionais.
    // Mantemos os campos monetários centrais para não invalidar a sincronização de performance.
    try {
      account = await client.get<Record<string, unknown>>(`act_${accountId}`, {
        fields: "id,account_id,name,currency,amount_spent,spend_cap,balance",
      });
    } catch {
      throw primaryError;
    }
  }
  return buildMetaAdsFinancialStatus({ account, averageDailySpend, accountId, accountName });
}

function enrichRowsWithCampaignStatuses(rows: any[], campaigns: MetaCampaignAsset[]) {
  const byId = new Map(campaigns.map((campaign) => [String(campaign.id), campaign]));
  return rows.map((row) => {
    const campaign = byId.get(String(row?.campaignId || ""));
    if (!campaign) return row;
    return {
      ...row,
      campaignStatus: campaign.status || row.campaignStatus || null,
      campaignEffectiveStatus: campaign.effective_status || campaign.status || row.campaignEffectiveStatus || null,
    };
  });
}

export const MetaMarketingService = {
  async listConnections() {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_meta_connections" });
    const { data, error } = await supabase
      .from("meta_business_connections")
      .select("id,name,meta_user_id,meta_user_name,token_expires_at,granted_scopes,status,last_validated_at,last_error,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listSources() {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_meta_sources" });
    const { data, error } = await supabase
      .from("data_sources")
      .select("*,clients(name),dashboards:dashboards!data_sources_dashboard_id_fkey(name,dashboard_type),meta_ad_sources(*,meta_business_connections(id,name,status,meta_user_name),meta_ad_source_accounts(*))")
      .eq("type", "meta_ads")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createSource(input: SourceCreateInput) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "create_meta_source" });
    const { data: connection, error: connectionError } = await supabase
      .from("meta_business_connections")
      .select("id,status")
      .eq("id", input.connectionId)
      .eq("status", "active")
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) throw new Error("Conexão Meta ativa não encontrada.");

    const settings = await getMetaMarketingSettings();
    const accessToken = await readMetaAccessToken(input.connectionId);
    const graph = new MetaGraphClient(accessToken, resolveMetaApiVersion(settings), requireMetaAppSecret());
    const verifiedAccounts = await Promise.all(input.accounts.map(async (account) => {
      const verified = await graph.get<{
        account_id?: string; name?: string; account_status?: number; currency?: string; timezone_name?: string;
        business?: { id?: string; name?: string };
      }>(`act_${account.account_id}`, { fields: "account_id,name,account_status,currency,timezone_name,business" });
      const verifiedId = String(verified.account_id || "").replace(/^act_/, "");
      if (verifiedId !== account.account_id) throw new Error("A Meta não confirmou uma das contas selecionadas.");
      const business = verified.business;
      return {
        ...account,
        name: verified.name || account.name,
        account_status: verified.account_status ?? account.account_status,
        currency: verified.currency || account.currency,
        timezone_name: verified.timezone_name || account.timezone_name,
        business_id: business?.id || account.business_id,
        business_name: business?.name || account.business_name,
      };
    }));

    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("id,client_id,dashboard_type")
      .eq("id", input.dashboardId)
      .eq("client_id", input.clientId)
      .maybeSingle();
    if (dashboardError) throw dashboardError;
    if (!dashboard) throw new Error("Dashboard não pertence ao cliente selecionado.");
    if (!String(dashboard.dashboard_type || "").includes("meta")) {
      throw new Error("Selecione um dashboard compatível com Meta Ads.");
    }
    if (input.accounts.length < 1) throw new Error("Selecione ao menos uma conta de anúncios.");

    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .insert({
        client_id: input.clientId,
        dashboard_id: input.dashboardId,
        name: input.name,
        type: "meta_ads",
        status: "active",
        sync_interval: input.syncInterval,
      })
      .select()
      .single();
    if (sourceError) throw sourceError;

    try {
      const { error: configError } = await supabase.from("meta_ad_sources").insert({
        data_source_id: source.id,
        connection_id: input.connectionId,
        business_id: input.businessId || null,
        business_name: input.businessName || null,
        history_days: input.historyDays,
        lookback_days: input.lookbackDays,
      });
      if (configError) throw configError;

      const accountRows = verifiedAccounts.map((account) => ({
        data_source_id: source.id,
        ad_account_id: account.account_id,
        ad_account_name: account.name,
        account_status: account.account_status ?? null,
        currency: account.currency || null,
        timezone_name: account.timezone_name || null,
        business_id: account.business_id || input.businessId || null,
        business_name: account.business_name || input.businessName || null,
        access_origin: account.access_origin,
      }));
      const { error: accountsError } = await supabase.from("meta_ad_source_accounts").insert(accountRows);
      if (accountsError) throw accountsError;
      return source;
    } catch (error) {
      await supabase.from("data_sources").delete().eq("id", source.id);
      throw error;
    }
  },

  async deleteSource(sourceId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "delete_meta_source" });
    const { error } = await supabase.from("data_sources").delete().eq("id", sourceId).eq("type", "meta_ads");
    if (error) throw error;
  },

  async getActiveSources() {
    const supabase = await createAdminClient({ actor: "cron", action: "list_active_meta_sources" });
    const { data, error } = await supabase
      .from("data_sources")
      .select("id,sync_interval,meta_ad_sources(last_import_at)")
      .eq("type", "meta_ads")
      .eq("status", "active");
    if (error) throw error;
    return data || [];
  },

  async syncSource(sourceId: string) {
    const startedAt = new Date().toISOString();
    const logId = randomUUID();
    const supabase = await createAdminClient({ actor: "system", action: "sync_meta_source" });
    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("id,client_id,dashboard_id,name,status,sync_interval,dashboards:dashboards!data_sources_dashboard_id_fkey(id,dashboard_type,meta_objectives,meta_primary_objective,metrics_source_id,google_metrics_source_id,meta_metrics_source_id),meta_ad_sources(*,meta_ad_source_accounts(*),meta_business_connections(id,status))")
      .eq("id", sourceId)
      .eq("type", "meta_ads")
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.status !== "active") throw new Error("Fonte Meta ativa não encontrada.");

    const config = Array.isArray(source.meta_ad_sources) ? source.meta_ad_sources[0] : source.meta_ad_sources;
    const dashboard = Array.isArray(source.dashboards) ? source.dashboards[0] : source.dashboards;
    const connection = Array.isArray(config?.meta_business_connections) ? config.meta_business_connections[0] : config?.meta_business_connections;
    const accounts = Array.isArray(config?.meta_ad_source_accounts) ? config.meta_ad_source_accounts : [];
    if (!config || !connection || connection.status !== "active") throw new Error("Conexão Meta inválida ou expirada.");
    if (!dashboard || accounts.length < 1) throw new Error("A fonte Meta não possui dashboard ou contas configuradas.");

    try {
      const settings = await getMetaMarketingSettings();
      const apiVersion = resolveMetaApiVersion(settings);
      const token = await readMetaAccessToken(connection.id);
      const client = new MetaGraphClient(token, apiVersion, requireMetaAppSecret());
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
        bypassRls: true,
        dataSourceIds: preferredIds.length ? preferredIds : undefined,
      });
      const previousMetaPayload = extractPreviousMetaPayload(previousSnapshot?.payload_json);
      const historyDays = Number(config.history_days || settings.default_history_days);
      const lookbackDays = Number(config.lookback_days || settings.default_lookback_days);
      const replaceFrom = daysAgo(previousMetaPayload?.dailyPerformance?.length ? lookbackDays - 1 : historyDays - 1);
      const dateEnd = isoDate(new Date());
      const campaignStatusWarnings: string[] = [];

      console.info("[META_SYNC] Iniciando coleta", {
        sourceId: source.id,
        accounts: accounts.length,
        dateStart: replaceFrom,
        dateEnd,
      });

      const [insightGroups, campaignGroups] = await Promise.all([
        Promise.all(accounts.map((account: any) => fetchInsights(
          client,
          String(account.ad_account_id),
          replaceFrom,
          dateEnd,
          Array.isArray(config.attribution_windows) ? config.attribution_windows : ["7d_click", "1d_view"],
        ))),
        Promise.all(accounts.map(async (account: any) => {
          try {
            return await fetchCampaigns(client, String(account.ad_account_id));
          } catch (error) {
            campaignStatusWarnings.push(`Status das campanhas da conta ${account.ad_account_name || account.ad_account_id} indisponível: ${error instanceof Error ? error.message : "erro desconhecido"}`);
            return [];
          }
        })),
      ]);
      const importedRows = insightGroups.flat().map(normalizeMetaInsightRow);
      console.info("[META_SYNC] Coleta de performance concluída", {
        sourceId: source.id,
        rows: importedRows.length,
      });
      const rows = enrichRowsWithCampaignStatuses(
        mergeMetaDailyRows(previousMetaPayload?.dailyPerformance || [], importedRows, replaceFrom),
        campaignGroups.flat(),
      );
      const averageDailySpend = calculateAverageDailySpend(rows);
      const financialResults = await Promise.all(accounts.map(async (account: any) => {
        const accountId = String(account.ad_account_id);
        const accountName = String(account.ad_account_name || accountId);
        try {
          return await fetchAccountFinancialStatus(client, accountId, accountName, averageDailySpend);
        } catch (error) {
          const message = error instanceof Error ? error.message : "resposta financeira indisponível";
          campaignStatusWarnings.push(`Informação financeira da conta ${accountName} indisponível: ${message}`);
          return buildFinancialErrorStatus({
            provider: "meta_ads", accountId, accountName, currency: account.currency || null,
            message: "Informação financeira temporariamente indisponível.",
          });
        }
      }));
      console.info("[META_SYNC] Coleta financeira concluída", {
        sourceId: source.id,
        accounts: financialResults.length,
      });
      const payload = buildMetaAdsApiPayload({
        rows,
        accountNames: accounts.map((account: any) => String(account.ad_account_name)),
        accountIds: accounts.map((account: any) => String(account.ad_account_id)),
        dateStart: rows[0]?.date || replaceFrom,
        dateEnd,
        objectives: Array.isArray(dashboard.meta_objectives) ? dashboard.meta_objectives : [],
        primaryObjective: dashboard.meta_primary_objective || null,
        apiVersion,
        warnings: campaignStatusWarnings,
        financialStatuses: financialResults,
      });
      const snapshotPayload = dashboard.dashboard_type === "google_meta_ads_s4x"
        ? buildIntegratedAdsPayload({
          sourceRole: "meta_ads",
          importedPayload: payload,
          previousPayload: previousSnapshot?.payload_json,
          sourceLabel: "Meta Marketing API",
          sourceReference: accounts.map((account: any) => account.ad_account_id).join(","),
        })
        : payload;
      const finishedAt = new Date().toISOString();

      await DashboardService.saveSnapshot({
        client_id: source.client_id,
        dashboard_id: source.dashboard_id,
        data_source_id: source.id,
        period_start: rows[0]?.date || replaceFrom,
        period_end: dateEnd,
        source_type: "meta_ads",
        payload_json: snapshotPayload,
        imported_at: finishedAt,
      });
      await supabase.from("meta_ad_sources").update({
        last_import_at: finishedAt,
        last_import_status: "success",
        last_error: null,
      }).eq("data_source_id", source.id);
      await DashboardService.updateMetaValidation(source.dashboard_id, {
        meta_validation_status: payload.metaValidationStatus || "not_configured",
        meta_validation_notes: payload.metaValidationNotes || {},
        meta_validation_updated_at: finishedAt,
      });
      if (dashboard.dashboard_type === "google_meta_ads_s4x" && !dashboard.meta_metrics_source_id) {
        await supabase
          .from("dashboards")
          .update({ meta_metrics_source_id: source.id })
          .eq("id", source.dashboard_id)
          .is("meta_metrics_source_id", null);
      } else if (dashboard.dashboard_type !== "google_meta_ads_s4x" && !dashboard.metrics_source_id) {
        await supabase
          .from("dashboards")
          .update({ metrics_source_id: source.id })
          .eq("id", source.dashboard_id)
          .is("metrics_source_id", null);
      }
      await DataSourceService.saveImportLog({
        id: logId,
        client_id: source.client_id,
        dashboard_id: source.dashboard_id,
        data_source_id: source.id,
        source_type: "meta_ads",
        status: "success",
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        tabs_read: accounts.map((account: any) => `act_${account.ad_account_id}`),
        rows_read: importedRows.length,
        warnings: 0,
        errors: 0,
        metadata: { date_start: replaceFrom, date_end: dateEnd, api_version: apiVersion },
      });
      return { success: true, rowsRead: importedRows.length, dateStart: replaceFrom, dateEnd };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar Meta Ads.";
      await supabase.from("meta_ad_sources").update({
        last_import_at: finishedAt,
        last_import_status: "failed",
        last_error: message.slice(0, 1000),
      }).eq("data_source_id", source.id);
      if (error instanceof MetaGraphError && error.code === 190) {
        await supabase.from("meta_business_connections").update({ status: "expired", last_error: message.slice(0, 1000) }).eq("id", connection.id);
      }
      await DataSourceService.saveImportLog({
        id: logId,
        client_id: source.client_id,
        dashboard_id: source.dashboard_id,
        data_source_id: source.id,
        source_type: "meta_ads",
        status: "failed",
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        tabs_read: [], rows_read: 0, warnings: 0, errors: 1, error_details: message.slice(0, 1000),
      }).catch(() => undefined);
      throw error;
    }
  },
};
