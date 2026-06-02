import { getMetaConversionLabel, getMetaCostLabel, normalizeMetaAdsObjectives, type MetaAdsObjectiveId } from "@/lib/meta-ads/objectives";

export type MetricDisplayMode = "card" | "text" | "chart" | "table";

export interface TemplateMetricItem {
  key: string;
  enabled: boolean;
  displayMode: MetricDisplayMode;
  order: number;
  recommended?: boolean;
}

export interface TemplateMetricSectionConfig {
  key: string;
  label: string;
  metrics: TemplateMetricItem[];
}

export interface DashboardTemplateMetricConfig {
  version: 1;
  templateId: string;
  objectives: MetaAdsObjectiveId[];
  primaryObjective: MetaAdsObjectiveId | null;
  sections: Record<string, TemplateMetricSectionConfig>;
}

const DEFAULT_DISPLAY: Record<string, MetricDisplayMode> = {
  cost: "card",
  impressions: "card",
  reach: "card",
  clicks: "card",
  ctr: "text",
  cpc: "text",
  cpa: "card",
  roas: "card",
  conversions: "card",
  frequency: "text",
  postEngagement: "text",
  postComments: "table",
  postReactions: "table",
  postShares: "table",
};

function metricItem(key: string, order: number, options?: Partial<TemplateMetricItem>): TemplateMetricItem {
  return {
    key,
    enabled: options?.enabled ?? true,
    displayMode: options?.displayMode || DEFAULT_DISPLAY[key] || "card",
    order,
    recommended: options?.recommended ?? false,
  };
}

function section(key: string, label: string, metrics: TemplateMetricItem[]): TemplateMetricSectionConfig {
  return { key, label, metrics };
}

function objectiveMetrics(objective: MetaAdsObjectiveId | null) {
  switch (objective) {
    case "leads":
      return [
        metricItem("conversions", 10, { displayMode: "card", recommended: true }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true }),
        metricItem("reach", 30, { displayMode: "text", recommended: true }),
        metricItem("clicks", 40, { displayMode: "text", recommended: true }),
        metricItem("ctr", 50, { displayMode: "text", recommended: true }),
      ];
    case "engajamento":
      return [
        metricItem("postEngagement", 10, { displayMode: "card", recommended: true }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true }),
        metricItem("reach", 30, { displayMode: "text", recommended: true }),
        metricItem("clicks", 40, { displayMode: "text", recommended: true }),
        metricItem("ctr", 50, { displayMode: "text", recommended: true }),
      ];
    case "trafego":
      return [
        metricItem("clicks", 10, { displayMode: "card", recommended: true }),
        metricItem("cpc", 20, { displayMode: "card", recommended: true }),
        metricItem("ctr", 30, { displayMode: "text", recommended: true }),
        metricItem("impressions", 40, { displayMode: "text", recommended: true }),
      ];
    case "alcance":
      return [
        metricItem("reach", 10, { displayMode: "card", recommended: true }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true }),
        metricItem("frequency", 30, { displayMode: "card", recommended: true }),
        metricItem("impressions", 40, { displayMode: "text", recommended: true }),
        metricItem("cpc", 50, { displayMode: "text", recommended: true }),
      ];
    case "vendas":
      return [
        metricItem("conversions", 10, { displayMode: "card", recommended: true }),
        metricItem("roas", 20, { displayMode: "card", recommended: true }),
        metricItem("cpa", 30, { displayMode: "card", recommended: true }),
        metricItem("clicks", 40, { displayMode: "text", recommended: true }),
        metricItem("ctr", 50, { displayMode: "text", recommended: true }),
      ];
    case "conversao":
    default:
      return [
        metricItem("conversions", 10, { displayMode: "card", recommended: true }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true }),
        metricItem("clicks", 30, { displayMode: "text", recommended: true }),
        metricItem("ctr", 40, { displayMode: "text", recommended: true }),
        metricItem("impressions", 50, { displayMode: "text", recommended: true }),
      ];
  }
}

