import { formatCurrency, formatNumber } from "@/lib/formatters";
import { getMetaConversionLabel, getMetaCostLabel, normalizeMetaAdsObjectives, type MetaAdsObjectiveId } from "@/lib/meta-ads/objectives";
import type { KpiSummary } from "@/types/entities";

export type MetricDisplayMode = "card" | "text" | "chart" | "table";
export type TemplateMetricKind = "standard" | "composite";
export type TemplateMetricSourcePlatform = "google_ads" | "meta_ads" | "mixed";
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
  sourcePlatform?: TemplateMetricSourcePlatform;
  primarySourcePlatform?: TemplateMetricSourcePlatform;
  secondarySourcePlatform?: TemplateMetricSourcePlatform;
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
  google_cost: "card",
  google_impressions: "text",
  google_clicks: "text",
  google_ctr: "text",
  google_cpc: "text",
  google_cpa: "card",
  google_roas: "card",
  google_conversions: "card",
  meta_cost: "card",
  meta_impressions: "text",
  meta_reach: "card",
  meta_clicks: "text",
  meta_ctr: "text",
  meta_cpc: "text",
  meta_cpa: "card",
  meta_cpm: "text",
  meta_frequency: "text",
  meta_postEngagement: "text",
  meta_conversions: "card",
};

