import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsRestClient } from "@/lib/google-ads-api/client";
import { getGoogleAdsSettings } from "@/lib/google-ads-api/settings";
import { readGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function escapeGaql(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function assertGoogleAdsRevertSafe(requestId: string) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "guard_google_ads_revert" });
  const { data: request, error } = await supabase
    .from("google_ads_platform_change_requests")
    .select("id,data_source_id,operation_type,status,resource_name,target,after_state")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!request || request.status !== "applied") throw new Error("A alteração não está disponível para reversão.");

  const { data: source, error: sourceError } = await supabase
    .from("data_sources")
    .select("id,status,type,google_ads_sources(connection_id,customer_id,manager_customer_id,google_ads_connections(id,status))")
    .eq("id", request.data_source_id)
    .eq("type", "google_ads")
    .maybeSingle();
  if (sourceError) throw sourceError;
  if (!source || source.status !== "active") throw new Error("Fonte Google Ads ativa não encontrada.");
  const config = Array.isArray(source.google_ads_sources) ? source.google_ads_sources[0] : source.google_ads_sources;
  if (!config) throw new Error("Configuração Google Ads não encontrada.");
  const connection = Array.isArray(config.google_ads_connections) ? config.google_ads_connections[0] : config.google_ads_connections;
  if (!connection || connection.status !== "active") throw new Error("Conexão Google Ads inativa.");

  const settings = await getGoogleAdsSettings();
  const client = new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(config.connection_id));
  const customerId = digits(config.customer_id);
  const loginCustomerId = config.manager_customer_id ? digits(config.manager_customer_id) : null;
  const target = object(request.target);
  const expected = object(request.after_state);

  const first = async (query: string) => {
    const result = await client.search(customerId, query, loginCustomerId);
    return result.rows[0] || null;
  };

  if (request.operation_type === "add_campaign_negative_keyword") {
    const resourceName = text(request.resource_name);
    if (!resourceName) throw new Error("A negativa criada não possui recurso confirmado para reversão.");
    const row = await first(`SELECT campaign_criterion.resource_name FROM campaign_criterion WHERE campaign_criterion.resource_name = '${escapeGaql(resourceName)}' LIMIT 1`);
    if (!row?.campaignCriterion) throw new Error("A negativa já não existe no Google Ads. A reversão foi bloqueada.");
    return;
  }

  if (request.operation_type === "set_keyword_status") {
    const adGroupId = digits(target.adGroupId);
    const criterionId = digits(target.criterionId);
    const row = await first(`SELECT ad_group_criterion.status FROM ad_group_criterion WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.criterion_id = ${criterionId} LIMIT 1`);
    const current = text(object(row?.adGroupCriterion).status).toUpperCase();
    if (!current || current !== text(expected.status).toUpperCase()) throw new Error("O status da palavra-chave mudou depois da alteração. Para segurança, o desfazer automático foi bloqueado.");
    return;
  }

  if (request.operation_type === "set_ad_status") {
    const adGroupId = digits(target.adGroupId);
    const adId = digits(target.adId);
    const row = await first(`SELECT ad_group_ad.status FROM ad_group_ad WHERE ad_group.id = ${adGroupId} AND ad_group_ad.ad.id = ${adId} LIMIT 1`);
    const current = text(object(row?.adGroupAd).status).toUpperCase();
    if (!current || current !== text(expected.status).toUpperCase()) throw new Error("O status do anúncio mudou depois da alteração. Para segurança, o desfazer automático foi bloqueado.");
    return;
  }

  if (request.operation_type === "set_ad_group_status") {
    const adGroupId = digits(target.adGroupId);
    const row = await first(`SELECT ad_group.status FROM ad_group WHERE ad_group.id = ${adGroupId} LIMIT 1`);
    const current = text(object(row?.adGroup).status).toUpperCase();
    if (!current || current !== text(expected.status).toUpperCase()) throw new Error("O status do grupo mudou depois da alteração. Para segurança, o desfazer automático foi bloqueado.");
    return;
  }

  if (request.operation_type === "set_campaign_budget") {
    const campaignId = digits(target.campaignId);
    const row = await first(`SELECT campaign_budget.amount_micros FROM campaign_budget WHERE campaign.id = ${campaignId} LIMIT 1`);
    const currentMicros = Number(object(row?.campaignBudget).amountMicros || 0);
    const expectedMicros = Number(expected.amountMicros || 0);
    if (!Number.isFinite(currentMicros) || !Number.isFinite(expectedMicros) || currentMicros !== expectedMicros) {
      throw new Error("O orçamento foi alterado novamente depois da aplicação. Para evitar sobrescrever uma mudança posterior, o desfazer automático foi bloqueado.");
    }
    return;
  }

  throw new Error("Tipo de alteração sem regra segura de reversão.");
}