function googleAdsDefaults(): Record<string, TemplateMetricSectionConfig> {
  return {
    "executive-summary": section("executive-summary", "Resumo Executivo", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true }),
      metricItem("impressions", 30, { displayMode: "card", recommended: true }),
      metricItem("clicks", 40, { displayMode: "card", recommended: true }),
      metricItem("ctr", 50, { displayMode: "text", recommended: true }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true }),
      metricItem("roas", 80, { displayMode: "card", recommended: true }),
    ]),
    "google-ads": section("google-ads", "Google Ads", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true }),
      metricItem("impressions", 30, { displayMode: "text", recommended: true }),
      metricItem("clicks", 40, { displayMode: "text", recommended: true }),
      metricItem("ctr", 50, { displayMode: "text", recommended: true }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true }),
      metricItem("roas", 80, { displayMode: "chart", recommended: true }),
    ]),
    campaigns: section("campaigns", "Campanhas", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("impressions", 20, { displayMode: "text", recommended: true }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true }),
      metricItem("ctr", 40, { displayMode: "table", recommended: true }),
      metricItem("conversions", 50, { displayMode: "table", recommended: true }),
      metricItem("cpa", 60, { displayMode: "table", recommended: true }),
      metricItem("roas", 70, { displayMode: "chart", recommended: true }),
    ]),
    keywords: section("keywords", "Palavras-chave", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("impressions", 20, { displayMode: "text", recommended: true }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true }),
      metricItem("ctr", 40, { displayMode: "text", recommended: true }),
      metricItem("conversions", 50, { displayMode: "table", recommended: true }),
    ]),
    "search-terms": section("search-terms", "Termos de Pesquisa", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("clicks", 20, { displayMode: "text", recommended: true }),
      metricItem("ctr", 30, { displayMode: "text", recommended: true }),
      metricItem("conversions", 40, { displayMode: "table", recommended: true }),
    ]),
    "ads-assets": section("ads-assets", "Anúncios e Recursos", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("clicks", 20, { displayMode: "text", recommended: true }),
      metricItem("ctr", 30, { displayMode: "text", recommended: true }),
      metricItem("conversions", 40, { displayMode: "table", recommended: true }),
    ]),
    "negative-keywords": section("negative-keywords", "Palavras-chave Negativas", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("clicks", 20, { displayMode: "text", recommended: true }),
      metricItem("impressions", 30, { displayMode: "text", recommended: true }),
    ]),
  };
}

function metaDefaults(primaryObjective: MetaAdsObjectiveId | null): Record<string, TemplateMetricSectionConfig> {
  const objMetrics = objectiveMetrics(primaryObjective);
  return {
    "executive-summary": section("executive-summary", "Resumo Executivo", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true }),
      metricItem("reach", 30, { displayMode: "card", recommended: true }),
      metricItem("clicks", 40, { displayMode: "card", recommended: true }),
      metricItem("frequency", 50, { displayMode: "text", recommended: true }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true }),
      ...objMetrics.slice(0, 3),
    ]),
    campanhas: section("campanhas", "Campanhas", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("reach", 20, { displayMode: "text", recommended: true }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true }),
      metricItem("ctr", 40, { displayMode: "text", recommended: true }),
      metricItem("conversions", 50, { displayMode: "card", recommended: true }),
      metricItem("cpa", 60, { displayMode: "card", recommended: true }),
    ]),
    conjuntos: section("conjuntos", "Conjuntos", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("reach", 20, { displayMode: "text", recommended: true }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true }),
      metricItem("cpa", 50, { displayMode: "card", recommended: true }),
    ]),
    anuncios: section("anuncios", "Anúncios", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("reach", 20, { displayMode: "text", recommended: true }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true }),
      metricItem("cpa", 50, { displayMode: "card", recommended: true }),
    ]),
    funil: section("funil", "Funil", [
      metricItem("impressions", 10, { displayMode: "card", recommended: true }),
      metricItem("reach", 20, { displayMode: "card", recommended: true }),
      metricItem("clicks", 30, { displayMode: "card", recommended: true }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true }),
      metricItem("frequency", 50, { displayMode: "text", recommended: true }),
      metricItem("cpc", 60, { displayMode: "text", recommended: true }),
      metricItem("cpm", 70, { displayMode: "text", recommended: true }),
    ]),
    engajamento: section("engajamento", "Engajamento", [
      metricItem("postEngagement", 10, { displayMode: "card", recommended: true }),
      metricItem("postComments", 20, { displayMode: "table", recommended: true }),
      metricItem("postReactions", 30, { displayMode: "table", recommended: true }),
      metricItem("postShares", 40, { displayMode: "table", recommended: true }),
      metricItem("reach", 50, { displayMode: "text", recommended: true }),
    ]),
  };
}

