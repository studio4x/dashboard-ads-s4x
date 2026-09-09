import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsApiError, GoogleAdsRestClient } from "@/lib/google-ads-api/client";
import { getGoogleAdsSettings } from "@/lib/google-ads-api/settings";
import { readGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";
import type { GoogleAdsApiRow } from "@/types/google-ads-api";
import type { GoogleAdsPlatformOperation as AllGoogleAdsPlatformOperation } from "@/types/google-ads-mutations";
import { isAdvancedGoogleAdsOperation } from "@/types/google-ads-mutations";
import { GoogleAdsAdvancedMutationService } from "./google-ads-advanced-mutation-service";
import { googleAdsHighRiskWritesEnabled, googleAdsWritesEnabled } from "@/lib/google-ads-api/risk-policy";

export type GoogleAdsPlatformOperation = AllGoogleAdsPlatformOperation;

export type ChangePreview = {
  requestId: string;
  previewHash: string;
  operationType: GoogleAdsPlatformOperation;
  riskLevel: "low" | "medium" | "high";
  executable: boolean;
  blockedReason: string | null;
  account: { customerId: string; customerName: string; currencyCode: string | null };
  resourceType: string;
  resourceName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  description: string;
  warnings: string[];
  reversible: boolean;
  validatedByGoogle: boolean;
};

type SourceContext = {
  sourceId: string;
  customerId: string;
  customerName: string;
  managerCustomerId: string | null;
  currencyCode: string | null;
  connectionId: string;
  client: GoogleAdsRestClient;
  writeEnabled: boolean;
};

type BuiltChange = {
  operationType: GoogleAdsPlatformOperation;
  collection: "campaignCriteria" | "adGroupCriteria" | "adGroupAds" | "adGroups" | "campaignBudgets";
  riskLevel: "low" | "medium" | "high";
  resourceType: string;
  resourceName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  operation: Record<string, unknown>;
  revertOperation: Record<string, unknown> | null;
  target: Record<string, unknown>;
  description: string;
  warnings: string[];
  executable: boolean;
  blockedReason: string | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function positiveId(value: unknown, label: string) {
  const id = digits(value);
  if (!/^\d+$/.test(id) || id === "0") throw new Error(`${label} inválido.`);
  return id;
}

function escapeGaql(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown) {
  return createHash("sha256").update(stable(value), "utf8").digest("hex");
}

function parseStatus(value: unknown) {
  const status = text(value).toUpperCase();
  if (!new Set(["ENABLED", "PAUSED"]).has(status)) throw new Error("Status permitido: ENABLED ou PAUSED.");
  return status as "ENABLED" | "PAUSED";
}

function parseNegativeMatchType(value: unknown) {
  const matchType = text(value).toUpperCase();
  if (!new Set(["EXACT", "PHRASE"]).has(matchType)) {
    throw new Error("Por segurança, negativas automáticas aceitam somente correspondência EXATA ou DE FRASE.");
  }
  return matchType as "EXACT" | "PHRASE";
}

function mutationError(error: unknown) {
  if (error instanceof GoogleAdsApiError) {
    return {
      code: error.errorCode || error.apiStatus || `HTTP_${error.statusCode}`,
      message: error.message,
      requestId: error.requestId,
    };
  }
  return { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erro desconhecido.", requestId: null };
}

async function sourceContext(sourceId: string): Promise<SourceContext> {
  const supabase = await createAdminClient({ actor: "api_admin", action: "google_ads_write_context" });
  const { data: source, error } = await supabase
    .from("data_sources")
    .select("id,status,type,google_ads_sources(data_source_id,connection_id,customer_id,customer_name,manager_customer_id,currency_code,write_enabled,google_ads_connections(id,status))")
    .eq("id", sourceId)
    .eq("type", "google_ads")
    .maybeSingle();
  if (error) throw error;
  if (!source || source.status !== "active") throw new Error("Fonte Google Ads ativa não encontrada.");

  const relation = Array.isArray(source.google_ads_sources) ? source.google_ads_sources[0] : source.google_ads_sources;
  if (!relation) throw new Error("Configuração Google Ads não encontrada.");
  const connection = Array.isArray(relation.google_ads_connections) ? relation.google_ads_connections[0] : relation.google_ads_connections;
  if (!connection || connection.status !== "active") throw new Error("Conexão Google Ads inativa ou expirada.");

  const settings = await getGoogleAdsSettings();
  return {
    sourceId,
    customerId: digits(relation.customer_id),
    customerName: text(relation.customer_name) || "Conta Google Ads",
    managerCustomerId: relation.manager_customer_id ? digits(relation.manager_customer_id) : null,
    currencyCode: relation.currency_code ? text(relation.currency_code) : null,
    connectionId: relation.connection_id,
    client: new GoogleAdsRestClient(settings, await readGoogleAdsRefreshToken(relation.connection_id)),
    writeEnabled: relation.write_enabled === true,
  };
}

async function one(ctx: SourceContext, query: string): Promise<GoogleAdsApiRow | null> {
  const result = await ctx.client.search(ctx.customerId, query, ctx.managerCustomerId);
  return result.rows[0] || null;
}

async function buildNegative(ctx: SourceContext, target: Record<string, unknown>): Promise<BuiltChange> {
  const campaignId = positiveId(target.campaignId, "ID da campanha");
  const keywordText = text(target.text).replace(/\s+/g, " ");
  const matchType = parseNegativeMatchType(target.matchType);
  if (!keywordText || keywordText.length > 80 || keywordText.split(/\s+/).length > 10) {
    throw new Error("A palavra-chave negativa deve ter entre 1 e 80 caracteres e no máximo 10 palavras.");
  }

  const campaignRow = await one(ctx, `SELECT campaign.resource_name, campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.id = ${campaignId} LIMIT 1`);
  const campaign = object(campaignRow?.campaign);
  if (!text(campaign.resourceName)) throw new Error("Campanha não encontrada na conta Google Ads.");

  const negatives = await ctx.client.search(
    ctx.customerId,
    `SELECT campaign_criterion.resource_name, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign_criterion.negative FROM campaign_criterion WHERE campaign.id = ${campaignId} AND campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD'`,
    ctx.managerCustomerId,
  );
  const duplicate = negatives.rows.find((row) => {
    const criterion = object(row.campaignCriterion);
    const keyword = object(criterion.keyword);
    return text(keyword.text).toLocaleLowerCase("pt-BR") === keywordText.toLocaleLowerCase("pt-BR") && text(keyword.matchType).toUpperCase() === matchType;
  });
  if (duplicate) throw new Error("Essa negativa já existe nessa campanha com a mesma correspondência.");

  const operation = {
    create: {
      campaign: text(campaign.resourceName),
      negative: true,
      keyword: { text: keywordText, matchType },
    },
  };
  return {
    operationType: "add_campaign_negative_keyword",
    collection: "campaignCriteria",
    riskLevel: matchType === "EXACT" ? "low" : "medium",
    resourceType: "campaign_negative_keyword",
    resourceName: null,
    before: { exists: false, campaignId, campaignName: text(campaign.name), campaignStatus: text(campaign.status) },
    after: { exists: true, campaignId, campaignName: text(campaign.name), text: keywordText, matchType, negative: true },
    operation,
    revertOperation: null,
    target: { campaignId, text: keywordText, matchType },
    description: `Adicionar “${keywordText}” como negativa ${matchType === "EXACT" ? "exata" : "de frase"} na campanha ${text(campaign.name)}.`,
    warnings: matchType === "PHRASE" ? ["Negativa de frase pode bloquear uma família maior de pesquisas. Revise o alcance antes de confirmar."] : [],
    executable: true,
    blockedReason: null,
  };
}

async function buildKeywordStatus(ctx: SourceContext, target: Record<string, unknown>): Promise<BuiltChange> {
  const adGroupId = positiveId(target.adGroupId, "ID do grupo de anúncios");
  const criterionId = positiveId(target.criterionId, "ID da palavra-chave");
  const status = parseStatus(target.status);
  const row = await one(ctx, `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.resource_name, ad_group_criterion.criterion_id, ad_group_criterion.status, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type FROM ad_group_criterion WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.criterion_id = ${criterionId} LIMIT 1`);
  const criterion = object(row?.adGroupCriterion);
  const keyword = object(criterion.keyword);
  const resourceName = text(criterion.resourceName);
  if (!resourceName || !text(keyword.text)) throw new Error("Palavra-chave não encontrada no Google Ads.");
  const currentStatus = text(criterion.status).toUpperCase();
  if (currentStatus === status) throw new Error(`A palavra-chave já está ${status === "PAUSED" ? "pausada" : "ativa"}.`);
  if (!new Set(["ENABLED", "PAUSED"]).has(currentStatus)) throw new Error("O estado atual da palavra-chave não permite essa alteração segura.");

  return {
    operationType: "set_keyword_status",
    collection: "adGroupCriteria",
    riskLevel: status === "PAUSED" ? "medium" : "low",
    resourceType: "keyword",
    resourceName,
    before: { resourceName, status: currentStatus, text: text(keyword.text), matchType: text(keyword.matchType), adGroupId, adGroupName: text(object(row?.adGroup).name), campaignId: text(object(row?.campaign).id), campaignName: text(object(row?.campaign).name) },
    after: { resourceName, status },
    operation: { update: { resourceName, status }, updateMask: "status" },
    revertOperation: { update: { resourceName, status: currentStatus }, updateMask: "status" },
    target: { adGroupId, criterionId, status },
    description: `${status === "PAUSED" ? "Pausar" : "Ativar"} a palavra-chave “${text(keyword.text)}”.`,
    warnings: status === "PAUSED" ? ["Pausar uma palavra-chave pode reduzir volume. Confirme que a decisão está sustentada por intenção e volume suficientes."] : [],
    executable: true,
    blockedReason: null,
  };
}

async function buildAdStatus(ctx: SourceContext, target: Record<string, unknown>): Promise<BuiltChange> {
  const adGroupId = positiveId(target.adGroupId, "ID do grupo de anúncios");
  const adId = positiveId(target.adId, "ID do anúncio");
  const status = parseStatus(target.status);
  const row = await one(ctx, `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.resource_name, ad_group_ad.status, ad_group_ad.ad.id, ad_group_ad.ad.type FROM ad_group_ad WHERE ad_group.id = ${adGroupId} AND ad_group_ad.ad.id = ${adId} LIMIT 1`);
  const entity = object(row?.adGroupAd);
  const ad = object(entity.ad);
  const resourceName = text(entity.resourceName);
  const currentStatus = text(entity.status).toUpperCase();
  if (!resourceName) throw new Error("Anúncio não encontrado no Google Ads.");
  if (currentStatus === status) throw new Error(`O anúncio já está ${status === "PAUSED" ? "pausado" : "ativo"}.`);
  if (!new Set(["ENABLED", "PAUSED"]).has(currentStatus)) throw new Error("O estado atual do anúncio não permite essa alteração segura.");

  return {
    operationType: "set_ad_status",
    collection: "adGroupAds",
    riskLevel: "medium",
    resourceType: "ad",
    resourceName,
    before: { resourceName, status: currentStatus, adId, adType: text(ad.type), adGroupId, adGroupName: text(object(row?.adGroup).name), campaignId: text(object(row?.campaign).id), campaignName: text(object(row?.campaign).name) },
    after: { resourceName, status },
    operation: { update: { resourceName, status }, updateMask: "status" },
    revertOperation: { update: { resourceName, status: currentStatus }, updateMask: "status" },
    target: { adGroupId, adId, status },
    description: `${status === "PAUSED" ? "Pausar" : "Ativar"} o anúncio ${adId}.`,
    warnings: ["Confirme que existe alternativa ativa no mesmo grupo antes de pausar um anúncio."],
    executable: true,
    blockedReason: null,
  };
}

async function buildAdGroupStatus(ctx: SourceContext, target: Record<string, unknown>): Promise<BuiltChange> {
  const adGroupId = positiveId(target.adGroupId, "ID do grupo de anúncios");
  const status = parseStatus(target.status);
  const row = await one(ctx, `SELECT campaign.id, campaign.name, ad_group.resource_name, ad_group.id, ad_group.name, ad_group.status FROM ad_group WHERE ad_group.id = ${adGroupId} LIMIT 1`);
  const entity = object(row?.adGroup);
  const resourceName = text(entity.resourceName);
  const currentStatus = text(entity.status).toUpperCase();
  if (!resourceName) throw new Error("Grupo de anúncios não encontrado no Google Ads.");
  if (currentStatus === status) throw new Error(`O grupo já está ${status === "PAUSED" ? "pausado" : "ativo"}.`);
  if (!new Set(["ENABLED", "PAUSED"]).has(currentStatus)) throw new Error("O estado atual do grupo não permite essa alteração segura.");

  return {
    operationType: "set_ad_group_status",
    collection: "adGroups",
    riskLevel: "medium",
    resourceType: "ad_group",
    resourceName,
    before: { resourceName, status: currentStatus, adGroupId, adGroupName: text(entity.name), campaignId: text(object(row?.campaign).id), campaignName: text(object(row?.campaign).name) },
    after: { resourceName, status },
    operation: { update: { resourceName, status }, updateMask: "status" },
    revertOperation: { update: { resourceName, status: currentStatus }, updateMask: "status" },
    target: { adGroupId, status },
    description: `${status === "PAUSED" ? "Pausar" : "Ativar"} o grupo “${text(entity.name)}”.`,
    warnings: status === "PAUSED" ? ["Pausar o grupo interrompe todos os anúncios e palavras-chave contidos nele."] : [],
    executable: true,
    blockedReason: null,
  };
}

async function buildBudget(ctx: SourceContext, target: Record<string, unknown>): Promise<BuiltChange> {
  const campaignId = positiveId(target.campaignId, "ID da campanha");
  const amount = Number(target.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Novo orçamento diário inválido.");
  const row = await one(ctx, `SELECT campaign.id, campaign.name, campaign.status, campaign.campaign_budget, campaign_budget.resource_name, campaign_budget.amount_micros, campaign_budget.period, campaign_budget.reference_count FROM campaign_budget WHERE campaign.id = ${campaignId} LIMIT 1`);
  const campaign = object(row?.campaign);
  const budget = object(row?.campaignBudget);
  const resourceName = text(budget.resourceName || campaign.campaignBudget);
  const currentMicros = Number(budget.amountMicros || 0);
  const currentAmount = currentMicros / 1_000_000;
  const referenceCount = Number(budget.referenceCount || 0);
  if (!resourceName || !Number.isFinite(currentAmount) || currentAmount <= 0) throw new Error("Orçamento atual da campanha não pôde ser confirmado no Google Ads.");
  if (text(budget.period).toUpperCase() && text(budget.period).toUpperCase() !== "DAILY") throw new Error("Esta primeira versão só altera orçamentos diários.");
  if (Math.abs(amount - currentAmount) < 0.005) throw new Error("O novo orçamento é igual ao orçamento atual.");
  const changePct = ((amount - currentAmount) / currentAmount) * 100;
  const shared = referenceCount > 1;
  const tooLarge = Math.abs(changePct) > 30;
  const blockedReason = shared
    ? `Este orçamento é compartilhado por ${referenceCount} campanhas. A alteração direta foi bloqueada para evitar impacto cruzado.`
    : tooLarge
      ? `A alteração é de ${Math.abs(changePct).toFixed(1).replace(".", ",")}% e ultrapassa o limite de segurança de 30% por operação.`
      : null;
  const riskLevel: "medium" | "high" = blockedReason ? "high" : "medium";
  const newMicros = Math.round(amount * 1_000_000);

  return {
    operationType: "set_campaign_budget",
    collection: "campaignBudgets",
    riskLevel,
    resourceType: "campaign_budget",
    resourceName,
    before: { resourceName, amount: currentAmount, amountMicros: String(Math.round(currentMicros)), campaignId, campaignName: text(campaign.name), referenceCount },
    after: { resourceName, amount, amountMicros: String(newMicros), changePercent: changePct },
    operation: { update: { resourceName, amountMicros: String(newMicros) }, updateMask: "amount_micros" },
    revertOperation: { update: { resourceName, amountMicros: String(Math.round(currentMicros)) }, updateMask: "amount_micros" },
    target: { campaignId, amount },
    description: `Alterar o orçamento diário de ${currentAmount.toLocaleString("pt-BR", { style: "currency", currency: ctx.currencyCode || "BRL" })} para ${amount.toLocaleString("pt-BR", { style: "currency", currency: ctx.currencyCode || "BRL" })} na campanha ${text(campaign.name)}.`,
    warnings: [
      `Variação de ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1).replace(".", ",")}% sobre o orçamento atual.`,
      "Mudanças de orçamento podem alterar ritmo de entrega e aprendizado. Evite várias mudanças em sequência.",
    ],
    executable: !blockedReason,
    blockedReason,
  };
}

async function build(ctx: SourceContext, operationType: GoogleAdsPlatformOperation, target: Record<string, unknown>) {
  if (operationType === "add_campaign_negative_keyword") return buildNegative(ctx, target);
  if (operationType === "set_keyword_status") return buildKeywordStatus(ctx, target);
  if (operationType === "set_ad_status") return buildAdStatus(ctx, target);
  if (operationType === "set_ad_group_status") return buildAdGroupStatus(ctx, target);
  if (operationType === "set_campaign_budget") return buildBudget(ctx, target);
  throw new Error("Tipo de alteração não suportado.");
}

async function audit(changeRequestId: string, eventType: string, actorId: string | null, payload: Record<string, unknown>) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "audit_google_ads_change" });
  await supabase.from("google_ads_platform_change_audit").insert({ change_request_id: changeRequestId, event_type: eventType, actor_id: actorId, payload });
}

function previewHash(ctx: SourceContext, change: BuiltChange) {
  return hash({ customerId: ctx.customerId, operationType: change.operationType, target: change.target, before: change.before, after: change.after });
}

function extractMutatedResourceName(body: unknown) {
  const results = Array.isArray(object(body).results) ? object(body).results as unknown[] : [];
  const first = object(results[0]);
  return text(first.resourceName) || null;
}

async function readBackLegacy(ctx: SourceContext, change: BuiltChange) {
  try {
    const target = change.target;
    const status = text(target.status).toUpperCase();
    let query: string;
    if (change.operationType === "add_campaign_negative_keyword") query = `SELECT campaign_criterion.resource_name FROM campaign_criterion WHERE campaign.id = ${digits(target.campaignId)} AND campaign_criterion.negative = TRUE AND campaign_criterion.keyword.text = '${escapeGaql(text(target.text))}' LIMIT 1`;
    else if (change.operationType === "set_keyword_status") query = `SELECT ad_group_criterion.status FROM ad_group_criterion WHERE ad_group.id = ${digits(target.adGroupId)} AND ad_group_criterion.criterion_id = ${digits(target.criterionId)} LIMIT 1`;
    else if (change.operationType === "set_ad_status") query = `SELECT ad_group_ad.status FROM ad_group_ad WHERE ad_group.id = ${digits(target.adGroupId)} AND ad_group_ad.ad.id = ${digits(target.adId)} LIMIT 1`;
    else if (change.operationType === "set_ad_group_status") query = `SELECT ad_group.status FROM ad_group WHERE ad_group.id = ${digits(target.adGroupId)} LIMIT 1`;
    else query = `SELECT campaign_budget.amount_micros FROM campaign_budget WHERE campaign.id = ${digits(target.campaignId)} LIMIT 1`;
    const row = object(await one(ctx, query));
    if (change.operationType === "add_campaign_negative_keyword") return Boolean(object(row.campaignCriterion).resourceName);
    if (change.operationType === "set_campaign_budget") return String(object(row.campaignBudget).amountMicros || "") === String(change.after.amountMicros || "");
    const entity = change.operationType === "set_keyword_status" ? row.adGroupCriterion : change.operationType === "set_ad_status" ? row.adGroupAd : row.adGroup;
    return text(object(entity).status).toUpperCase() === status;
  } catch {
    return false;
  }
}

export const GoogleAdsMutationService = {
  async preview(input: { sourceId: string; operationType: GoogleAdsPlatformOperation; target: Record<string, unknown>; origin: string; actorId: string | null }): Promise<ChangePreview> {
    if (isAdvancedGoogleAdsOperation(input.operationType)) return GoogleAdsAdvancedMutationService.preview(input as { sourceId: string; operationType: import("@/types/google-ads-mutations").GoogleAdsAdvancedOperation; target: Record<string, unknown>; origin: string; actorId: string | null }) as unknown as ChangePreview;
    const ctx = await sourceContext(input.sourceId);
    const change = await build(ctx, input.operationType, input.target);
    const pHash = previewHash(ctx, change);

    if (!change.executable) {
      return {
        requestId: "",
        previewHash: pHash,
        operationType: change.operationType,
        riskLevel: change.riskLevel,
        executable: false,
        blockedReason: change.blockedReason,
        account: { customerId: ctx.customerId, customerName: ctx.customerName, currencyCode: ctx.currencyCode },
        resourceType: change.resourceType,
        resourceName: change.resourceName,
        before: change.before,
        after: change.after,
        description: change.description,
        warnings: change.warnings,
        reversible: Boolean(change.revertOperation),
        validatedByGoogle: false,
      };
    }

    // Pré-valida no Google sem executar nenhuma alteração.
    await ctx.client.mutate(ctx.customerId, change.collection, [change.operation], ctx.managerCustomerId, { validateOnly: true });

    const supabase = await createAdminClient({ actor: "api_admin", action: "preview_google_ads_change" });
    const idempotencyKey = hash({ sourceId: ctx.sourceId, operationType: change.operationType, target: change.target, before: change.before });
    const requestPayload = {
      data_source_id: ctx.sourceId,
      origin: input.origin,
      operation_type: change.operationType,
      risk_level: change.riskLevel,
      resource_type: change.resourceType,
      resource_name: change.resourceName,
      target: change.target,
      before_state: change.before,
      after_state: change.after,
      preview_hash: pHash,
      status: "validated",
      idempotency_key: idempotencyKey,
      revertible: Boolean(change.revertOperation),
      revert_payload: change.revertOperation,
      created_by: input.actorId,
      validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    };
    const { data: inserted, error } = await supabase
      .from("google_ads_platform_change_requests")
      .upsert(requestPayload, { onConflict: "idempotency_key", ignoreDuplicates: false })
      .select("id")
      .single();
    if (error) throw error;
    await audit(inserted.id, "validated", input.actorId, { origin: input.origin, description: change.description, riskLevel: change.riskLevel, target: change.target, previewHash: pHash });

    return {
      requestId: inserted.id,
      previewHash: pHash,
      operationType: change.operationType,
      riskLevel: change.riskLevel,
      executable: true,
      blockedReason: null,
      account: { customerId: ctx.customerId, customerName: ctx.customerName, currencyCode: ctx.currencyCode },
      resourceType: change.resourceType,
      resourceName: change.resourceName,
      before: change.before,
      after: change.after,
      description: change.description,
      warnings: change.warnings,
      reversible: Boolean(change.revertOperation),
      validatedByGoogle: true,
    };
  },

  async execute(input: { requestId: string; previewHash: string; actorId: string | null; confirmation?: string; actorRole?: string | null }) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "execute_google_ads_change" });
    const { data: request, error } = await supabase
      .from("google_ads_platform_change_requests")
      .select("*")
      .eq("id", input.requestId)
      .maybeSingle();
    if (error) throw error;
    if (!request) throw new Error("Solicitação de alteração não encontrada.");
    if (request.status === "applied") return { requestId: request.id, status: "applied", googleRequestId: request.google_request_id, alreadyApplied: true };
    if (isAdvancedGoogleAdsOperation(String(request.operation_type))) return GoogleAdsAdvancedMutationService.execute({ requestId: input.requestId, previewHash: input.previewHash, confirmation: input.confirmation || "", actorId: input.actorId, actorRole: input.actorRole });
    if (request.status !== "validated") throw new Error(`A solicitação não pode ser executada no estado ${request.status}.`);
    if (text(request.preview_hash) !== text(input.previewHash)) throw new Error("A confirmação não corresponde à pré-visualização atual.");
    if (request.risk_level === "high") throw new Error("Alterações de alto risco não podem ser executadas diretamente nesta versão.");

    const ctx = await sourceContext(request.data_source_id);
    if (!googleAdsWritesEnabled() || !ctx.writeEnabled) throw new Error("Alterações reais estão desativadas. Habilite a trava global e a escrita da fonte para executar.");
    if (!googleAdsHighRiskWritesEnabled() && request.risk_level === "high") throw new Error("Alterações de alto risco estão desativadas pela trava GOOGLE_ADS_HIGH_RISK_WRITES_ENABLED.");
    if (request.risk_level === "high" && String(input.confirmation || "").toUpperCase() !== "CONFIRMAR ALTERAÇÃO DE LANCES") throw new Error("Digite exatamente “CONFIRMAR ALTERAÇÃO DE LANCES” para confirmar esta alteração.");
    const rebuilt = await build(ctx, request.operation_type as GoogleAdsPlatformOperation, object(request.target));
    const currentHash = previewHash(ctx, rebuilt);
    if (currentHash !== request.preview_hash) {
      await supabase.from("google_ads_platform_change_requests").update({ status: "stale", updated_at: new Date().toISOString(), error_code: "STALE_PREVIEW", error_message: "O estado do Google Ads mudou depois da pré-visualização." }).eq("id", request.id).eq("status", "validated");
      await audit(request.id, "stale", input.actorId, { expected: request.preview_hash, actual: currentHash });
      const stale = new Error("Os dados da conta mudaram desde a pré-visualização. Gere a prévia novamente antes de aplicar.");
      stale.name = "STALE_PREVIEW";
      throw stale;
    }

    const { data: locked, error: lockError } = await supabase
      .from("google_ads_platform_change_requests")
      .update({ status: "executing", approved_by: input.actorId, updated_at: new Date().toISOString() })
      .eq("id", request.id)
      .eq("status", "validated")
      .select("id")
      .maybeSingle();
    if (lockError) throw lockError;
    if (!locked) throw new Error("Esta alteração já está sendo processada por outra solicitação.");
    await audit(request.id, "approved", input.actorId, { previewHash: input.previewHash });

    try {
      // Segunda validação imediatamente antes da escrita real.
      await ctx.client.mutate(ctx.customerId, rebuilt.collection, [rebuilt.operation], ctx.managerCustomerId, { validateOnly: true });
      const result = await ctx.client.mutate(ctx.customerId, rebuilt.collection, [rebuilt.operation], ctx.managerCustomerId, { validateOnly: false });
      const postWriteVerified = await readBackLegacy(ctx, rebuilt);
      const createdResourceName = rebuilt.operationType === "add_campaign_negative_keyword" ? extractMutatedResourceName(result.body) : null;
      const revertPayload = createdResourceName ? { remove: createdResourceName } : rebuilt.revertOperation;
      await supabase.from("google_ads_platform_change_requests").update({
        status: "applied",
        approved_by: input.actorId,
        executed_at: new Date().toISOString(),
        google_request_id: result.requestId,
        resource_name: createdResourceName || rebuilt.resourceName,
        revertible: Boolean(revertPayload),
        revert_payload: revertPayload,
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      }).eq("id", request.id).eq("status", "executing");
      await audit(request.id, "applied", input.actorId, { googleRequestId: result.requestId, resourceName: createdResourceName || rebuilt.resourceName, after: rebuilt.after, postWriteVerified });
      return { requestId: request.id, status: "applied", googleRequestId: result.requestId, postWriteVerified, alreadyApplied: false };
    } catch (mutationFailure) {
      const failure = mutationError(mutationFailure);
      await supabase.from("google_ads_platform_change_requests").update({ status: "failed", error_code: failure.code, error_message: failure.message.slice(0, 1800), google_request_id: failure.requestId, updated_at: new Date().toISOString() }).eq("id", request.id);
      await audit(request.id, "failed", input.actorId, failure as unknown as Record<string, unknown>);
      throw mutationFailure;
    }
  },

  async revert(input: { requestId: string; actorId: string | null }) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "revert_google_ads_change" });
    const { data: request, error } = await supabase.from("google_ads_platform_change_requests").select("*").eq("id", input.requestId).maybeSingle();
    if (error) throw error;
    if (!request) throw new Error("Alteração não encontrada.");
    if (isAdvancedGoogleAdsOperation(String(request.operation_type))) return GoogleAdsAdvancedMutationService.revert(input);
    if (request.status !== "applied") throw new Error("Somente alterações aplicadas podem ser revertidas.");
    if (!request.revertible || !request.revert_payload) throw new Error("Essa alteração não possui reversão segura disponível.");

    const ctx = await sourceContext(request.data_source_id);
    if (!googleAdsWritesEnabled() || !ctx.writeEnabled) throw new Error("Alterações reais estão desativadas. Habilite a trava global e a escrita da fonte para executar.");
    const collectionByOperation: Record<string, BuiltChange["collection"]> = {
      add_campaign_negative_keyword: "campaignCriteria",
      set_keyword_status: "adGroupCriteria",
      set_ad_status: "adGroupAds",
      set_ad_group_status: "adGroups",
      set_campaign_budget: "campaignBudgets",
    };
    const collection = collectionByOperation[String(request.operation_type)];
    if (!collection) throw new Error("Tipo de alteração sem regra de reversão.");
    const revertOperation = object(request.revert_payload);
    await ctx.client.mutate(ctx.customerId, collection, [revertOperation], ctx.managerCustomerId, { validateOnly: true });
    try {
      const result = await ctx.client.mutate(ctx.customerId, collection, [revertOperation], ctx.managerCustomerId, { validateOnly: false });
      await supabase.from("google_ads_platform_change_requests").update({ status: "reverted", reverted_at: new Date().toISOString(), updated_at: new Date().toISOString(), google_request_id: result.requestId }).eq("id", request.id).eq("status", "applied");
      await audit(request.id, "reverted", input.actorId, { googleRequestId: result.requestId });
      return { requestId: request.id, status: "reverted", googleRequestId: result.requestId };
    } catch (mutationFailure) {
      const failure = mutationError(mutationFailure);
      await audit(request.id, "revert_failed", input.actorId, failure as unknown as Record<string, unknown>);
      throw mutationFailure;
    }
  },

  async history(sourceId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_google_ads_platform_changes" });
    const { data, error } = await supabase
      .from("google_ads_platform_change_requests")
      .select("id,operation_type,risk_level,resource_type,resource_name,target,before_state,after_state,status,revertible,validated_at,executed_at,reverted_at,google_request_id,error_code,error_message,created_at,updated_at")
      .eq("data_source_id", sourceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  },
};
