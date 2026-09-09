import type { GoogleAdsPlatformOperation, GoogleAdsRiskLevel } from "@/types/google-ads-mutations";

export type OptimizationAnalyticsRow = {
  observed_date: string;
  dimensions: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  raw_row?: Record<string, unknown> | null;
};

export type OptimizationConfigRow = {
  config_type: string;
  resource_name: string;
  campaign_id: string | null;
  payload: Record<string, unknown> | null;
  observed_at: string;
};

export type GoogleAdsAutomationReadiness = "ready" | "review" | "wait" | "manual";
export type GoogleAdsAutomationGroup = "keywords" | "ads" | "segmentation" | "budget_bidding" | "assets";
export type GoogleAdsAutomationEditor = "rsa_draft" | "schedule_review" | "asset_draft";

export type GoogleAdsAutomationCampaign = {
  id: string;
  resourceName: string;
  name: string;
  status: string;
  channelType: string;
  biddingStrategyType: string;
  budget: number | null;
  cost: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  cpa: number | null;
  roas: number | null;
  budgetLost: number | null;
  rankLost: number | null;
  targetCpaMicros: number | null;
  targetRoas: number | null;
};

export type GoogleAdsAutomationAdGroup = {
  id: string;
  campaignId: string;
  campaignName: string;
  name: string;
  status: string;
};

export type GoogleAdsAutomationKeyword = {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  criterionId: string;
  text: string;
  matchType: string;
  status: string;
  clicks: number;
  cost: number;
  conversions: number;
  qualityScore: number | null;
};

export type GoogleAdsAutomationAd = {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  id: string;
  name: string;
  status: string;
  type: string;
  headlines: string[];
  descriptions: string[];
  finalUrls: string[];
  finalMobileUrls: string[];
  clicks: number;
  cost: number;
  conversions: number;
};

export type GoogleAdsAutomationAsset = {
  campaignId: string;
  campaignName: string;
  id: string;
  resourceName: string;
  name: string;
  type: string;
  fieldType: string;
  text: string;
};

export type GoogleAdsAutomationConversionAction = {
  resourceName: string;
  name: string;
  status: string;
  category: string;
  primaryForGoal: boolean;
  includeInConversionsMetric: boolean;
};

export type GoogleAdsAutomationAction = {
  id: string;
  group: GoogleAdsAutomationGroup;
  title: string;
  reason: string;
  evidence: string;
  readiness: GoogleAdsAutomationReadiness;
  riskLevel: GoogleAdsRiskLevel;
  campaignId: string | null;
  campaignName: string | null;
  operationType?: GoogleAdsPlatformOperation;
  target?: Record<string, unknown>;
  editor?: GoogleAdsAutomationEditor;
};

export type GoogleAdsAutomationContext = {
  period: { start: string; end: string; days: number };
  account: { customerId: string; customerName: string; currencyCode: string; timezone: string };
  campaigns: GoogleAdsAutomationCampaign[];
  adGroups: GoogleAdsAutomationAdGroup[];
  keywords: GoogleAdsAutomationKeyword[];
  ads: GoogleAdsAutomationAd[];
  assets: GoogleAdsAutomationAsset[];
  assetInventoryAvailable: boolean;
  conversionActions: GoogleAdsAutomationConversionAction[];
  actions: GoogleAdsAutomationAction[];
};

type BuildInput = {
  period: { start: string; end: string };
  account: GoogleAdsAutomationContext["account"];
  campaignRows: OptimizationAnalyticsRow[];
  adGroupRows: OptimizationAnalyticsRow[];
  keywordRows: OptimizationAnalyticsRow[];
  searchRows: OptimizationAnalyticsRow[];
  adRows: OptimizationAnalyticsRow[];
  timeRows: OptimizationAnalyticsRow[];
  configRows: OptimizationConfigRow[];
  assetInventory: { available: boolean; receivedRows: number };
};

