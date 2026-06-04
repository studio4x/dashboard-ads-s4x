import { formatCurrency, formatNumber } from "@/lib/formatters";
import { getMetaConversionLabel, getMetaCostLabel, normalizeMetaAdsObjectives, type MetaAdsObjectiveId } from "@/lib/meta-ads/objectives";
import type { KpiSummary } from "@/types/entities";

export type MetricDisplayMode = "card" | "text" | "chart" | "table";
export type TemplateMetricKind = "standard" | "composite";
export type TemplateMetricCompositeType =
  | "sum"
  | "subtract"
  | "average"
  | "ratio_percent"
  | "ratio_currency"
  | "ratio_multiplier"
  | "ratio_number"
  | "per_thousand_currency";

export interface TemplateMetricItem {
  key: string;
  label?: string;
  preview?: string;
  kind?: TemplateMetricKind;
  compositeType?: TemplateMetricCompositeType;
  primaryMetricKey?: string;
  secondaryMetricKey?: string;
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
    label: options?.label,
    preview: options?.preview,
    kind: options?.kind || "standard",
    compositeType: options?.compositeType || "sum",
    primaryMetricKey: options?.primaryMetricKey,
    secondaryMetricKey: options?.secondaryMetricKey,
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

export function getTemplateMetricLabel(
  templateId: string,
  metric: Pick<TemplateMetricItem, "key" | "label">,
  primaryObjective?: MetaAdsObjectiveId | null
): string {
  return metric.label?.trim() || getMetricLabel(templateId, metric.key, primaryObjective);
}

function formatCompositeMetricValue(value: number, unit?: KpiSummary["unit"]) {
  if (!Number.isFinite(value)) return "0";
  if (unit === "currency") return formatCurrency(value, true);
  if (unit === "percent") return `${value.toFixed(2)}%`;
  if (unit === "ratio") return `${value.toFixed(2)}x`;
  return formatNumber(value);
}

function derivePreviousValue(currentValue: number, changePercent: number) {
  if (!Number.isFinite(currentValue)) return 0;
  if (!Number.isFinite(changePercent) || changePercent === -100) return currentValue;
  const factor = 1 + changePercent / 100;
  if (factor === 0) return currentValue;
  return currentValue / factor;
}

function resolveCompositeMetricValue(
  compositeType: TemplateMetricCompositeType,
  primaryValue: number,
  secondaryValue: number
) {
  switch (compositeType) {
    case "subtract":
      return primaryValue - secondaryValue;
    case "average":
      return (primaryValue + secondaryValue) / 2;
    case "ratio_percent":
      return secondaryValue !== 0 ? (primaryValue / secondaryValue) * 100 : 0;
    case "ratio_currency":
      return secondaryValue !== 0 ? primaryValue / secondaryValue : 0;
    case "ratio_multiplier":
      return secondaryValue !== 0 ? primaryValue / secondaryValue : 0;
    case "ratio_number":
      return secondaryValue !== 0 ? primaryValue / secondaryValue : 0;
    case "per_thousand_currency":
      return secondaryValue !== 0 ? (primaryValue / secondaryValue) * 1000 : 0;
    case "sum":
    default:
      return primaryValue + secondaryValue;
  }
}

function getCompositeMetricUnit(
  compositeType: TemplateMetricCompositeType,
  primary?: KpiSummary,
  secondary?: KpiSummary
): KpiSummary["unit"] {
  void secondary;
  switch (compositeType) {
    case "ratio_percent":
      return "percent";
    case "ratio_currency":
    case "per_thousand_currency":
      return "currency";
    case "ratio_multiplier":
    case "ratio_number":
      return "ratio";
    case "sum":
    case "subtract":
    case "average":
    default:
      return primary?.unit;
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
    const rawMetrics = Array.isArray(rawSection?.metrics) ? rawSection.metrics : null;
    const mergedMetrics = rawMetrics && rawMetrics.length > 0
      ? rawMetrics.map((item, index) => {
          const defaultMetric = defaultSection.metrics.find((metric) => metric.key === item.key);
          return {
            ...(defaultMetric || {}),
            key: item.key,
            label: item.label?.trim() || defaultMetric?.label,
            preview: item.preview?.trim() || defaultMetric?.preview,
            kind: item.kind || defaultMetric?.kind || "standard",
            compositeType: item.compositeType || defaultMetric?.compositeType || "sum",
            primaryMetricKey: item.primaryMetricKey?.trim() || defaultMetric?.primaryMetricKey,
            secondaryMetricKey: item.secondaryMetricKey?.trim() || defaultMetric?.secondaryMetricKey,
            enabled: item.enabled ?? defaultMetric?.enabled ?? true,
            displayMode: item.displayMode || defaultMetric?.displayMode || DEFAULT_DISPLAY[item.key] || "card",
            order: item.order ?? defaultMetric?.order ?? (index + 1) * 10,
            recommended: item.recommended ?? defaultMetric?.recommended ?? false,
          } satisfies TemplateMetricItem;
        })
      : defaultSection.metrics.map((metric) => ({ ...metric }));

    mergedSections[sectionKey] = {
      ...defaultSection,
      metrics: mergedMetrics.sort((a, b) => a.order - b.order),
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

function buildCompositeKpi(
  metricConfig: TemplateMetricItem,
  baseMetrics: Array<KpiSummary & { metricKey?: string }>
): (KpiSummary & { metricKey: string }) | null {
  const primary = baseMetrics.find((metric) => metric.metricKey === metricConfig.primaryMetricKey);
  const secondary = baseMetrics.find((metric) => metric.metricKey === metricConfig.secondaryMetricKey);
  if (!primary || !secondary) return null;

  const primaryValue = Number(primary.value || 0);
  const secondaryValue = Number(secondary.value || 0);
  if (!Number.isFinite(primaryValue) || !Number.isFinite(secondaryValue)) return null;

  const compositeType = metricConfig.compositeType || "sum";
  const primaryChange = Number(primary.change_percent || 0);
  const secondaryChange = Number(secondary.change_percent || 0);
  const currentCompositeValue = resolveCompositeMetricValue(compositeType, primaryValue, secondaryValue);
  const previousValue = resolveCompositeMetricValue(
    compositeType,
    derivePreviousValue(primaryValue, primaryChange),
    derivePreviousValue(secondaryValue, secondaryChange)
  );
  const changePercent =
    previousValue > 0
      ? ((currentCompositeValue - previousValue) / previousValue) * 100
      : 0;
  const unit = getCompositeMetricUnit(compositeType, primary, secondary);

  return {
    metricKey: metricConfig.key,
    label: metricConfig.label?.trim() || `${primary.label} + ${secondary.label}`,
    value: currentCompositeValue,
    formatted_value: formatCompositeMetricValue(currentCompositeValue, unit),
    change_percent: Number.isFinite(changePercent) ? changePercent : 0,
    change_direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral",
    unit,
    icon: primary.icon || secondary.icon,
    description: `${primary.label} + ${secondary.label}`,
    displayMode: metricConfig.displayMode || "card",
  };
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
  const filteredBaseMetrics = metrics
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
        label: configMetric?.label?.trim() || metric.label,
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

  const compositeMetrics = section.metrics
    .filter((metric) => metric.enabled && (metric.kind || "standard") === "composite")
    .map((metric) => buildCompositeKpi(metric, metrics as Array<KpiSummary & { metricKey?: string }>))
    .filter(Boolean) as Array<KpiSummary & { metricKey: string }>;

  return [...filteredBaseMetrics, ...compositeMetrics].sort((a, b) => {
    const keyA = a.metricKey || a.label;
    const keyB = b.metricKey || b.label;
    const orderA = orderMap.get(keyA)?.order ?? 999;
    const orderB = orderMap.get(keyB)?.order ?? 999;
    return orderA - orderB;
  });
}
