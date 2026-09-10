import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsApiError, GoogleAdsRestClient, type GoogleAdsMutableCollection } from "@/lib/google-ads-api/client";
import { getGoogleAdsSettings } from "@/lib/google-ads-api/settings";
import { readGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";
import { buildAdGroupKeyword, buildAdSchedule, buildCampaignAsset, buildConversionGoal, buildKeywordCpc, buildLocation, buildNewResponsiveSearchAd, buildResponsiveSearchAd, buildTargetOrBidding, type AdvancedBuild } from "@/lib/google-ads-api/advanced-mutation-builders";
import { googleAdsHighRiskWritesEnabled, googleAdsRequiredConfirmation, googleAdsRiskForOperation, googleAdsWritesEnabled, requiresStrongGoogleAdsConfirmation } from "@/lib/google-ads-api/risk-policy";
import type { GoogleAdsAdvancedOperation, GoogleAdsRiskLevel } from "@/types/google-ads-mutations";

type Context = { sourceId: string; customerId: string; customerName: string; currencyCode: string | null; managerCustomerId: string | null; writeEnabled: boolean; client: GoogleAdsRestClient };
type Row = Record<string, unknown>;
type Preview = { requestId: string; previewHash: string; operationType: string; riskLevel: GoogleAdsRiskLevel; executable: boolean; blockedReason: string | null; account: { customerId: string; customerName: string; currencyCode: string | null }; resourceType: string; resourceName: string | null; before: Record<string, unknown> | null; after: Record<string, unknown>; description: string; warnings: string[]; reversible: boolean; validatedByGoogle: boolean; requiredConfirmation: string | null };

const object = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
const text = (v: unknown) => String(v ?? "").trim();
const digits = (v: unknown) => text(v).replace(/\D/g, "");
const escape = (v: string) => v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const stable = (v: unknown): string => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v);
const hash = (v: unknown) => createHash("sha256").update(stable(v), "utf8").digest("hex");
const isAdvanced = (v: string): v is GoogleAdsAdvancedOperation => v !== "" && ["batch_google_ads_changes", "add_ad_group_keyword", "set_keyword_cpc", "add_ad_schedule", "edit_ad_schedule", "remove_ad_schedule", "add_campaign_location", "remove_campaign_location", "edit_responsive_search_ad", "create_responsive_search_ad", "create_campaign_asset", "link_campaign_asset", "unlink_campaign_asset", "apply_google_recommendation", "dismiss_google_recommendation", "set_target_cpa", "set_target_roas", "set_campaign_bidding_strategy", "set_conversion_action_primary", "set_conversion_action_include_in_conversions", "set_customer_conversion_goal_biddable", "set_campaign_conversion_goal_biddable"].includes(v);

async function context(sourceId: string): Promise<Context> {
  const supabase = await createAdminClient({ actor: "api_admin", action: "google_ads_advanced_mutation_context" });
  const { data, error } = await supabase.from("data_sources").select("id,status,type,google_ads_sources(connection_id,customer_id,customer_name,manager_customer_id,currency_code,write_enabled,google_ads_connections(id,status))").eq("id", sourceId).eq("type", "google_ads").maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active") throw new Error("Fonte Google Ads ativa não encontrada.");
  const source = Array.isArray(data.google_ads_sources) ? data.google_ads_sources[0] : data.google_ads_sources;
  const connection = Array.isArray(source?.google_ads_connections) ? source.google_ads_connections[0] : source?.google_ads_connections;
  if (!source || !connection || connection.status !== "active") throw new Error("Conexão Google Ads inativa.");
  const settings = await getGoogleAdsSettings();
  return { sourceId, customerId: digits(source.customer_id), customerName: text(source.customer_name) || "Conta Google Ads", currencyCode: text(source.currency_code) || null, managerCustomerId: source.manager_customer_id ? digits(source.manager_customer_id) : null, writeEnabled: source.write_enabled === true, client: new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(source.connection_id)) };
}

async function first(ctx: Context, query: string) { const result = await ctx.client.search(ctx.customerId, query, ctx.managerCustomerId); return result.rows[0] as Row | undefined; }
async function rows(ctx: Context, query: string) { return (await ctx.client.search(ctx.customerId, query, ctx.managerCustomerId)).rows as Row[]; }