type MutableCampaign = GoogleAdsAutomationCampaign & {
  weightedBudgetLost: number;
  weightedRankLost: number;
  auctionWeight: number;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dimension(row: OptimizationAnalyticsRow, key: string) {
  return text(record(row.dimensions)[key]);
}

function metric(row: OptimizationAnalyticsRow, key: string) {
  return number(record(row.metrics)[key]);
}

function cost(row: OptimizationAnalyticsRow) {
  return metric(row, "costMicros") / 1_000_000;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function daysInclusive(start: string, end: string) {
  const first = new Date(`${start}T12:00:00Z`).getTime();
  const last = new Date(`${end}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((last - first) / 86_400_000) + 1);
}

function assetText(value: unknown) {
  return list(value).map((item) => text(record(item).text)).filter(Boolean);
}

function latestConfig(rows: OptimizationConfigRow[], type: string) {
  const result = new Map<string, OptimizationConfigRow>();
  for (const row of rows) {
    if (row.config_type !== type || result.has(row.resource_name)) continue;
    result.set(row.resource_name, row);
  }
  return Array.from(result.values());
}

function buildCampaigns(input: BuildInput) {
  const map = new Map<string, MutableCampaign>();
  for (const row of input.campaignRows) {
    const id = dimension(row, "campaignId");
    if (!id) continue;
    const impressions = metric(row, "impressions");
    const current = map.get(id) || {
      id,
      resourceName: `customers/${input.account.customerId}/campaigns/${id}`,
      name: dimension(row, "campaignName") || `Campanha ${id}`,
      status: dimension(row, "campaignStatus") || "UNKNOWN",
      channelType: dimension(row, "channelType") || "UNKNOWN",
      biddingStrategyType: dimension(row, "biddingStrategyType") || "",
      budget: null,
      cost: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
      cpa: null,
      roas: null,
      budgetLost: null,
      rankLost: null,
      targetCpaMicros: null,
      targetRoas: null,
      weightedBudgetLost: 0,
      weightedRankLost: 0,
      auctionWeight: 0,
    };
    current.cost += cost(row);
    current.clicks += metric(row, "clicks");
    current.conversions += metric(row, "conversions");
    current.conversionValue += metric(row, "conversionsValue");
    const budgetLost = optionalNumber(record(row.metrics).searchBudgetLostImpressionShare);
    const rankLost = optionalNumber(record(row.metrics).searchRankLostImpressionShare);
    if (impressions > 0 && (budgetLost !== null || rankLost !== null)) {
      current.weightedBudgetLost += (budgetLost || 0) * impressions;
      current.weightedRankLost += (rankLost || 0) * impressions;
      current.auctionWeight += impressions;
    }
    map.set(id, current);
  }

  for (const row of latestConfig(input.configRows, "campaign_budget")) {
    const payload = record(row.payload);
    const campaign = record(payload.campaign);
    const budget = record(payload.campaignBudget);
    const id = text(campaign.id || row.campaign_id);
    const item = map.get(id);
    if (item) item.budget = optionalNumber(budget.amountMicros) === null ? null : number(budget.amountMicros) / 1_000_000;
  }

  for (const row of latestConfig(input.configRows, "campaign_bidding")) {
    const campaign = record(record(row.payload).campaign);
    const id = text(campaign.id || row.campaign_id);
    const item = map.get(id);
    if (!item) continue;
    item.resourceName = text(campaign.resourceName) || item.resourceName;
    item.biddingStrategyType = text(campaign.biddingStrategyType) || item.biddingStrategyType;
    item.targetCpaMicros = optionalNumber(record(campaign.maximizeConversions).targetCpaMicros)
      ?? optionalNumber(record(campaign.targetCpa).targetCpaMicros);
    item.targetRoas = optionalNumber(record(campaign.maximizeConversionValue).targetRoas)
      ?? optionalNumber(record(campaign.targetRoas).targetRoas);
  }

  return Array.from(map.values()).map(({ weightedBudgetLost, weightedRankLost, auctionWeight, ...campaign }) => ({
    ...campaign,
    cpa: campaign.conversions > 0 ? campaign.cost / campaign.conversions : null,
    roas: campaign.cost > 0 ? campaign.conversionValue / campaign.cost : null,
    budgetLost: auctionWeight > 0 ? weightedBudgetLost / auctionWeight : null,
    rankLost: auctionWeight > 0 ? weightedRankLost / auctionWeight : null,
  })).sort((a, b) => b.cost - a.cost);
}

function buildAdGroups(rows: OptimizationAnalyticsRow[]) {
  const map = new Map<string, GoogleAdsAutomationAdGroup>();
  for (const row of rows) {
    const id = dimension(row, "adGroupId");
    const campaignId = dimension(row, "campaignId");
    if (!id || !campaignId || map.has(id)) continue;
    map.set(id, {
      id,
      campaignId,
      campaignName: dimension(row, "campaignName") || `Campanha ${campaignId}`,
      name: dimension(row, "adGroupName") || `Grupo ${id}`,
      status: dimension(row, "adGroupStatus") || "UNKNOWN",
    });
  }
  return Array.from(map.values()).sort((a, b) => a.campaignName.localeCompare(b.campaignName) || a.name.localeCompare(b.name));
}

function qualityScore(row: OptimizationAnalyticsRow) {
  const raw = record(row.raw_row);
  const criterion = record(raw.adGroupCriterion);
  return optionalNumber(record(criterion.qualityInfo).qualityScore);
}

function buildKeywords(rows: OptimizationAnalyticsRow[]) {
  const map = new Map<string, GoogleAdsAutomationKeyword>();
  for (const row of rows) {
    const criterionId = dimension(row, "criterionId");
    const adGroupId = dimension(row, "adGroupId");
    const campaignId = dimension(row, "campaignId");
    const keywordText = dimension(row, "keywordText");
    if (!criterionId || !adGroupId || !campaignId || !keywordText) continue;
    const key = `${adGroupId}:${criterionId}`;
    const current = map.get(key) || {
      campaignId,
      campaignName: dimension(row, "campaignName") || `Campanha ${campaignId}`,
      adGroupId,
      adGroupName: dimension(row, "adGroupName") || `Grupo ${adGroupId}`,
      criterionId,
      text: keywordText,
      matchType: dimension(row, "keywordMatchType") || "UNKNOWN",
      status: dimension(row, "keywordStatus") || "UNKNOWN",
      clicks: 0,
      cost: 0,
      conversions: 0,
      qualityScore: qualityScore(row),
    };
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    current.qualityScore = qualityScore(row) ?? current.qualityScore;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
}

function buildAds(rows: OptimizationAnalyticsRow[]) {
  const map = new Map<string, GoogleAdsAutomationAd>();
  for (const row of rows) {
    const id = dimension(row, "adId");
    const adGroupId = dimension(row, "adGroupId");
    const campaignId = dimension(row, "campaignId");
    if (!id || !adGroupId || !campaignId) continue;
    const key = `${adGroupId}:${id}`;
    const rawAd = record(record(record(row.raw_row).adGroupAd).ad);
    const rsa = record(rawAd.responsiveSearchAd);
    const current = map.get(key) || {
      campaignId,
      campaignName: dimension(row, "campaignName") || `Campanha ${campaignId}`,
      adGroupId,
      adGroupName: dimension(row, "adGroupName") || `Grupo ${adGroupId}`,
      id,
      name: dimension(row, "adName") || `Anúncio ${id}`,
      status: dimension(row, "adStatus") || "UNKNOWN",
      type: dimension(row, "adType") || text(rawAd.type) || "UNKNOWN",
      headlines: assetText(rsa.headlines),
      descriptions: assetText(rsa.descriptions),
      finalUrls: list(rawAd.finalUrls).map(text).filter(Boolean),
      finalMobileUrls: list(rawAd.finalMobileUrls).map(text).filter(Boolean),
      clicks: 0,
      cost: 0,
      conversions: 0,
    };
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    if (!current.headlines.length) current.headlines = assetText(rsa.headlines);
    if (!current.descriptions.length) current.descriptions = assetText(rsa.descriptions);
    if (!current.finalUrls.length) current.finalUrls = list(rawAd.finalUrls).map(text).filter(Boolean);
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
}

function buildAssets(rows: OptimizationConfigRow[], customerId: string, receivedRows: number) {
  const map = new Map<string, GoogleAdsAutomationAsset>();
  if (receivedRows <= 0) return [];
  const inventoryRows = latestConfig(rows, "campaign_asset");
  const latestObservedAt = inventoryRows.reduce((latest, row) => row.observed_at > latest ? row.observed_at : latest, "");
  for (const row of inventoryRows.filter((item) => item.observed_at === latestObservedAt)) {
    const payload = record(row.payload);
    const campaign = record(payload.campaign);
    const campaignAsset = record(payload.campaignAsset);
    const asset = record(payload.asset);
    const id = text(asset.id);
    const campaignId = text(campaign.id || row.campaign_id);
    if (!id || !campaignId) continue;
    const fieldType = text(campaignAsset.fieldType);
    const key = `${campaignId}:${id}:${fieldType}`;
    if (map.has(key)) continue;
    map.set(key, {
      campaignId,
      campaignName: text(campaign.name) || `Campanha ${campaignId}`,
      id,
      resourceName: text(asset.resourceName) || `customers/${customerId}/assets/${id}`,
      name: text(asset.name) || text(record(asset.sitelinkAsset).linkText) || text(record(asset.calloutAsset).calloutText) || `Asset ${id}`,
      type: text(asset.type) || "UNKNOWN",
      fieldType: fieldType || "UNKNOWN",
      text: text(record(asset.textAsset).text) || text(record(asset.sitelinkAsset).linkText) || text(record(asset.calloutAsset).calloutText) || text(record(asset.callAsset).phoneNumber),
    });
  }
  return Array.from(map.values());
}

function buildConversionActions(rows: OptimizationConfigRow[]) {
  return latestConfig(rows, "conversion_action").map((row) => {
    const value = record(record(row.payload).conversionAction);
    return {
      resourceName: text(value.resourceName || row.resource_name),
      name: text(value.name) || "Ação de conversão",
      status: text(value.status) || "UNKNOWN",
      category: text(value.category) || "UNKNOWN",
      primaryForGoal: Boolean(value.primaryForGoal),
      includeInConversionsMetric: Boolean(value.includeInConversionsMetric),
    };
  }).filter((item) => item.resourceName);
}

function buildActions(input: BuildInput, context: Omit<GoogleAdsAutomationContext, "actions">) {
  const actions: GoogleAdsAutomationAction[] = [];
  const totalCost = context.campaigns.reduce((sum, item) => sum + item.cost, 0);
  const totalConversions = context.campaigns.reduce((sum, item) => sum + item.conversions, 0);
  const accountCpa = totalConversions > 0 ? totalCost / totalConversions : null;

  const knownKeywords = new Set(context.keywords.map((item) => `${item.adGroupId}:${normalize(item.text)}`));
  const terms = new Map<string, { campaignId: string; campaignName: string; adGroupId: string; adGroupName: string; text: string; clicks: number; cost: number; conversions: number }>();
  for (const row of input.searchRows) {
    const campaignId = dimension(row, "campaignId");
    const adGroupId = dimension(row, "adGroupId");
    const value = dimension(row, "searchTerm").trim();
    if (!campaignId || !adGroupId || !value) continue;
    const key = `${adGroupId}:${normalize(value)}`;
    const current = terms.get(key) || { campaignId, campaignName: dimension(row, "campaignName") || `Campanha ${campaignId}`, adGroupId, adGroupName: dimension(row, "adGroupName") || `Grupo ${adGroupId}`, text: value, clicks: 0, cost: 0, conversions: 0 };
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    terms.set(key, current);
  }

  const lowIntentTokens = ["gratis", "gratuito", "gratuita", "vaga", "vagas", "emprego", "curso", "faculdade", "salario", "pdf", "apostila", "modelo", "exemplo"];
  for (const term of Array.from(terms.values()).filter((item) => item.conversions === 0 && item.clicks > 0 && item.cost > 0 && lowIntentTokens.some((token) => normalize(item.text).includes(token))).sort((a, b) => b.cost - a.cost).slice(0, 4)) {
    actions.push({
      id: `negative:${term.campaignId}:${normalize(term.text)}`,
      group: "keywords",
      title: `Negativar “${term.text}”`,
      reason: "A busca tem sinal evidente de baixa intenção e não gerou conversões no período.",
      evidence: `${term.clicks} clique(s) · ${term.cost.toFixed(2)} de gasto · 0 conversões`,
      readiness: "ready",
      riskLevel: "low",
      campaignId: term.campaignId,
      campaignName: term.campaignName,
      operationType: "add_campaign_negative_keyword",
      target: { campaignId: term.campaignId, text: term.text, matchType: "EXACT" },
    });
  }

  for (const term of Array.from(terms.values()).filter((item) => item.conversions > 0 && !knownKeywords.has(`${item.adGroupId}:${normalize(item.text)}`)).sort((a, b) => b.conversions - a.conversions || a.cost - b.cost).slice(0, 4)) {
    const ready = term.conversions >= 2 || (term.conversions >= 1 && term.clicks >= 5);
    actions.push({
      id: `keyword:${term.adGroupId}:${normalize(term.text)}`,
      group: "keywords",
      title: `Adicionar “${term.text}” como palavra-chave exata`,
      reason: "O termo já trouxe resultado e ainda não aparece como palavra-chave desse grupo no recorte sincronizado.",
      evidence: `${term.conversions} conversão(ões) · ${term.clicks} clique(s) · ${term.cost.toFixed(2)} de gasto`,
      readiness: ready ? "ready" : "review",
      riskLevel: "low",
      campaignId: term.campaignId,
      campaignName: term.campaignName,
      operationType: "add_ad_group_keyword",
      target: { campaignId: term.campaignId, adGroupId: term.adGroupId, text: term.text, matchType: "EXACT" },
    });
  }

  for (const keyword of context.keywords.filter((item) => item.status.toUpperCase() === "ENABLED" && item.conversions === 0 && (item.clicks >= 8 || item.cost >= Math.max(20, totalCost * 0.08))).slice(0, 4)) {
    actions.push({
      id: `pause:${keyword.adGroupId}:${keyword.criterionId}`,
      group: "keywords",
      title: `Revisar pausa de “${keyword.text}”`,
      reason: "A palavra-chave concentrou gasto ou cliques sem conversão registrada.",
      evidence: `${keyword.clicks} clique(s) · ${keyword.cost.toFixed(2)} de gasto · 0 conversões`,
      readiness: keyword.clicks >= 12 ? "ready" : "review",
      riskLevel: "medium",
      campaignId: keyword.campaignId,
      campaignName: keyword.campaignName,
      operationType: "set_keyword_status",
      target: { adGroupId: keyword.adGroupId, criterionId: keyword.criterionId, status: "PAUSED" },
    });
  }

  for (const campaign of context.campaigns.filter((item) => item.status.toUpperCase() === "ENABLED" && item.budget && item.conversions >= 3 && item.budgetLost !== null && item.budgetLost >= 0.2 && item.budgetLost > (item.rankLost || 0) + 0.05 && item.cpa !== null && (accountCpa === null || item.cpa <= accountCpa * 1.1)).slice(0, 3)) {
    const proposedBudget = Math.round((campaign.budget || 0) * 1.1 * 100) / 100;
    actions.push({
      id: `budget:${campaign.id}`,
      group: "budget_bidding",
      title: `Testar +10% de orçamento em ${campaign.name}`,
      reason: "A campanha converte com eficiência e perde mais participação por orçamento do que por classificação.",
      evidence: `${campaign.conversions} conversão(ões) · CPA ${campaign.cpa?.toFixed(2)} · perda por orçamento ${((campaign.budgetLost || 0) * 100).toFixed(1)}%`,
      readiness: "ready",
      riskLevel: "medium",
      campaignId: campaign.id,
      campaignName: campaign.name,
      operationType: "set_campaign_budget",
      target: { campaignId: campaign.id, amount: proposedBudget },
    });
  }

  const lowQualityGroups = new Map<string, GoogleAdsAutomationKeyword>();
  for (const keyword of context.keywords) {
    if (keyword.status.toUpperCase() !== "ENABLED" || keyword.qualityScore === null || keyword.qualityScore > 4) continue;
    if (!lowQualityGroups.has(keyword.adGroupId)) lowQualityGroups.set(keyword.adGroupId, keyword);
  }
  for (const keyword of Array.from(lowQualityGroups.values()).slice(0, 3)) {
    const ad = context.ads.find((item) => item.adGroupId === keyword.adGroupId && item.status.toUpperCase() === "ENABLED" && item.type === "RESPONSIVE_SEARCH_AD");
    if (!ad) continue;
    actions.push({
      id: `rsa:${ad.adGroupId}:${ad.id}`,
      group: "ads",
      title: `Gerar nova versão para ${ad.name}`,
      reason: `O grupo contém palavra-chave com Quality Score ${keyword.qualityScore}; a IA pode preparar um rascunho usando o anúncio e os termos reais.`,
      evidence: `${keyword.text} · ${keyword.clicks} clique(s) · anúncio com ${ad.headlines.length} título(s)`,
      readiness: "review",
      riskLevel: "high",
      campaignId: ad.campaignId,
      campaignName: ad.campaignName,
      editor: "rsa_draft",
      target: { campaignId: ad.campaignId, adGroupId: ad.adGroupId, adId: ad.id },
    });
  }

  const timeMap = new Map<string, { campaignId: string; campaignName: string; day: string; hour: number; clicks: number; cost: number; conversions: number }>();
  for (const row of input.timeRows) {
    const campaignId = dimension(row, "campaignId");
    const day = dimension(row, "dayOfWeek");
    const hour = number(record(row.dimensions).hour);
    if (!campaignId || !day) continue;
    const key = `${campaignId}:${day}:${hour}`;
    const current = timeMap.get(key) || { campaignId, campaignName: dimension(row, "campaignName") || `Campanha ${campaignId}`, day, hour, clicks: 0, cost: 0, conversions: 0 };
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    timeMap.set(key, current);
  }
  const periodDays = context.period.days;
  for (const slot of Array.from(timeMap.values()).filter((item) => item.conversions === 0 && item.cost >= Math.max(20, totalCost * 0.07)).sort((a, b) => b.cost - a.cost).slice(0, 2)) {
    actions.push({
      id: `schedule:${slot.campaignId}:${slot.day}:${slot.hour}`,
      group: "segmentation",
      title: `Revisar ${slot.day} às ${String(slot.hour).padStart(2, "0")}:00`,
      reason: "O horário concentrou investimento sem conversão; a programação deve ser revista sem excluir cobertura por impulso.",
      evidence: `${slot.clicks} clique(s) · ${slot.cost.toFixed(2)} de gasto · ${periodDays} dia(s) analisados`,
      readiness: periodDays >= 14 && slot.clicks >= 10 ? "manual" : "wait",
      riskLevel: "high",
      campaignId: slot.campaignId,
      campaignName: slot.campaignName,
      editor: "schedule_review",
      target: { campaignId: slot.campaignId, dayOfWeek: slot.day, start: `${String(slot.hour).padStart(2, "0")}:00`, end: `${String(Math.min(24, slot.hour + 1)).padStart(2, "0")}:00` },
    });
  }

  for (const campaign of (context.assetInventoryAvailable ? context.campaigns : []).filter((item) => item.status.toUpperCase() === "ENABLED").slice(0, 5)) {
    const fields = new Set(context.assets.filter((asset) => asset.campaignId === campaign.id).map((asset) => asset.fieldType.toUpperCase()));
    const missing = ["SITELINK", "CALLOUT"].filter((type) => !fields.has(type));
    if (!missing.length) continue;
    actions.push({
      id: `asset:${campaign.id}`,
      group: "assets",
      title: `Completar recursos de ${campaign.name}`,
      reason: `O inventário oficial da conta não encontrou ${missing.map((item) => item === "SITELINK" ? "sitelink" : "frase de destaque").join(" nem ")} ativo(s) na campanha.`,
      evidence: `${context.assets.filter((asset) => asset.campaignId === campaign.id).length} recurso(s) ativo(s) no último snapshot de configuração`,
      readiness: "manual",
      riskLevel: "medium",
      campaignId: campaign.id,
      campaignName: campaign.name,
      editor: "asset_draft",
      target: { campaignId: campaign.id, campaignResourceName: campaign.resourceName, assetType: missing[0] },
    });
  }

  for (const campaign of context.campaigns.filter((item) => item.conversions >= 30 && item.targetCpaMicros && ["MAXIMIZE_CONVERSIONS", "TARGET_CPA"].includes(item.biddingStrategyType)).slice(0, 2)) {
    const observedMicros = (campaign.cpa || 0) * 1_000_000;
    if (!observedMicros || Math.abs(observedMicros - (campaign.targetCpaMicros || 0)) / (campaign.targetCpaMicros || 1) < 0.2) continue;
    const direction = observedMicros > (campaign.targetCpaMicros || 0) ? 1.1 : 0.9;
    const proposed = Math.round((campaign.targetCpaMicros || 0) * direction);
    actions.push({
      id: `target-cpa:${campaign.id}`,
      group: "budget_bidding",
      title: `Revisar CPA desejado de ${campaign.name}`,
      reason: "O CPA observado se afastou mais de 20% do alvo atual e há volume mínimo para uma revisão controlada.",
      evidence: `${campaign.conversions} conversões · CPA observado ${(campaign.cpa || 0).toFixed(2)} · ajuste sugerido de ${direction > 1 ? "+10%" : "-10%"}`,
      readiness: "review",
      riskLevel: "high",
      campaignId: campaign.id,
      campaignName: campaign.name,
      operationType: "set_target_cpa",
      target: { campaignId: campaign.id, targetCpaMicros: proposed },
    });
  }

  return actions.slice(0, 18);
}

export function buildGoogleAdsAutomationContext(input: BuildInput): GoogleAdsAutomationContext {
  const period = { ...input.period, days: daysInclusive(input.period.start, input.period.end) };
  const campaigns = buildCampaigns(input);
  const adGroups = buildAdGroups(input.adGroupRows);
  const keywords = buildKeywords(input.keywordRows);
  const ads = buildAds(input.adRows);
  const assets = buildAssets(input.configRows, input.account.customerId, input.assetInventory.receivedRows);
  const conversionActions = buildConversionActions(input.configRows);
  const base = { period, account: input.account, campaigns, adGroups, keywords, ads, assets, assetInventoryAvailable: input.assetInventory.available, conversionActions };
  return { ...base, actions: buildActions(input, base) };
}
