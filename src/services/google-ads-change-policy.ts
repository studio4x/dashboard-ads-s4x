import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsRestClient } from "@/lib/google-ads-api/client";
import { getGoogleAdsSettings } from "@/lib/google-ads-api/settings";
import { readGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";
import type { GoogleAdsPlatformOperation } from "@/services/google-ads-mutation-service";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

type Context = {
  customerId: string;
  managerCustomerId: string | null;
  client: GoogleAdsRestClient;
};

async function context(sourceId: string): Promise<Context> {
  const supabase = await createAdminClient({ actor: "api_admin", action: "google_ads_change_policy" });
  const { data: source, error } = await supabase
    .from("data_sources")
    .select("id,status,type,google_ads_sources(connection_id,customer_id,manager_customer_id,google_ads_connections(id,status))")
    .eq("id", sourceId)
    .eq("type", "google_ads")
    .maybeSingle();
  if (error) throw error;
  if (!source || source.status !== "active") throw new Error("Fonte Google Ads ativa não encontrada.");
  const config = Array.isArray(source.google_ads_sources) ? source.google_ads_sources[0] : source.google_ads_sources;
  if (!config) throw new Error("Configuração Google Ads não encontrada.");
  const connection = Array.isArray(config.google_ads_connections) ? config.google_ads_connections[0] : config.google_ads_connections;
  if (!connection || connection.status !== "active") throw new Error("Conexão Google Ads inativa.");
  const settings = await getGoogleAdsSettings();
  return {
    customerId: digits(config.customer_id),
    managerCustomerId: config.manager_customer_id ? digits(config.manager_customer_id) : null,
    client: new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(config.connection_id)),
  };
}

function isPause(target: Record<string, unknown>) {
  return text(target.status).toUpperCase() === "PAUSED";
}

function id(value: unknown, label: string) {
  const result = digits(value);
  if (!/^\d+$/.test(result) || result === "0") throw new Error(`${label} inválido.`);
  return result;
}

/**
 * Guardas de negócio adicionais às validações da própria API do Google.
 * O objetivo é evitar que uma ação aparentemente simples desligue a entrega
 * inteira de um grupo/campanha por acidente.
 */
export async function assertGoogleAdsChangePolicy(
  sourceId: string,
  operationType: GoogleAdsPlatformOperation,
  target: Record<string, unknown>,
) {
  if (!isPause(target)) return;
  if (!new Set<GoogleAdsPlatformOperation>(["set_keyword_status", "set_ad_status", "set_ad_group_status"]).has(operationType)) return;

  const ctx = await context(sourceId);

  if (operationType === "set_keyword_status") {
    const adGroupId = id(target.adGroupId, "ID do grupo");
    const criterionId = id(target.criterionId, "ID da palavra-chave");
    const result = await ctx.client.search(
      ctx.customerId,
      `SELECT ad_group_criterion.criterion_id, ad_group_criterion.status, ad_group_criterion.keyword.text FROM ad_group_criterion WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status = 'ENABLED'`,
      ctx.managerCustomerId,
    );
    const enabledIds = result.rows.map((row) => text(object(row.adGroupCriterion).criterionId));
    if (enabledIds.includes(criterionId) && enabledIds.length <= 1) {
      throw new Error("Esta é a última palavra-chave ativa do grupo. A pausa direta foi bloqueada para evitar interromper a segmentação do grupo inteiro.");
    }
    return;
  }

  if (operationType === "set_ad_status") {
    const adGroupId = id(target.adGroupId, "ID do grupo");
    const adId = id(target.adId, "ID do anúncio");
    const result = await ctx.client.search(
      ctx.customerId,
      `SELECT ad_group_ad.ad.id, ad_group_ad.status FROM ad_group_ad WHERE ad_group.id = ${adGroupId} AND ad_group_ad.status = 'ENABLED'`,
      ctx.managerCustomerId,
    );
    const enabledIds = result.rows.map((row) => text(object(object(row.adGroupAd).ad).id));
    if (enabledIds.includes(adId) && enabledIds.length <= 1) {
      throw new Error("Este é o último anúncio ativo do grupo. A pausa foi bloqueada para evitar deixar o grupo sem anúncio elegível.");
    }
    return;
  }

  if (operationType === "set_ad_group_status") {
    const adGroupId = id(target.adGroupId, "ID do grupo");
    const targetResult = await ctx.client.search(
      ctx.customerId,
      `SELECT campaign.id, ad_group.id, ad_group.status FROM ad_group WHERE ad_group.id = ${adGroupId} LIMIT 1`,
      ctx.managerCustomerId,
    );
    const targetRow = targetResult.rows[0];
    const campaignId = text(object(targetRow?.campaign).id);
    if (!campaignId) throw new Error("Não foi possível confirmar a campanha do grupo antes da pausa.");
    const result = await ctx.client.search(
      ctx.customerId,
      `SELECT ad_group.id, ad_group.status FROM ad_group WHERE campaign.id = ${campaignId} AND ad_group.status = 'ENABLED'`,
      ctx.managerCustomerId,
    );
    const enabledIds = result.rows.map((row) => text(object(row.adGroup).id));
    if (enabledIds.includes(adGroupId) && enabledIds.length <= 1) {
      throw new Error("Este é o último grupo de anúncios ativo da campanha. A pausa direta foi bloqueada para evitar interromper toda a entrega da campanha.");
    }
  }
}

export async function assertStoredGoogleAdsChangePolicy(requestId: string) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "google_ads_stored_change_policy" });
  const { data: request, error } = await supabase
    .from("google_ads_platform_change_requests")
    .select("data_source_id,operation_type,target,status")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!request) throw new Error("Solicitação de alteração não encontrada.");
  if (request.status !== "validated") return;
  await assertGoogleAdsChangePolicy(
    request.data_source_id,
    request.operation_type as GoogleAdsPlatformOperation,
    object(request.target),
  );
}
