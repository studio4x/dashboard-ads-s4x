export const META_ADS_OBJECTIVES = [
  { id: "conversao", label: "Conversão" },
  { id: "leads", label: "Leads" },
  { id: "engajamento", label: "Engajamento" },
  { id: "trafego", label: "Tráfego" },
  { id: "alcance", label: "Alcance" },
  { id: "vendas", label: "Vendas" },
] as const;

export type MetaAdsObjectiveId = (typeof META_ADS_OBJECTIVES)[number]["id"];

export const META_ADS_METRIC_FIELD_LABELS = {
  campaignName: "Campaign Name",
  adSetName: "Ad Set Name",
  adName: "Ad Name",
  date: "Day",
  reach: "Reach",
  impressions: "Impressions",
  frequency: "Frequency",
  cost: "Amount Spent",
  cpm: "CPM (Cost per 1,000 Impressions)",
  clicks: "Link Clicks",
  cpc: "CPC (All)",
  ctr: "CTR (All)",
  messagingConversationsStarted: "Messaging Conversations Started",
  costPerMessagingConversationsStarted: "Cost per Messaging Conversations Started",
  conversions: "Messaging Conversations Started",
  costPerConversion: "Cost per Messaging Conversations Started",
  leads: "Leads",
  onFacebookLeads: "On-Facebook Leads",
  websiteLeads: "Website Leads",
  offlineLeads: "Offline Leads",
  costPerLead: "Cost per Lead",
  costPerOnFacebookLead: "Cost per On-Facebook Lead",
  costPerWebsiteLead: "Cost per Website Lead",
  costPerOfflineLead: "Cost per Offline Lead",
  leadAny: "Qualquer métrica de Lead (Leads / On-Facebook Leads / Website Leads / Offline Leads)",
  leadCostAny: "Qualquer custo de Lead (Cost per Lead / Cost per On-Facebook Lead / Cost per Website Lead / Cost per Offline Lead)",
  conversionAny: "Métrica de resultado (Messaging Conversations Started ou família de Leads)",
  conversionCostAny: "Custo por resultado (Cost per Messaging Conversations Started ou família de Cost per Lead)",
  postEngagement: "Post Engagement",
  postComments: "Post Comments",
  postReactions: "Post Reactions",
  postShares: "Post Shares",
} as const;

export type MetaAdsMetricFieldKey = keyof typeof META_ADS_METRIC_FIELD_LABELS;

interface ObjectiveDefinition {
  id: MetaAdsObjectiveId;
  label: string;
  requiredFields: MetaAdsMetricFieldKey[];
  conversionLabel: string;
  costLabel: string;
  costMetric: "cpa" | "cpc" | "cpm";
  resultMetric: "conversions" | "postEngagement" | "clicks" | "reach";
}

const OBJECTIVE_DEFINITIONS: Record<MetaAdsObjectiveId, ObjectiveDefinition> = {
  conversao: {
    id: "conversao",
    label: "Conversão",
    requiredFields: ["cost", "conversions", "costPerConversion", "clicks", "ctr"],
    conversionLabel: "Conversões",
    costLabel: "Custo por Conversão",
    costMetric: "cpa",
    resultMetric: "conversions",
  },
  leads: {
    id: "leads",
    label: "Leads",
    requiredFields: ["cost", "leadAny", "leadCostAny", "clicks"],
    conversionLabel: "Leads",
    costLabel: "Custo por Lead",
    costMetric: "cpa",
    resultMetric: "conversions",
  },
  engajamento: {
    id: "engajamento",
    label: "Engajamento",
    requiredFields: ["cost", "postEngagement", "cpc", "ctr", "clicks"],
    conversionLabel: "Engajamentos",
    costLabel: "Custo por Engajamento",
    costMetric: "cpa",
    resultMetric: "postEngagement",
  },
  trafego: {
    id: "trafego",
    label: "Tráfego",
    requiredFields: ["cost", "clicks", "cpc", "ctr", "impressions"],
    conversionLabel: "Cliques",
    costLabel: "CPC Médio",
    costMetric: "cpc",
    resultMetric: "clicks",
  },
  alcance: {
    id: "alcance",
    label: "Alcance",
    requiredFields: ["reach", "impressions", "frequency", "cpm", "cost"],
    conversionLabel: "Alcance",
    costLabel: "CPM Médio",
    costMetric: "cpm",
    resultMetric: "reach",
  },
  vendas: {
    id: "vendas",
    label: "Vendas",
    requiredFields: ["cost", "conversionAny", "conversionCostAny", "clicks", "ctr"],
    conversionLabel: "Vendas",
    costLabel: "Custo por Venda",
    costMetric: "cpa",
    resultMetric: "conversions",
  },
};