function metricItem(key: string, order: number, options?: Partial<TemplateMetricItem>): TemplateMetricItem {
  return {
    key,
    label: options?.label,
    preview: options?.preview,
    kind: options?.kind || "standard",
    sourcePlatform: options?.sourcePlatform || inferMetricSourcePlatform(key),
    primarySourcePlatform: options?.primarySourcePlatform || inferMetricSourcePlatform(options?.primaryMetricKey || ""),
    secondarySourcePlatform: options?.secondarySourcePlatform || inferMetricSourcePlatform(options?.secondaryMetricKey || ""),
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

function customDefaults(): Record<string, TemplateMetricSectionConfig> {
  return {};
}

function inferMetricSourcePlatform(key: string): TemplateMetricSourcePlatform | undefined {
  if (key.startsWith("google_")) return "google_ads";
  if (key.startsWith("meta_")) return "meta_ads";
  return undefined;
}

function inferSectionSourcePlatform(templateId: string, sectionKey: string): TemplateMetricSourcePlatform | undefined {
  if (templateId === "google_ads_s4x") return "google_ads";
  if (templateId === "meta_ads_s4x") return "meta_ads";
  if (templateId === "google_meta_ads_s4x") {
    if (sectionKey === "google-ads") return "google_ads";
    if (sectionKey === "meta-ads") return "meta_ads";
    if (sectionKey === "executive-summary" || sectionKey === "campaigns") return "mixed";
  }
  return undefined;
}

const LEGACY_INTEGRATED_SECTION_KEY_MAP: Record<string, Record<string, { key: string; label: string }>> = {
  "google-ads": {
    cost: { key: "google_cost", label: "Investimento Google Ads" },
    impressions: { key: "google_impressions", label: "Impressões Google Ads" },
    clicks: { key: "google_clicks", label: "Cliques Google Ads" },
    ctr: { key: "google_ctr", label: "CTR Google Ads" },
    cpc: { key: "google_cpc", label: "CPC Google Ads" },
    cpa: { key: "google_cpa", label: "CPA Google Ads" },
    roas: { key: "google_roas", label: "ROAS Google Ads" },
    conversions: { key: "google_conversions", label: "Conversões Google Ads" },
  },
  "meta-ads": {
    cost: { key: "meta_cost", label: "Investimento Meta Ads" },
    impressions: { key: "meta_impressions", label: "Impressões Meta Ads" },
    reach: { key: "meta_reach", label: "Alcance Meta Ads" },
    clicks: { key: "meta_clicks", label: "Cliques Meta Ads" },
    ctr: { key: "meta_ctr", label: "CTR Meta Ads" },
    cpc: { key: "meta_cpc", label: "CPC Meta Ads" },
    cpa: { key: "meta_cpa", label: "CPA Meta Ads" },
    cpm: { key: "meta_cpm", label: "CPM Meta Ads" },
    frequency: { key: "meta_frequency", label: "Frequência Meta Ads" },
    postEngagement: { key: "meta_postEngagement", label: "Engajamentos Meta Ads" },
    conversions: { key: "meta_conversions", label: "Conversões Meta Ads" },
  },
};

function normalizeLegacyIntegratedMetricKey(sectionKey: string, metricKey: string) {
  const mapped = LEGACY_INTEGRATED_SECTION_KEY_MAP[sectionKey]?.[metricKey];
  return mapped?.key || metricKey;
}

function normalizeLegacyIntegratedMetricLabel(sectionKey: string, metricKey: string, currentLabel?: string) {
  const mapped = LEGACY_INTEGRATED_SECTION_KEY_MAP[sectionKey]?.[metricKey];
  return currentLabel?.trim() || mapped?.label || getMetricLabel("google_meta_ads_s4x", metricKey as any);
}

function migrateLegacyIntegratedTemplateConfig(
  input: unknown,
  templateId: string
): unknown {
  if (!input || typeof input !== "object") return input;
  const raw = input as Record<string, any>;
  const sections = raw.sections;
  if (!sections || typeof sections !== "object") return input;

  const relevantSections = ["google-ads", "meta-ads"];
  const hasLegacySection = relevantSections.some((sectionKey) =>
    Array.isArray(sections[sectionKey]?.metrics) &&
    sections[sectionKey].metrics.some((metric: any) => typeof metric?.key === "string" && !metric.key.startsWith("google_") && !metric.key.startsWith("meta_"))
  );

  if (!hasLegacySection && templateId !== "google_meta_ads_s4x") return input;

  const nextSections = { ...sections };
  let changed = false;

  relevantSections.forEach((sectionKey) => {
    const section = sections[sectionKey];
    const metrics = Array.isArray(section?.metrics) ? section.metrics : null;
    if (!metrics) return;

    const sourcePlatform: TemplateMetricSourcePlatform = sectionKey === "google-ads" ? "google_ads" : "meta_ads";
    const nextMetrics = metrics.map((metric: any) => {
      if (!metric || typeof metric !== "object") return metric;
      const currentKey = String(metric.key || "");
      const nextKey = normalizeLegacyIntegratedMetricKey(sectionKey, currentKey);
      const nextPrimaryKey = metric.primaryMetricKey ? normalizeLegacyIntegratedMetricKey(sectionKey, String(metric.primaryMetricKey)) : metric.primaryMetricKey;
      const nextSecondaryKey = metric.secondaryMetricKey ? normalizeLegacyIntegratedMetricKey(sectionKey, String(metric.secondaryMetricKey)) : metric.secondaryMetricKey;
      const nextLabel = normalizeLegacyIntegratedMetricLabel(sectionKey, currentKey, metric.label);
      if (
        nextKey === currentKey &&
        nextPrimaryKey === metric.primaryMetricKey &&
        nextSecondaryKey === metric.secondaryMetricKey &&
        nextLabel === metric.label &&
        metric.sourcePlatform === sourcePlatform
      ) {
        return metric;
      }
      changed = true;
      return {
        ...metric,
        key: nextKey,
        label: nextLabel,
        sourcePlatform,
        primarySourcePlatform: metric.kind === "composite" ? (metric.primarySourcePlatform || sourcePlatform) : sourcePlatform,
        secondarySourcePlatform: metric.kind === "composite" ? (metric.secondarySourcePlatform || sourcePlatform) : sourcePlatform,
        primaryMetricKey: nextPrimaryKey,
        secondaryMetricKey: nextSecondaryKey,
      };
    });

    nextSections[sectionKey] = {
      ...section,
      metrics: nextMetrics,
    };
  });

  if (!changed) return input;
  return {
    ...raw,
    sections: nextSections,
  };
}

function isLegacyMixedCustomTemplateConfig(input: unknown) {
  if (!input || typeof input !== "object") return false;
  const raw = input as Record<string, any>;
  const sections = raw.sections;
  if (!sections || typeof sections !== "object") return false;

  const sectionKeys = Object.keys(sections);
  if (sectionKeys.length !== 1 || !sections["executive-summary"]) return false;
  if (sectionKeys.some((sectionKey) => sectionKey === "google-ads" || sectionKey === "meta-ads")) return false;

  const summaryMetrics = Array.isArray(sections["executive-summary"]?.metrics) ? sections["executive-summary"].metrics : [];
  if (summaryMetrics.length !== 1) return false;

  const metric = summaryMetrics[0];
  return (
    metric?.kind === "composite" &&
    String(metric?.key || "") === "cost" &&
    metric?.sourcePlatform === "mixed" &&
    String(metric?.primaryMetricKey || "") === "cost" &&
    String(metric?.secondaryMetricKey || "") === "cost"
  );
}

function migrateLegacyMixedCustomTemplateConfig(
  input: unknown,
  templateId: string,
  primaryObjective: MetaAdsObjectiveId | null
): unknown {
  if (templateId !== "custom" || !isLegacyMixedCustomTemplateConfig(input)) return input;
  const raw = input as Record<string, any>;
  const objectives = normalizeMetaAdsObjectives(raw.objectives || []);
  const normalizedPrimary = normalizeMetaAdsObjectives([raw.primaryObjective])[0] || primaryObjective || objectives[0] || null;

  return {
    version: 1,
    templateId: raw.templateId && raw.templateId !== "custom" ? raw.templateId : "g_ads_e_m_ads",
    objectives,
    primaryObjective: normalizedPrimary,
    sections: integratedDefaults(normalizedPrimary),
  };
}

function objectiveMetrics(objective: MetaAdsObjectiveId | null) {
  switch (objective) {
    case "leads":
      return [
        metricItem("conversions", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("reach", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("clicks", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("ctr", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      ];
    case "engajamento":
      return [
        metricItem("postEngagement", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("reach", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("clicks", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("ctr", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      ];
    case "trafego":
      return [
        metricItem("clicks", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpc", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("ctr", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("impressions", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      ];
    case "alcance":
      return [
        metricItem("reach", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("frequency", 30, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("impressions", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpc", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      ];
    case "vendas":
      return [
        metricItem("conversions", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("roas", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpa", 30, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("clicks", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("ctr", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      ];
    case "conversao":
    default:
      return [
        metricItem("conversions", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("cpa", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("ctr", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
        metricItem("impressions", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      ];
  }
}

function googleAdsDefaults(): Record<string, TemplateMetricSectionConfig> {
  return {
    "executive-summary": section("executive-summary", "Resumo Executivo", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("impressions", 30, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 40, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("ctr", 50, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("roas", 80, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    "google-ads": section("google-ads", "Google Ads", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("impressions", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 40, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("ctr", 50, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("roas", 80, { displayMode: "chart", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    campaigns: section("campaigns", "Campanhas", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("impressions", 20, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("ctr", 40, { displayMode: "table", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("conversions", 50, { displayMode: "table", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("cpa", 60, { displayMode: "table", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("roas", 70, { displayMode: "chart", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    keywords: section("keywords", "Palavras-chave", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("impressions", 20, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("ctr", 40, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("conversions", 50, { displayMode: "table", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    "search-terms": section("search-terms", "Termos de Pesquisa", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 20, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("ctr", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("conversions", 40, { displayMode: "table", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    "ads-assets": section("ads-assets", "Anúncios e Recursos", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 20, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("ctr", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("conversions", 40, { displayMode: "table", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    "negative-keywords": section("negative-keywords", "Palavras-chave Negativas", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("clicks", 20, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("impressions", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
    ]),
  };
}

function metaDefaults(primaryObjective: MetaAdsObjectiveId | null): Record<string, TemplateMetricSectionConfig> {
  const objMetrics = objectiveMetrics(primaryObjective);
  return {
    "executive-summary": section("executive-summary", "Resumo Executivo", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("reach", 30, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("clicks", 40, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("frequency", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("conversions", 60, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("cpa", 70, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      ...objMetrics.slice(0, 3),
    ]),
    campanhas: section("campanhas", "Campanhas", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("reach", 20, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("ctr", 40, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("conversions", 50, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("cpa", 60, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
    ]),
    conjuntos: section("conjuntos", "Conjuntos", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("reach", 20, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("cpa", 50, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
    ]),
    anuncios: section("anuncios", "Anúncios", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("reach", 20, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("cpa", 50, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
    ]),
    funil: section("funil", "Funil", [
      metricItem("impressions", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("reach", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("clicks", 30, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("conversions", 40, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("frequency", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("cpc", 60, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("cpm", 70, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
    ]),
    engajamento: section("engajamento", "Engajamento", [
      metricItem("postEngagement", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("postComments", 20, { displayMode: "table", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("postReactions", 30, { displayMode: "table", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("postShares", 40, { displayMode: "table", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("reach", 50, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
    ]),
  };
}

function integratedDefaults(primaryObjective: MetaAdsObjectiveId | null): Record<string, TemplateMetricSectionConfig> {
  const objMetrics = objectiveMetrics(primaryObjective);
  return {
    "executive-summary": section("executive-summary", "Resumo Executivo", [
      metricItem("cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("revenue", 20, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("impressions", 30, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("clicks", 40, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("reach", 50, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("frequency", 60, { displayMode: "text", recommended: true, sourcePlatform: "mixed" }),
      metricItem("conversions", 70, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("cpa", 80, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      metricItem("roas", 90, { displayMode: "card", recommended: true, sourcePlatform: "mixed" }),
      ...objMetrics.slice(0, 3),
    ]),
    "google-ads": section("google-ads", "Google Ads", [
      metricItem("google_cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("google_impressions", 20, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("google_clicks", 30, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("google_ctr", 40, { displayMode: "text", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("google_conversions", 50, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("google_cpa", 60, { displayMode: "card", recommended: true, sourcePlatform: "google_ads" }),
      metricItem("google_roas", 70, { displayMode: "chart", recommended: true, sourcePlatform: "google_ads" }),
    ]),
    "meta-ads": section("meta-ads", "Meta Ads", [
      metricItem("meta_cost", 10, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("meta_reach", 20, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("meta_clicks", 30, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("meta_conversions", 40, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("meta_cpa", 50, { displayMode: "card", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("meta_frequency", 60, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
      metricItem("meta_postEngagement", 70, { displayMode: "text", recommended: true, sourcePlatform: "meta_ads" }),
    ]),
  };
}

export function getMetricLabel(templateId: string, metricKey: string, primaryObjective?: MetaAdsObjectiveId | null): string {
  const isMetaLike = templateId === "meta_ads_s4x" || templateId === "google_meta_ads_s4x";
  const objective = normalizeMetaAdsObjectives([primaryObjective])[0] || null;

  if (metricKey.startsWith("google_")) {
    const baseKey = metricKey.replace(/^google_/, "");
    switch (baseKey) {
      case "cost":
        return "Investimento Google Ads";
      case "impressions":
        return "Impressões Google Ads";
      case "clicks":
        return "Cliques Google Ads";
      case "ctr":
        return "CTR Google Ads";
      case "cpc":
        return "CPC Google Ads";
      case "cpa":
        return "CPA Google Ads";
      case "roas":
        return "ROAS Google Ads";
      case "conversions":
        return "Conversões Google Ads";
      default:
        return `${getMetricLabel("google_ads_s4x", baseKey, primaryObjective)} Google Ads`;
    }
  }

  if (metricKey.startsWith("meta_")) {
    const baseKey = metricKey.replace(/^meta_/, "");
    switch (baseKey) {
      case "cost":
        return "Investimento Meta Ads";
      case "impressions":
        return "Impressões Meta Ads";
      case "reach":
        return "Alcance Meta Ads";
      case "clicks":
        return "Cliques Meta Ads";
      case "ctr":
        return "CTR Meta Ads";
      case "cpc":
        return "CPC Meta Ads";
      case "cpa":
        return "CPA Meta Ads";
      case "cpm":
        return "CPM Meta Ads";
      case "frequency":
        return "Frequência Meta Ads";
      case "postEngagement":
        return "Engajamentos Meta Ads";
      case "conversions":
        return "Conversões Meta Ads";
      case "roas":
        return "ROAS Meta Ads";
      default:
        return `${getMetricLabel("meta_ads_s4x", baseKey, primaryObjective)} Meta Ads`;
    }
  }

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
  } else if (templateId === "custom") {
    sections = customDefaults();
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

  const migratedInput = migrateLegacyIntegratedTemplateConfig(input, templateId);
  const migratedCustomInput = migrateLegacyMixedCustomTemplateConfig(migratedInput, templateId, defaults.primaryObjective);
  const raw = migratedCustomInput as Partial<DashboardTemplateMetricConfig> & { sections?: Record<string, Partial<TemplateMetricSectionConfig>> };
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
            sourcePlatform: item.sourcePlatform || defaultMetric?.sourcePlatform || inferMetricSourcePlatform(item.key) || inferSectionSourcePlatform(templateId, sectionKey),
            primarySourcePlatform: item.primarySourcePlatform || defaultMetric?.primarySourcePlatform || inferMetricSourcePlatform(item.primaryMetricKey || "") || inferSectionSourcePlatform(templateId, sectionKey),
            secondarySourcePlatform: item.secondarySourcePlatform || defaultMetric?.secondarySourcePlatform || inferMetricSourcePlatform(item.secondaryMetricKey || "") || inferSectionSourcePlatform(templateId, sectionKey),
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

  Object.entries(raw.sections || {}).forEach(([sectionKey, rawSection]) => {
    if (mergedSections[sectionKey]) return;
    const rawMetrics = Array.isArray(rawSection?.metrics) ? rawSection.metrics : [];
    mergedSections[sectionKey] = {
      key: sectionKey,
      label: rawSection?.label?.trim() || sectionKey,
      metrics: rawMetrics.map((item, index) => ({
        key: item.key,
        label: item.label?.trim() || getMetricLabel(templateId, item.key, primaryObjective),
        preview: item.preview?.trim() || undefined,
        kind: item.kind || "standard",
        sourcePlatform: item.sourcePlatform || inferMetricSourcePlatform(item.key) || inferSectionSourcePlatform(templateId, sectionKey),
        primarySourcePlatform: item.primarySourcePlatform || inferMetricSourcePlatform(item.primaryMetricKey || "") || inferSectionSourcePlatform(templateId, sectionKey),
        secondarySourcePlatform: item.secondarySourcePlatform || inferMetricSourcePlatform(item.secondaryMetricKey || "") || inferSectionSourcePlatform(templateId, sectionKey),
        compositeType: item.compositeType || "sum",
        primaryMetricKey: item.primaryMetricKey?.trim() || undefined,
        secondaryMetricKey: item.secondaryMetricKey?.trim() || undefined,
        enabled: item.enabled ?? true,
        displayMode: item.displayMode || DEFAULT_DISPLAY[item.key] || "card",
        order: item.order ?? (index + 1) * 10,
        recommended: item.recommended ?? false,
      })).sort((a, b) => a.order - b.order),
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
      return configMetric ? configMetric.enabled : false;
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