function integratedDefaults(primaryObjective: MetaAdsObjectiveId | null): Record<string, TemplateMetricSectionConfig> {
  const objMetrics = objectiveMetrics(primaryObjective);
  return {
    "executive-summary": section("executive-summary", "Resumo Executivo", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true }),
      metricItem("reach", 30, { displayMode: "card", recommended: true }),
      metricItem("clicks", 40, { displayMode: "card", recommended: true }),
      metricItem("frequency", 50, { displayMode: "text", recommended: true }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true }),
      metricItem("roas", 80, { displayMode: "card", recommended: true }),
      ...objMetrics.slice(0, 3),
    ]),
    "google-ads": section("google-ads", "Google Ads", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("impressions", 20, { displayMode: "text", recommended: true }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true }),
      metricItem("ctr", 40, { displayMode: "text", recommended: true }),
      metricItem("conversions", 50, { displayMode: "card", recommended: true }),
      metricItem("cpa", 60, { displayMode: "card", recommended: true }),
      metricItem("roas", 70, { displayMode: "chart", recommended: true }),
    ]),
    "meta-ads": section("meta-ads", "Meta Ads", [
      metricItem("cost", 10, { displayMode: "card", recommended: true }),
      metricItem("reach", 20, { displayMode: "card", recommended: true }),
      metricItem("clicks", 30, { displayMode: "card", recommended: true }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true }),
      metricItem("cpa", 50, { displayMode: "card", recommended: true }),
      metricItem("frequency", 60, { displayMode: "text", recommended: true }),
      metricItem("postEngagement", 70, { displayMode: "text", recommended: true }),
    ]),
  };
}

export function getMetricLabel(templateId: string, metricKey: string, primaryObjective?: MetaAdsObjectiveId | null): string {
  const isMetaLike = templateId === "meta_ads_s4x" || templateId === "google_meta_ads_s4x";
  const objective = normalizeMetaAdsObjectives([primaryObjective])[0] || null;

  switch (metricKey) {
    case "cost":
      return "Investimento";
    case "impressions":
      return "Impressões";
    case "reach":
      return "Alcance";
    case "clicks":
      return "Cliques";
    case "ctr":
      return "CTR";
    case "cpc":
      return "CPC Médio";
    case "cpa":
      return isMetaLike ? getMetaCostLabel(objective) : "CPA Médio";
    case "roas":
      return "ROAS";
    case "conversions":
      return isMetaLike ? getMetaConversionLabel(objective) : "Conversões";
    case "frequency":
      return "Frequência";
    case "postEngagement":
      return "Engajamentos";
    case "postComments":
      return "Comentários";
    case "postReactions":
      return "Reações";
    case "postShares":
      return "Compartilhamentos";
    case "cpm":
      return "CPM Médio";
    default:
      return metricKey;
  }
}

export function getDefaultTemplateMetricConfig(
  templateId: string,
  objectives: MetaAdsObjectiveId[] = [],
  primaryObjective?: MetaAdsObjectiveId | null
): DashboardTemplateMetricConfig {
  const normalizedObjectives = normalizeMetaAdsObjectives(objectives);
  const normalizedPrimary = normalizeMetaAdsObjectives([primaryObjective])[0] || normalizedObjectives[0] || null;

  let sections: Record<string, TemplateMetricSectionConfig>;
  if (templateId === "meta_ads_s4x") {
    sections = metaDefaults(normalizedPrimary);
  } else if (templateId === "google_meta_ads_s4x") {
    sections = integratedDefaults(normalizedPrimary);
  } else {
    sections = googleAdsDefaults();
  }

  return {
    version: 1,
    templateId,
    objectives: normalizedObjectives,
    primaryObjective: normalizedPrimary,
    sections,
  };
}