async function batchBuild(ctx: Context, target: Record<string, unknown>) {
  const items = Array.isArray(target.items) ? target.items : [];
  if (!items.length || items.length > 100) throw new Error("O lote deve conter entre 1 e 100 alterações.");
  const operations: Array<Record<string, unknown>> = []; const before: unknown[] = []; const after: unknown[] = []; const warnings: string[] = [];
  for (const raw of items) {
    const item = object(raw); const operation = text(item.operationType); const itemTarget = object(item.target);
    if (operation === "add_ad_group_keyword") {
      const state = await stateFor(ctx, operation, itemTarget); const change = built(operation, itemTarget, state); operations.push({ adGroupCriterionOperation: change.operations[0] }); before.push(change.before); after.push(change.after); warnings.push(...change.warnings); continue;
    }
    if (operation === "set_keyword_status") {
      const row = await first(ctx, `SELECT ad_group_criterion.resource_name, ad_group_criterion.status, ad_group_criterion.keyword.text FROM ad_group_criterion WHERE ad_group.id = ${digits(itemTarget.adGroupId)} AND ad_group_criterion.criterion_id = ${digits(itemTarget.criterionId)} LIMIT 1`); const criterion = object(row?.adGroupCriterion); const resourceName = text(criterion.resourceName); const currentStatus = text(criterion.status).toUpperCase(); const nextStatus = text(itemTarget.status).toUpperCase(); if (!resourceName || !["ENABLED", "PAUSED"].includes(currentStatus) || !["ENABLED", "PAUSED"].includes(nextStatus) || currentStatus === nextStatus) throw new Error("Status de palavra-chave inválido no lote."); operations.push({ adGroupCriterionOperation: { update: { resourceName, status: nextStatus }, updateMask: "status" } }); before.push({ resourceName, status: currentStatus }); after.push({ resourceName, status: nextStatus }); continue;
    }
    if (operation === "add_campaign_negative_keyword") {
      const campaignRow = await first(ctx, `SELECT campaign.resource_name, campaign.name FROM campaign WHERE campaign.id = ${digits(itemTarget.campaignId)} LIMIT 1`); const campaign = object(campaignRow?.campaign); const negativeType = text(itemTarget.matchType).toUpperCase(); if (!text(campaign.resourceName) || !["EXACT", "PHRASE"].includes(negativeType) || !text(itemTarget.text)) throw new Error("Negativa inválida no lote."); operations.push({ campaignCriterionOperation: { create: { campaign: text(campaign.resourceName), negative: true, keyword: { text: text(itemTarget.text).slice(0, 80), matchType: negativeType } } } }); before.push({ exists: false, campaignId: itemTarget.campaignId }); after.push({ campaignId: itemTarget.campaignId, text: itemTarget.text, matchType: negativeType }); continue;
    }
    throw new Error(`Operação ${operation || "desconhecida"} não é permitida em lote.`);
  }
  return { operations, before, after, warnings };
}

async function buildBatchChange(ctx: Context, target: Record<string, unknown>): Promise<AdvancedBuild> {
  const result = await batchBuild(ctx, target);
  const items = Array.isArray(target.items) ? target.items : [];
  const riskLevels = items.map((item) => {
    const value = object(item);
    return googleAdsRiskForOperation(text(value.operationType) as GoogleAdsAdvancedOperation, object(value.target));
  });
  const risk = riskLevels.includes("high") || riskLevels.includes("critical") ? "high" : riskLevels.includes("medium") ? "medium" : "low";
  return {
    collection: "campaigns",
    operations: result.operations,
    revertOperations: null,
    resourceType: "atomic_batch",
    resourceName: null,
    before: { items: result.before },
    after: { items: result.after, count: result.operations.length },
    target: { items },
    description: `Preparar lote atômico com ${result.operations.length} alteração(ões).`,
    warnings: [...result.warnings, "O lote será enviado com partialFailure=false: se uma operação falhar, nenhuma alteração do lote será aplicada."],
    riskLevel: risk,
    executable: true,
    blockedReason: null,
  };
}

function mutationOperations(ctx: Pick<Context, "customerId">, operation: GoogleAdsAdvancedOperation, target: Record<string, unknown>, change: AdvancedBuild) {
  if (operation === "create_campaign_asset" && text(target.campaignResourceName)) {
    const create = object(change.operations[0]).create;
    const temporaryAsset = `customers/${ctx.customerId}/assets/-1`;
    return [{ assetOperation: { create, resourceName: temporaryAsset } }, { campaignAssetOperation: { create: { campaign: text(target.campaignResourceName), asset: temporaryAsset, fieldType: text(target.assetType).toUpperCase() } } }];
  }
  return change.atomicOperations || change.operations;
}

