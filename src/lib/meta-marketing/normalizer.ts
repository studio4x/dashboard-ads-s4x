/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetricsHelper } from "@/lib/google-sheets/metrics-helper";
import type { MetaAdsS4XDailyPerformance, MetaAdsS4XPayload } from "@/types/meta-ads-s4x";
import type { MetaInsightAction, MetaInsightRow } from "@/types/meta-marketing";
import type { AdsFinancialStatus } from "@/lib/ads-financial";

const ACTION_TYPES = {
  messaging: ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"],
  leads: ["lead"],
  onFacebookLeads: ["onsite_conversion.lead_grouped", "onsite_conversion.lead"],
  websiteLeads: ["offsite_conversion.fb_pixel_lead"],
  offlineLeads: ["offline_conversion.lead", "offline_conversion"],
  postEngagement: ["post_engagement"],
  postComments: ["comment"],
  postReactions: ["post_reaction"],
  postShares: ["post"],
  purchases: ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
} as const;

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionValue(actions: MetaInsightAction[] | undefined, types: readonly string[]) {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((total, action) => {
    const actionType = String(action?.action_type || "");
    return types.some((type) => actionType === type || actionType.endsWith(`.${type}`))
      ? total + numberValue(action?.value)
      : total;
  }, 0);
}

export function normalizeMetaInsightRow(row: MetaInsightRow): MetaAdsS4XDailyPerformance {
  const messaging = actionValue(row.actions, ACTION_TYPES.messaging);
  const genericLeads = actionValue(row.actions, ACTION_TYPES.leads);
  const onFacebookLeads = actionValue(row.actions, ACTION_TYPES.onFacebookLeads);
  const websiteLeads = actionValue(row.actions, ACTION_TYPES.websiteLeads);
  const offlineLeads = actionValue(row.actions, ACTION_TYPES.offlineLeads);
  const purchases = actionValue(row.actions, ACTION_TYPES.purchases);
  const leadBreakdown = onFacebookLeads + websiteLeads + offlineLeads;
  const leads = genericLeads > 0 ? genericLeads : leadBreakdown;
  const conversions = leads > 0 ? leads : messaging > 0 ? messaging : purchases;
  const cost = numberValue(row.spend);
  const clicks = numberValue(row.inline_link_clicks || row.clicks);
  const postEngagement = numberValue(row.inline_post_engagement) || actionValue(row.actions, ACTION_TYPES.postEngagement);
  const purchaseValue = actionValue(row.action_values, ACTION_TYPES.purchases);

  return {
    date: row.date_start,
    accountId: row.account_id || null,
    accountName: row.account_name || null,
    campaignId: row.campaign_id || null,
    campaignName: row.campaign_name || "Sem campanha",
    adSetId: row.adset_id || null,
    adSetName: row.adset_name || "Sem conjunto",
    adId: row.ad_id || null,
    adName: row.ad_name || "Sem anúncio",
    objective: row.objective || null,
    reach: numberValue(row.reach),
    impressions: numberValue(row.impressions),
    frequency: numberValue(row.frequency),
    cost,
    cpm: numberValue(row.cpm),
    clicks,
    cpc: numberValue(row.cpc) || (clicks > 0 ? cost / clicks : 0),
    ctr: numberValue(row.ctr),
    conversions,
    costPerConversion: conversions > 0 ? cost / conversions : null,
    conversionValue: purchaseValue,
    messagingConversationsStarted: messaging,
    costPerMessagingConversationsStarted: messaging > 0 ? cost / messaging : null,
    leads,
    onFacebookLeads,
    websiteLeads,
    offlineLeads,
    purchases,
    costPerLead: leads > 0 ? cost / leads : null,
    costPerOnFacebookLead: onFacebookLeads > 0 ? cost / onFacebookLeads : null,
    costPerWebsiteLead: websiteLeads > 0 ? cost / websiteLeads : null,
    costPerOfflineLead: offlineLeads > 0 ? cost / offlineLeads : null,
    postEngagement,
    postComments: actionValue(row.actions, ACTION_TYPES.postComments),
    postReactions: actionValue(row.actions, ACTION_TYPES.postReactions),
    postShares: actionValue(row.actions, ACTION_TYPES.postShares),
  } as MetaAdsS4XDailyPerformance;
}

export function metaDailyRowKey(row: Record<string, any>) {
  return [row.accountId || "", row.date || "", row.campaignId || row.campaignName || "", row.adSetId || row.adSetName || "", row.adId || row.adName || ""].join("|");
}

export function mergeMetaDailyRows(previousRows: any[], importedRows: MetaAdsS4XDailyPerformance[], replaceFrom: string) {
  const merged = new Map<string, MetaAdsS4XDailyPerformance>();
  previousRows
    .filter((row) => String(row?.date || "") < replaceFrom)
    .forEach((row) => merged.set(metaDailyRowKey(row), row));
  importedRows.forEach((row) => merged.set(metaDailyRowKey(row as any), row));
  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMetaAdsApiPayload(params: {
  rows: MetaAdsS4XDailyPerformance[];
  accountNames: string[];
  accountIds: string[];
  dateStart: string;
  dateEnd: string;
  objectives: string[];
  primaryObjective: string | null;
  apiVersion: string;
  warnings?: string[];
  financialStatuses?: AdsFinancialStatus[];
}): MetaAdsS4XPayload {
  const summary = MetricsHelper.calculateMetaSummary(params.rows);
  const now = new Date().toISOString();
  return {
    meta: {
      accountName: params.accountNames.length === 1 ? params.accountNames[0] : `${params.accountNames.length} contas Meta`,
      accountId: params.accountIds.length === 1 ? params.accountIds[0] : params.accountIds.join(","),
      dateStart: params.dateStart,
      dateEnd: params.dateEnd,
      executedAt: now,
      timezone: "America/Sao_Paulo",
    },
    config: {
      templateId: "meta_ads_s4x",
      templateLabel: "Meta Ads S4X",
      templateVersion: "1.0",
      source: "Meta Marketing API",
      dateStart: params.dateStart,
      dateEnd: params.dateEnd,
      notes: `Graph API ${params.apiVersion}`,
      metaObjectives: params.objectives,
      metaPrimaryObjective: params.primaryObjective,
    },
    summary: summary as any,
    dailyPerformance: params.rows,
    financialStatuses: params.financialStatuses || [],
    financialStatus: params.financialStatuses?.length === 1 ? params.financialStatuses[0] : null,
    diagnostics: {
      templateValidation: { isValid: true, source: "meta_marketing_api" },
      schemaValidation: { isValid: true, apiVersion: params.apiVersion },
      warnings: params.warnings || [],
      errors: [],
      rowCounts: { insights: params.rows.length },
      ignoredRows: 0,
      sourceSpreadsheetId: "",
      sourceType: "meta_marketing_api",
      accountIds: params.accountIds,
      importedAt: now,
      snapshotVersion: "meta_ads_s4x_api_v1",
    } as any,
    metaObjectives: params.objectives,
    metaPrimaryObjective: params.primaryObjective,
    metaValidationStatus: params.objectives.length > 0 ? "ok" : "not_configured",
    metaValidationNotes: {
      checkedAt: now,
      source: "meta_marketing_api",
      objectives: params.objectives,
      message: params.objectives.length > 0
        ? "Métricas carregadas diretamente da Meta Marketing API."
        : "Objetivos de campanha não configurados para este dashboard Meta Ads.",
    },
  };
}