export function normalizeMetaAdsObjectives(input: unknown): MetaAdsObjectiveId[] {
  if (!Array.isArray(input)) return [];

  const validSet = new Set<MetaAdsObjectiveId>(META_ADS_OBJECTIVES.map((o) => o.id));
  const unique: MetaAdsObjectiveId[] = [];

  input.forEach((value) => {
    const normalized = String(value || "").trim().toLowerCase() as MetaAdsObjectiveId;
    if (validSet.has(normalized) && !unique.includes(normalized)) {
      unique.push(normalized);
    }
  });

  return unique;
}

export function getMetaObjectiveLabel(objective: string | null | undefined): string {
  if (!objective) return "Objetivo";
  return OBJECTIVE_DEFINITIONS[objective as MetaAdsObjectiveId]?.label || "Objetivo";
}

export function getMetaConversionLabel(primaryObjective?: string | null): string {
  if (!primaryObjective) return "Conversões";
  return OBJECTIVE_DEFINITIONS[primaryObjective as MetaAdsObjectiveId]?.conversionLabel || "Conversões";
}

export function getMetaCostLabel(primaryObjective?: string | null): string {
  if (!primaryObjective) return "Custo por Conversão";
  return OBJECTIVE_DEFINITIONS[primaryObjective as MetaAdsObjectiveId]?.costLabel || "Custo por Conversão";
}

export function getMetaCostMetric(primaryObjective?: string | null): "cpa" | "cpc" | "cpm" {
  if (!primaryObjective) return "cpa";
  return OBJECTIVE_DEFINITIONS[primaryObjective as MetaAdsObjectiveId]?.costMetric || "cpa";
}

export function getMetaResultMetric(
  primaryObjective?: string | null
): "conversions" | "postEngagement" | "clicks" | "reach" {
  if (!primaryObjective) return "conversions";
  return OBJECTIVE_DEFINITIONS[primaryObjective as MetaAdsObjectiveId]?.resultMetric || "conversions";
}