async function stateFor(ctx: Context, operation: GoogleAdsAdvancedOperation, target: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (operation === "batch_google_ads_changes") return {};
  if (operation === "add_ad_group_keyword") {
    const adGroupId = digits(target.adGroupId); const campaignId = digits(target.campaignId);
    const [groupRow, criteria, negatives] = await Promise.all([
      first(ctx, `SELECT campaign.resource_name, campaign.name, ad_group.resource_name, ad_group.name FROM ad_group WHERE campaign.id = ${campaignId} AND ad_group.id = ${adGroupId} LIMIT 1`),
      rows(ctx, `SELECT ad_group_criterion.criterion_id, ad_group_criterion.status, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type FROM ad_group_criterion WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.type = 'KEYWORD'`),
      rows(ctx, `SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type FROM campaign_criterion WHERE campaign.id = ${campaignId} AND campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD'`),
    ]);
    const keyword = text(target.text).toLocaleLowerCase("pt-BR"); const mt = text(target.matchType).toUpperCase();
    return { customerId: ctx.customerId, campaignResourceName: text(object(groupRow?.campaign).resourceName), campaignName: text(object(groupRow?.campaign).name), adGroupResourceName: text(object(groupRow?.adGroup).resourceName), adGroupName: text(object(groupRow?.adGroup).name), duplicate: criteria.some((r) => { const keywordValue = object(object(r.adGroupCriterion).keyword); return text(keywordValue.text).toLocaleLowerCase("pt-BR") === keyword && text(keywordValue.matchType).toUpperCase() === mt; }), conflict: negatives.some((r) => { const keywordValue = object(object(r.campaignCriterion).keyword); return text(keywordValue.text).toLocaleLowerCase("pt-BR") === keyword && text(keywordValue.matchType).toUpperCase() === mt; }) };
  }
  if (operation === "set_keyword_cpc") {
    const row = await first(ctx, `SELECT campaign.bidding_strategy_type, campaign.advertising_channel_type, ad_group_criterion.resource_name, ad_group_criterion.cpc_bid_micros, ad_group_criterion.effective_cpc_bid_micros FROM ad_group_criterion WHERE ad_group.id = ${digits(target.adGroupId)} AND ad_group_criterion.criterion_id = ${digits(target.criterionId)} LIMIT 1`);
    const criterion = object(row?.adGroupCriterion); const campaign = object(row?.campaign);
    return { resourceName: criterion.resourceName, currentCpcMicros: criterion.cpcBidMicros || criterion.effectiveCpcBidMicros, biddingStrategyType: campaign.biddingStrategyType, campaignType: campaign.advertisingChannelType };
  }
  if (["add_ad_schedule", "edit_ad_schedule", "remove_ad_schedule"].includes(operation)) {
    const campaignId = digits(target.campaignId); const [campaignRow, schedules] = await Promise.all([first(ctx, `SELECT campaign.resource_name, campaign.name FROM campaign WHERE campaign.id = ${campaignId} LIMIT 1`), rows(ctx, `SELECT campaign_criterion.resource_name, campaign_criterion.ad_schedule.day_of_week, campaign_criterion.ad_schedule.start_hour, campaign_criterion.ad_schedule.start_minute, campaign_criterion.ad_schedule.end_hour, campaign_criterion.ad_schedule.end_minute FROM campaign_criterion WHERE campaign.id = ${campaignId} AND campaign_criterion.type = 'AD_SCHEDULE'`)]);
    return { campaignResourceName: text(object(campaignRow?.campaign).resourceName), existingSchedules: schedules.map((r) => { const criterion = object(r.campaignCriterion); const s = object(criterion.adSchedule); return { resourceName: criterion.resourceName, dayOfWeek: s.dayOfWeek, startMinutes: Number(s.startHour || 0) * 60 + Number(String(s.startMinute || "ZERO").replace(/\D/g, "") || 0), endMinutes: Number(s.endHour || 0) * 60 + Number(String(s.endMinute || "ZERO").replace(/\D/g, "") || 0) }; }) };
  }
  if (["add_campaign_location", "remove_campaign_location"].includes(operation)) {
    const campaignId = digits(target.campaignId); const [campaignRow, locations] = await Promise.all([first(ctx, `SELECT campaign.resource_name, campaign.name FROM campaign WHERE campaign.id = ${campaignId} LIMIT 1`), rows(ctx, `SELECT campaign_criterion.resource_name, campaign_criterion.location.geo_target_constant FROM campaign_criterion WHERE campaign.id = ${campaignId} AND campaign_criterion.type = 'LOCATION' AND campaign_criterion.negative = FALSE`)]);
    return { campaignResourceName: text(object(campaignRow?.campaign).resourceName), existingLocations: locations.map((r) => { const criterion = object(r.campaignCriterion); return { resourceName: criterion.resourceName, geoTargetConstantResourceName: object(criterion.location).geoTargetConstant }; }) };
  }
  if (operation === "edit_responsive_search_ad" || operation === "create_responsive_search_ad") {
    const row = await first(ctx, `SELECT ad_group.resource_name, ad_group_ad.resource_name, ad_group_ad.status, ad_group_ad.ad.resource_name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.final_mobile_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE ad_group_ad.ad.id = ${digits(target.adId)} AND ad_group.id = ${digits(target.adGroupId)} LIMIT 1`); const adGroup = object(row?.adGroup); const adGroupAd = object(row?.adGroupAd); const ad = object(adGroupAd.ad); const rsa = object(ad.responsiveSearchAd);
    return { resourceName: ad.resourceName, adGroupResourceName: adGroup.resourceName, adGroupAdResourceName: adGroupAd.resourceName, adGroupAdStatus: adGroupAd.status, adType: ad.type, finalUrls: (Array.isArray(ad.finalUrls) ? ad.finalUrls : []).map(text), finalMobileUrls: (Array.isArray(ad.finalMobileUrls) ? ad.finalMobileUrls : []).map(text), headlineAssets: (Array.isArray(rsa.headlines) ? rsa.headlines : []).map((v) => ({ text: text(object(v).text), pinnedField: text(object(v).pinnedField) })), descriptionAssets: (Array.isArray(rsa.descriptions) ? rsa.descriptions : []).map((v) => ({ text: text(object(v).text), pinnedField: text(object(v).pinnedField) })), headlines: (Array.isArray(rsa.headlines) ? rsa.headlines : []).map((v) => text(object(v).text)), descriptions: (Array.isArray(rsa.descriptions) ? rsa.descriptions : []).map((v) => text(object(v).text)) };
  }
  if (["create_campaign_asset", "link_campaign_asset", "unlink_campaign_asset"].includes(operation)) return { customerId: ctx.customerId, campaignResourceName: target.campaignResourceName, assetResourceName: target.assetResourceName };
  if (["apply_google_recommendation", "dismiss_google_recommendation"].includes(operation)) return { recommendationResourceName: target.recommendationResourceName, recommendationType: target.recommendationType };
  if (["set_target_cpa", "set_target_roas", "set_campaign_bidding_strategy"].includes(operation)) {
    const row = await first(ctx, `SELECT campaign.resource_name, campaign.name, campaign.bidding_strategy_type, campaign.maximize_conversions.target_cpa_micros, campaign.maximize_conversion_value.target_roas, campaign.target_cpa.target_cpa_micros, campaign.target_roas.target_roas, campaign.advertising_channel_type FROM campaign WHERE campaign.id = ${digits(target.campaignId)} LIMIT 1`); const campaign = object(row?.campaign);
    const metrics = await rows(ctx, `SELECT metrics.conversions FROM campaign WHERE campaign.id = ${digits(target.campaignId)} AND segments.date DURING LAST_30_DAYS`);
    return { resourceName: campaign.resourceName, biddingStrategyType: campaign.biddingStrategyType, targetCpaMicros: object(campaign.maximizeConversions).targetCpaMicros || object(campaign.targetCpa).targetCpaMicros, targetRoas: object(campaign.maximizeConversionValue).targetRoas || object(campaign.targetRoas).targetRoas, recentConversions: metrics.reduce((sum, r) => sum + Number(object(r.metrics).conversions || 0), 0), campaignType: campaign.advertisingChannelType };
  }
  if (["set_conversion_action_primary", "set_conversion_action_include_in_conversions"].includes(operation)) { const row = await first(ctx, `SELECT conversion_action.resource_name, conversion_action.primary_for_goal, conversion_action.include_in_conversions_metric FROM conversion_action WHERE conversion_action.resource_name = '${escape(text(target.resourceName))}' LIMIT 1`); const action = object(row?.conversionAction); return { resourceName: action.resourceName, primaryForGoal: action.primaryForGoal, includeInConversionsMetric: action.includeInConversionsMetric }; }
  if (operation === "set_customer_conversion_goal_biddable") { const row = await first(ctx, `SELECT customer_conversion_goal.resource_name, customer_conversion_goal.biddable FROM customer_conversion_goal WHERE customer_conversion_goal.resource_name = '${escape(text(target.resourceName))}' LIMIT 1`); const goal = object(row?.customerConversionGoal); return { resourceName: goal.resourceName, biddable: goal.biddable }; }
  if (operation === "set_campaign_conversion_goal_biddable") { const row = await first(ctx, `SELECT campaign_conversion_goal.resource_name, campaign_conversion_goal.biddable FROM campaign_conversion_goal WHERE campaign_conversion_goal.resource_name = '${escape(text(target.resourceName))}' LIMIT 1`); const goal = object(row?.campaignConversionGoal); return { resourceName: goal.resourceName, biddable: goal.biddable }; }
  return {};
}