export function normalizeTemplateMetricConfig(
  input: unknown,
  templateId: string,
  objectives: MetaAdsObjectiveId[] = [],
  primaryObjective?: MetaAdsObjectiveId | null
): DashboardTemplateMetricConfig {
  const defaults = getDefaultTemplateMetricConfig(templateId, objectives, primaryObjective);
  if (!input || typeof input !== "object") {
    return defaults;
  }

  const raw = input as Partial<DashboardTemplateMetricConfig> & { sections?: Record<string, Partial<TemplateMetricSectionConfig>> };
  const mergedSections: Record<string, TemplateMetricSectionConfig> = {};

  Object.entries(defaults.sections).forEach(([sectionKey, defaultSection]) => {
    const rawSection = raw.sections?.[sectionKey];
    const mergedMetrics = defaultSection.metrics.map((metric) => {
      const found = rawSection?.metrics?.find((item) => item.key === metric.key);
      return {
        ...metric,
        enabled: found?.enabled ?? metric.enabled,
        displayMode: found?.displayMode || metric.displayMode,
        order: found?.order ?? metric.order,
        recommended: found?.recommended ?? metric.recommended,
      };
    });

    const extraMetrics = (rawSection?.metrics || [])
      .filter((item) => !defaultSection.metrics.some((metric) => metric.key === item.key))
      .map((item) => ({
        key: item.key,
        enabled: item.enabled ?? true,
        displayMode: item.displayMode || "card",
        order: item.order ?? 999,
        recommended: item.recommended ?? false,
      }));

    mergedSections[sectionKey] = {
      ...defaultSection,
      metrics: [...mergedMetrics, ...extraMetrics].sort((a, b) => a.order - b.order),
    };
  });

  return {
    version: 1,
    templateId,
    objectives: normalizeMetaAdsObjectives(raw.objectives || objectives),
    primaryObjective: normalizeMetaAdsObjectives([raw.primaryObjective || primaryObjective])[0] || defaults.primaryObjective,
    sections: mergedSections,
  };
}

export function getTemplateMetricSection(
  config: DashboardTemplateMetricConfig | null | undefined,
  sectionKey: string
): TemplateMetricSectionConfig | null {
  if (!config?.sections?.[sectionKey]) return null;
  return config.sections[sectionKey];
}

export function getEnabledMetricKeys(
  config: DashboardTemplateMetricConfig | null | undefined,
  sectionKey: string
): string[] {
  const section = getTemplateMetricSection(config, sectionKey);
  if (!section) return [];
  return section.metrics.filter((metric) => metric.enabled).map((metric) => metric.key);
}

export function getMetricDisplayMode(
  config: DashboardTemplateMetricConfig | null | undefined,
  sectionKey: string,
  key: string
): MetricDisplayMode {
  const section = getTemplateMetricSection(config, sectionKey);
  const metric = section?.metrics.find((item) => item.key === key);
  return metric?.displayMode || DEFAULT_DISPLAY[key] || "card";
}

export function listTemplateMetricSections(
  config: DashboardTemplateMetricConfig | null | undefined
): TemplateMetricSectionConfig[] {
  return Object.values(config?.sections || {});
}

export function applyTemplateMetricConfigToKpis(
  metrics: Array<{ metricKey?: string; label: string; displayMode?: MetricDisplayMode; [key: string]: any }>,
  config: DashboardTemplateMetricConfig | null | undefined,
  sectionKey: string,
  templateId: string,
  primaryObjective?: MetaAdsObjectiveId | null
) {
  void templateId;
  void primaryObjective;
  const section = getTemplateMetricSection(config, sectionKey);
  if (!section) return metrics;

  const orderMap = new Map(section.metrics.map((metric) => [metric.key, metric]));
  return metrics
    .filter((metric) => {
      const key = metric.metricKey || metric.label;
      const configMetric = orderMap.get(key);
      return configMetric ? configMetric.enabled : true;
    })
    .map((metric) => {
      const key = metric.metricKey || metric.label;
      const configMetric = orderMap.get(key);
      return {
        ...metric,
        displayMode: configMetric?.displayMode || metric.displayMode || "card",
      };
    })
    .sort((a, b) => {
      const keyA = a.metricKey || a.label;
      const keyB = b.metricKey || b.label;
      const orderA = orderMap.get(keyA)?.order ?? 999;
      const orderB = orderMap.get(keyB)?.order ?? 999;
      return orderA - orderB;
    });
}