export function resolveMetaObjectivePresentation(params: {
  primaryObjective?: string | null;
  objectives?: string[] | null;
  availableFields?: Record<string, boolean> | null;
  dailyRows?: Array<Record<string, any>> | null;
}): {
  conversionLabel: string;
  costLabel: string;
  costMetric: "cpa" | "cpc" | "cpm";
  resultMetric: "conversions" | "postEngagement" | "clicks" | "reach";
} {
  const objectives = normalizeMetaAdsObjectives(params.objectives || []);
  const normalizedPrimary = normalizeMetaAdsObjectives([params.primaryObjective])[0];
  const effectivePrimary = normalizedPrimary || objectives[0] || null;

  const base = {
    conversionLabel: getMetaConversionLabel(effectivePrimary),
    costLabel: getMetaCostLabel(effectivePrimary),
    costMetric: getMetaCostMetric(effectivePrimary),
    resultMetric: getMetaResultMetric(effectivePrimary),
  };

  if (!objectives.includes("vendas")) {
    return base;
  }

  const rows = params.dailyRows || [];
  let leadTotal = 0;
  let messagingTotal = 0;

  rows.forEach((row) => {
    const leads = Number(row?.leads || 0);
    const onFacebookLeads = Number(row?.onFacebookLeads || 0);
    const websiteLeads = Number(row?.websiteLeads || 0);
    const offlineLeads = Number(row?.offlineLeads || 0);
    const leadBreakdown = onFacebookLeads + websiteLeads + offlineLeads;
    const leadValue = leads > 0 ? leads : leadBreakdown;
    leadTotal += leadValue;

    const messaging = Number(row?.messagingConversationsStarted || 0);
    if (messaging > 0) {
      messagingTotal += messaging;
      return;
    }

    if (leadValue <= 0) {
      messagingTotal += Number(row?.conversions || 0);
    }
  });

  const available = params.availableFields || {};
  const hasLeadField = Boolean(
    available.leadAny ||
      available.leads ||
      available.onFacebookLeads ||
      available.websiteLeads ||
      available.offlineLeads
  );
  const hasMessagingField = Boolean(
    available.messagingConversationsStarted ||
      available.conversions ||
      available.costPerMessagingConversationsStarted
  );

  if (messagingTotal > 0 && leadTotal <= 0) {
    return {
      conversionLabel: "Mensagens",
      costLabel: "Custo por Mensagem",
      costMetric: "cpa",
      resultMetric: "conversions",
    };
  }

  if (leadTotal > 0 && messagingTotal <= 0) {
    return {
      conversionLabel: "Leads",
      costLabel: "Custo por Lead",
      costMetric: "cpa",
      resultMetric: "conversions",
    };
  }

  if (hasMessagingField && !hasLeadField) {
    return {
      conversionLabel: "Mensagens",
      costLabel: "Custo por Mensagem",
      costMetric: "cpa",
      resultMetric: "conversions",
    };
  }

  if (hasLeadField && !hasMessagingField) {
    return {
      conversionLabel: "Leads",
      costLabel: "Custo por Lead",
      costMetric: "cpa",
      resultMetric: "conversions",
    };
  }

  return base;
}

export interface MetaObjectiveValidationNotes {
  objectives: MetaAdsObjectiveId[];
  objectiveLabels: string[];
  missingByObjective: Partial<Record<MetaAdsObjectiveId, MetaAdsMetricFieldKey[]>>;
  missingLabelsByObjective: Partial<Record<MetaAdsObjectiveId, string[]>>;
  missingMetricFields: MetaAdsMetricFieldKey[];
  missingMetricLabels: string[];
  checkedAt: string;
  message: string;
}

export function validateMetaObjectivesMetrics(
  objectives: MetaAdsObjectiveId[],
  availableFields: Partial<Record<MetaAdsMetricFieldKey, boolean>>
): MetaObjectiveValidationNotes {
  const missingByObjective: Partial<Record<MetaAdsObjectiveId, MetaAdsMetricFieldKey[]>> = {};

  objectives.forEach((objective) => {
    const def = OBJECTIVE_DEFINITIONS[objective];
    const missing = def.requiredFields.filter((field) => !availableFields[field]);
    if (missing.length > 0) {
      missingByObjective[objective] = missing;
    }
  });

  const missingMetricFields = Array.from(
    new Set(
      Object.values(missingByObjective)
        .flat()
        .filter(Boolean)
    )
  ) as MetaAdsMetricFieldKey[];

  const hasMissing = missingMetricFields.length > 0;
  const checkedAt = new Date().toISOString();
  const missingLabelsByObjective = Object.fromEntries(
    Object.entries(missingByObjective).map(([objective, fields]) => [
      objective,
      (fields || []).map((field) => META_ADS_METRIC_FIELD_LABELS[field]),
    ])
  ) as Partial<Record<MetaAdsObjectiveId, string[]>>;

  return {
    objectives,
    objectiveLabels: objectives.map((objective) => getMetaObjectiveLabel(objective)),
    missingByObjective,
    missingLabelsByObjective,
    missingMetricFields,
    missingMetricLabels: missingMetricFields.map((field) => META_ADS_METRIC_FIELD_LABELS[field]),
    checkedAt,
    message: hasMissing
      ? "Foram identificadas métricas faltantes para o(s) objetivo(s) selecionado(s)."
      : "Métricas da planilha de acordo com o(os) objetivo(s) da(s) campanha(s).",
  };
}