function built(operation: GoogleAdsAdvancedOperation, target: Record<string, unknown>, state: Record<string, unknown>): AdvancedBuild {
  if (operation === "add_ad_group_keyword") return buildAdGroupKeyword(target, state);
  if (operation === "set_keyword_cpc") return buildKeywordCpc(target, state);
  if (["add_ad_schedule", "edit_ad_schedule", "remove_ad_schedule"].includes(operation)) return buildAdSchedule(operation as "add_ad_schedule" | "edit_ad_schedule" | "remove_ad_schedule", target, state);
  if (["add_campaign_location", "remove_campaign_location"].includes(operation)) return buildLocation(operation as "add_campaign_location" | "remove_campaign_location", target, state);
  if (operation === "edit_responsive_search_ad") return buildResponsiveSearchAd(target, state);
  if (operation === "create_responsive_search_ad") return buildNewResponsiveSearchAd(target, state);
  if (["create_campaign_asset", "link_campaign_asset", "unlink_campaign_asset"].includes(operation)) {
    const change = buildCampaignAsset(operation as "create_campaign_asset" | "link_campaign_asset" | "unlink_campaign_asset", target, state);
    if (operation === "create_campaign_asset" && text(target.campaignResourceName)) change.operations = mutationOperations({ customerId: text(state.customerId) }, operation, target, change);
    return change;
  }
  if (["set_target_cpa", "set_target_roas", "set_campaign_bidding_strategy"].includes(operation)) return buildTargetOrBidding(operation as "set_target_cpa" | "set_target_roas" | "set_campaign_bidding_strategy", target, state);
  if (["apply_google_recommendation", "dismiss_google_recommendation"].includes(operation)) {
    const recommendationResourceName = text(target.recommendationResourceName);
    if (!/^customers\/\d+\/recommendations\/[^/]+$/.test(recommendationResourceName)) throw new Error("Recommendation resource name inválido.");
    return { collection: "campaigns", operations: [], revertOperations: null, resourceType: "google_recommendation", resourceName: recommendationResourceName, before: { recommendationResourceName, recommendationType: target.recommendationType }, after: { action: operation === "apply_google_recommendation" ? "apply" : "dismiss" }, target: { recommendationResourceName, recommendationType: target.recommendationType }, description: operation === "apply_google_recommendation" ? "Aplicar recomendação oficial do Google Ads." : "Dispensar recomendação oficial do Google Ads.", warnings: ["O Google não expõe validateOnly para este método; a confirmação humana e a auditoria continuam obrigatórias."], riskLevel: operation === "apply_google_recommendation" ? "high" : "medium", executable: true, blockedReason: null };
  }
  return buildConversionGoal(operation as "set_conversion_action_primary" | "set_conversion_action_include_in_conversions" | "set_customer_conversion_goal_biddable" | "set_campaign_conversion_goal_biddable", target, state);
}

function previewHash(ctx: Context, operation: string, change: AdvancedBuild) { return hash({ customerId: ctx.customerId, operationType: operation, target: change.target, before: change.before, after: change.after }); }
async function audit(id: string, event: string, actorId: string | null, payload: Record<string, unknown>) { const supabase = await createAdminClient({ actor: "api_admin", action: "audit_google_ads_advanced_change" }); await supabase.from("google_ads_platform_change_audit").insert({ change_request_id: id, event_type: event, actor_id: actorId, payload }); }
function apiError(error: unknown) { return error instanceof GoogleAdsApiError ? { code: error.errorCode || error.apiStatus || `HTTP_${error.statusCode}`, message: error.message.slice(0, 1800), requestId: error.requestId } : { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message.slice(0, 1800) : "Erro desconhecido.", requestId: null }; }

async function readBack(ctx: Context, operation: GoogleAdsAdvancedOperation, target: Record<string, unknown>, change: AdvancedBuild, body: unknown) {
  if (operation.includes("recommendation")) return "acknowledged_by_official_method";
  const responseBody = object(body);
  const resultRows = (Array.isArray(responseBody.results) ? responseBody.results : Array.isArray(responseBody.mutateResults) ? responseBody.mutateResults : []) as unknown[];
  if (operation === "batch_google_ads_changes") return resultRows.length >= (Array.isArray(target.items) ? target.items.length : 1) ? "verified_by_atomic_response" : "pending_sync_readback";
  const resourceName = text(change.resourceName) || text(object(resultRows[0]).resourceName);
  if (operation === "create_responsive_search_ad" && resourceName) {
    const [createdRow, existingRow] = await Promise.all([
      first(ctx, `SELECT ad_group_ad.resource_name, ad_group_ad.status FROM ad_group_ad WHERE ad_group_ad.resource_name = '${escape(resourceName)}' LIMIT 1`),
      target.pauseExisting === true ? first(ctx, `SELECT ad_group_ad.resource_name, ad_group_ad.status FROM ad_group_ad WHERE ad_group.id = ${digits(target.adGroupId)} AND ad_group_ad.ad.id = ${digits(target.adId)} LIMIT 1`) : Promise.resolve(undefined),
    ]);
    if (!createdRow) return "created_ad_not_reflected";
    if (target.pauseExisting === true && text(object(existingRow?.adGroupAd).status).toUpperCase() !== "PAUSED") return "existing_ad_pause_not_reflected";
    return "verified_by_google_readback";
  }
  let query = "";
  if (operation === "add_ad_group_keyword") query = `SELECT ad_group_criterion.resource_name FROM ad_group_criterion WHERE ad_group.id = ${text(target.adGroupId).replace(/\D/g, "")} AND ad_group_criterion.keyword.text = '${escape(text(target.text))}' LIMIT 1`;
  else if (resourceName && ["set_keyword_cpc"].includes(operation)) query = `SELECT ad_group_criterion.resource_name, ad_group_criterion.cpc_bid_micros FROM ad_group_criterion WHERE ad_group_criterion.resource_name = '${escape(resourceName)}' LIMIT 1`;
  else if (resourceName && operation.includes("schedule")) query = `SELECT campaign_criterion.resource_name FROM campaign_criterion WHERE campaign_criterion.resource_name = '${escape(resourceName)}' LIMIT 1`;
  else if (resourceName && operation.includes("location")) query = `SELECT campaign_criterion.resource_name FROM campaign_criterion WHERE campaign_criterion.resource_name = '${escape(resourceName)}' LIMIT 1`;
  else if (resourceName && operation === "edit_responsive_search_ad") query = `SELECT ad_group_ad.ad.resource_name FROM ad_group_ad WHERE ad_group_ad.ad.resource_name = '${escape(resourceName)}' LIMIT 1`;
  else if (resourceName && operation.includes("target_")) query = `SELECT campaign.resource_name FROM campaign WHERE campaign.resource_name = '${escape(resourceName)}' LIMIT 1`;
  else if (resourceName && operation.includes("conversion")) query = `SELECT conversion_action.resource_name FROM conversion_action WHERE conversion_action.resource_name = '${escape(resourceName)}' LIMIT 1`;
  if (!query) return resultRows.length ? "verified_by_mutation_response" : "pending_sync_readback";
  const current = await ctx.client.search(ctx.customerId, query, ctx.managerCustomerId);
  return current.rows.length ? "verified_by_google_readback" : "readback_not_reflected";
}

export const GoogleAdsAdvancedMutationService = {
  async recommendations(sourceId: string) {
    const ctx = await context(sourceId);
    const result = await rows(ctx, "SELECT recommendation.resource_name, recommendation.type, recommendation.dismissed, recommendation.impact, recommendation.campaign_budget_recommendation, recommendation.forecasting_set_target_cpa_recommendation, recommendation.forecasting_set_target_roas_recommendation, recommendation.responsive_search_ad_recommendation, recommendation.sitelink_asset_recommendation, recommendation.callout_asset_recommendation, recommendation.call_asset_recommendation FROM recommendation WHERE recommendation.dismissed = FALSE ORDER BY recommendation.type");
    return result.slice(0, 100).map((row) => { const recommendation = object(row.recommendation); return { resourceName: text(recommendation.resourceName), type: text(recommendation.type), dismissed: Boolean(recommendation.dismissed), impact: recommendation.impact || null, details: recommendation, origin: "GOOGLE_RECOMMENDATION" }; });
  },

  async geoSuggestions(sourceId: string, query: string, countryCode = "BR") {
    const ctx = await context(sourceId);
    if (query.trim().length < 2) throw new Error("Informe pelo menos 2 caracteres para buscar uma localização.");
    const response = await ctx.client.suggestGeoTargets(ctx.customerId, query.trim().slice(0, 100), "pt", countryCode.toUpperCase(), ctx.managerCustomerId);
    const body = object(response.body);
    const suggestions = Array.isArray(body.geoTargetConstantSuggestions) ? body.geoTargetConstantSuggestions : [];
    return suggestions.map((item: Row) => { const geo = object(item.geoTargetConstant); return { resourceName: text(geo.resourceName), id: text(geo.id), name: text(geo.name), canonicalName: text(geo.canonicalName), countryCode: text(geo.countryCode), targetType: text(geo.targetType), locale: text(item.locale), reach: item.reach ?? null, origin: "GOOGLE_GEOTARGET_CONSTANT" }; }).filter((item: Row) => item.resourceName);
  },

  async preview(input: { sourceId: string; operationType: GoogleAdsAdvancedOperation; target: Record<string, unknown>; origin: string; actorId: string | null }): Promise<Preview> {
    const ctx = await context(input.sourceId); const state = await stateFor(ctx, input.operationType, input.target); const change = input.operationType === "batch_google_ads_changes" ? await buildBatchChange(ctx, input.target) : built(input.operationType, input.target, state); const risk = change.riskLevel || googleAdsRiskForOperation(input.operationType, input.target); const pHash = previewHash(ctx, input.operationType, change); const base = { requestId: "", previewHash: pHash, operationType: input.operationType, riskLevel: risk, executable: change.executable, blockedReason: change.blockedReason, account: { customerId: ctx.customerId, customerName: ctx.customerName, currencyCode: ctx.currencyCode }, resourceType: change.resourceType, resourceName: change.resourceName, before: change.before, after: change.after, description: change.description, warnings: change.warnings, reversible: Boolean(change.revertOperations), validatedByGoogle: false, requiredConfirmation: googleAdsRequiredConfirmation(input.operationType, risk) };
    if (!change.executable) return base;
    if (input.operationType === "create_campaign_asset" && text(input.target.campaignResourceName)) change.operations = mutationOperations(ctx, input.operationType, input.target, change);
    if (!["apply_google_recommendation", "dismiss_google_recommendation"].includes(input.operationType)) {
      if (input.operationType === "batch_google_ads_changes") await ctx.client.mutateAtomic(ctx.customerId, change.operations, ctx.managerCustomerId, { validateOnly: true });
      else if (input.operationType === "create_campaign_asset" && text(input.target.campaignResourceName)) await ctx.client.mutateAtomic(ctx.customerId, mutationOperations(ctx, input.operationType, input.target, change), ctx.managerCustomerId, { validateOnly: true });
      else await ctx.client.mutate(ctx.customerId, change.collection as GoogleAdsMutableCollection, change.operations, ctx.managerCustomerId, { validateOnly: true });
    }
    const supabase = await createAdminClient({ actor: "api_admin", action: "preview_google_ads_advanced_change" });
    const payload = { data_source_id: ctx.sourceId, origin: input.origin, operation_type: input.operationType, risk_level: risk, resource_type: change.resourceType, resource_name: change.resourceName, target: { ...change.target, operationType: input.operationType }, before_state: change.before, after_state: change.after, preview_hash: pHash, status: "validated", idempotency_key: hash({ sourceId: ctx.sourceId, operationType: input.operationType, target: change.target, before: change.before }), revertible: Boolean(change.revertOperations), revert_payload: change.revertOperations, created_by: input.actorId, validated_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("google_ads_platform_change_requests").upsert(payload, { onConflict: "idempotency_key", ignoreDuplicates: false }).select("id").single(); if (error) throw error; await audit(data.id, "validated", input.actorId, { origin: input.origin, risk, previewHash: pHash }); return { ...base, requestId: data.id, validatedByGoogle: !["apply_google_recommendation", "dismiss_google_recommendation"].includes(input.operationType) };
  },

  async execute(input: { requestId: string; previewHash: string; confirmation: string; actorId: string | null; actorRole?: string | null }) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "execute_google_ads_advanced_change" }); const { data: request, error } = await supabase.from("google_ads_platform_change_requests").select("*").eq("id", input.requestId).maybeSingle(); if (error) throw error; if (!request) throw new Error("Solicitação de alteração não encontrada."); if (request.status === "applied") return { requestId: request.id, status: "applied", alreadyApplied: true }; if (request.status !== "validated") throw new Error(`A solicitação não pode ser executada no estado ${request.status}.`); if (text(request.preview_hash) !== text(input.previewHash)) throw new Error("A confirmação não corresponde à pré-visualização atual.");
    const operation = text(request.operation_type) as GoogleAdsAdvancedOperation; if (!isAdvanced(operation)) throw new Error("Operação avançada inválida."); const risk = googleAdsRiskForOperation(operation, object(request.target)); const required = googleAdsRequiredConfirmation(operation, risk); if (required && input.confirmation.trim().toUpperCase() !== required) throw new Error(`Digite exatamente “${required}” para confirmar esta alteração.`); if (risk === "critical" && input.actorRole !== "owner") throw new Error("Somente owner pode executar alterações críticas de conversão.");
    const ctx = await context(request.data_source_id); if (!googleAdsWritesEnabled() || !ctx.writeEnabled) throw new Error("Alterações reais estão desativadas. Habilite a trava global e a escrita da fonte para executar."); if (requiresStrongGoogleAdsConfirmation(risk) && !googleAdsHighRiskWritesEnabled()) throw new Error("Alterações de alto risco estão desativadas pela trava GOOGLE_ADS_HIGH_RISK_WRITES_ENABLED.");
    const target = object(request.target); const state = await stateFor(ctx, operation, target); const change = operation === "batch_google_ads_changes" ? await buildBatchChange(ctx, target) : built(operation, target, state); if (!change.executable) throw new Error(change.blockedReason || "Alteração bloqueada."); const currentHash = previewHash(ctx, operation, change); if (currentHash !== request.preview_hash) { await supabase.from("google_ads_platform_change_requests").update({ status: "stale", error_code: "STALE_PREVIEW", error_message: "O estado mudou depois da prévia.", updated_at: new Date().toISOString() }).eq("id", request.id).eq("status", "validated"); await audit(request.id, "stale", input.actorId, { expected: request.preview_hash, actual: currentHash }); const stale = new Error("Os dados da conta mudaram desde a prévia. Gere uma nova revisão."); stale.name = "STALE_PREVIEW"; throw stale; }
    const { data: locked, error: lockError } = await supabase.from("google_ads_platform_change_requests").update({ status: "executing", approved_by: input.actorId, updated_at: new Date().toISOString() }).eq("id", request.id).eq("status", "validated").select("id").maybeSingle(); if (lockError) throw lockError; if (!locked) throw new Error("Esta alteração já está sendo processada."); await audit(request.id, "approved", input.actorId, { confirmation: input.confirmation, risk });
    try { const result = operation === "apply_google_recommendation" ? await ctx.client.applyRecommendation(ctx.customerId, text(target.recommendationResourceName), ctx.managerCustomerId, object(target.parameters)) : operation === "dismiss_google_recommendation" ? await ctx.client.dismissRecommendation(ctx.customerId, text(target.recommendationResourceName), ctx.managerCustomerId) : operation === "batch_google_ads_changes" ? (await ctx.client.mutateAtomic(ctx.customerId, change.operations, ctx.managerCustomerId, { validateOnly: true }), await ctx.client.mutateAtomic(ctx.customerId, change.operations, ctx.managerCustomerId, { validateOnly: false })) : (await ctx.client.mutate(ctx.customerId, change.collection as GoogleAdsMutableCollection, change.operations, ctx.managerCustomerId, { validateOnly: true }), await ctx.client.mutate(ctx.customerId, change.collection as GoogleAdsMutableCollection, change.operations, ctx.managerCustomerId, { validateOnly: false })); const resultRows = (Array.isArray(object(result.body).results) ? object(result.body).results : Array.isArray(object(result.body).mutateResults) ? object(result.body).mutateResults : []) as unknown[]; const resourceName = text(object(resultRows?.[0]).resourceName) || change.resourceName; const revertPayload = operation === "create_responsive_search_ad" ? null : resourceName && change.operations[0]?.create && operation !== "batch_google_ads_changes" ? [{ remove: resourceName }] : change.revertOperations; let postWriteVerification = "pending_sync_readback"; try { postWriteVerification = await readBack(ctx, operation, target, { ...change, resourceName }, result.body); } catch { postWriteVerification = "readback_failed_after_google_ack"; } await supabase.from("google_ads_platform_change_requests").update({ status: "applied", resource_name: resourceName || null, revertible: Boolean(revertPayload), revert_payload: revertPayload, executed_at: new Date().toISOString(), google_request_id: result.requestId, updated_at: new Date().toISOString() }).eq("id", request.id).eq("status", "executing"); await audit(request.id, "applied", input.actorId, { googleRequestId: result.requestId, resourceName, after: change.after, postWriteVerification }); return { requestId: request.id, status: "applied", googleRequestId: result.requestId, postWriteVerification, alreadyApplied: false }; } catch (failure) { const info = apiError(failure); await supabase.from("google_ads_platform_change_requests").update({ status: "failed", error_code: info.code, error_message: info.message, google_request_id: info.requestId, updated_at: new Date().toISOString() }).eq("id", request.id); await audit(request.id, "failed", input.actorId, info); throw failure; }
  },

  async revert(input: { requestId: string; actorId: string | null; actorRole?: string | null }) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "revert_google_ads_advanced_change" }); const { data: request, error } = await supabase.from("google_ads_platform_change_requests").select("*").eq("id", input.requestId).maybeSingle(); if (error) throw error; if (!request || request.status !== "applied") throw new Error("A alteração não está disponível para reversão."); if (!request.revertible || !Array.isArray(request.revert_payload)) throw new Error("Essa alteração não possui reversão segura disponível."); const operation = text(request.operation_type) as GoogleAdsAdvancedOperation; if (operation === "create_campaign_asset" || operation.includes("schedule") || operation.includes("location") || operation.includes("asset")) throw new Error("Esta operação não tem reversão automática segura; revise o vínculo/estado manualmente."); const ctx = await context(request.data_source_id); if (!googleAdsWritesEnabled() || !ctx.writeEnabled) throw new Error("Alterações reais estão desativadas."); const target = object(request.target); const state = await stateFor(ctx, operation, target); const change = built(operation, target, state); if (hash({ customerId: ctx.customerId, operationType: operation, target: change.target, before: change.before, after: change.after }) !== text(request.preview_hash)) throw new Error("Não é seguro desfazer porque o recurso foi alterado depois da ação da S4X."); await ctx.client.mutate(ctx.customerId, change.collection as GoogleAdsMutableCollection, request.revert_payload as Array<Record<string, unknown>>, ctx.managerCustomerId, { validateOnly: true }); const result = await ctx.client.mutate(ctx.customerId, change.collection as GoogleAdsMutableCollection, request.revert_payload as Array<Record<string, unknown>>, ctx.managerCustomerId, { validateOnly: false }); await supabase.from("google_ads_platform_change_requests").update({ status: "reverted", reverted_at: new Date().toISOString(), google_request_id: result.requestId, updated_at: new Date().toISOString() }).eq("id", request.id).eq("status", "applied"); await audit(request.id, "reverted", input.actorId, { googleRequestId: result.requestId }); return { requestId: request.id, status: "reverted", googleRequestId: result.requestId };
  },
};
