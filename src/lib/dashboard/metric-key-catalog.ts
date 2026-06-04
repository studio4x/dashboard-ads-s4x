import { getDefaultTemplateMetricConfig, getMetricLabel } from "@/lib/dashboard/template-metric-config";
import { META_ADS_OBJECTIVES, type MetaAdsObjectiveId } from "@/lib/meta-ads/objectives";

export interface MetricKeySuggestion {
  key: string;
  label: string;
  sourceCount?: number;
  origin: "canonical" | "discovered";
  sourceRoles?: string[];
  sourceLabels?: string[];
}

const IGNORED_KEYS = new Set([
  "id",
  "uuid",
  "clientId",
  "dashboardId",
  "dataSourceId",
  "sourceId",
  "sourceType",
  "sourceSpreadsheetId",
  "source_role",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "importedAt",
  "imported_at",
  "startedAt",
  "started_at",
  "finishedAt",
  "finished_at",
  "durationMs",
  "duration_ms",
  "rowsRead",
  "rows_read",
  "count",
  "index",
  "order",
  "pageCount",
  "tabsRead",
  "tabs_read",
  "status",
  "platform",
  "label",
  "name",
  "title",
  "description",
  "date",
  "day",
  "value",
  "current",
  "previous",
  "change",
  "summary",
  "data",
  "result",
  "metric",
  "metrics",
  "fields",
  "diagnostics",
  "campaignName",
  "campaign_name",
  "campaignId",
  "campaign_id",
  "adSetName",
  "adSetId",
  "ad_name",
  "adName",
  "adGroup",
  "adGroupName",
  "keyword",
  "searchTerm",
  "search_term",
  "dimension",
  "dimension_value",
  "objective",
]);

const DEFAULT_SECTIONS = [
  "overview",
  "dailyPerformance",
  "google_ads",
  "meta_ads",
  "campaigns",
  "keywords",
  "searchTerms",
  "search_terms",
  "adGroups",
  "ad_groups",
  "adsAssets",
  "adsAndAssets",
  "negativeKeywords",
  "negative_keywords",
  "ga4_events",
  "audience",
  "search_console",
  "pages",
  "devices",
  "locations",
  "summary",
  "google_ads_summary",
  "meta_ads_summary",
  "dailyPerformanceSummary",
  "diagnostics",
  "googlePayload",
  "metaPayload",
];

const SOURCE_SPECIFIC_KEY_LABELS: Record<string, { label: string; sourceLabels: string[]; sourceRoles: string[] }> = {
  google_cost: {
    label: "Investimento Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_impressions: {
    label: "Impressões Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_clicks: {
    label: "Cliques Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_ctr: {
    label: "CTR Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_cpc: {
    label: "CPC Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_cpa: {
    label: "CPA Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_roas: {
    label: "ROAS Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  google_conversions: {
    label: "Conversões Google Ads",
    sourceLabels: ["Google Ads"],
    sourceRoles: ["google_ads"],
  },
  meta_cost: {
    label: "Investimento Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_impressions: {
    label: "Impressões Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_reach: {
    label: "Alcance Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_clicks: {
    label: "Cliques Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_ctr: {
    label: "CTR Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_cpc: {
    label: "CPC Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_cpa: {
    label: "CPA Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_cpm: {
    label: "CPM Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_frequency: {
    label: "Frequência Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_postEngagement: {
    label: "Engajamentos Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
  meta_conversions: {
    label: "Conversões Meta Ads",
    sourceLabels: ["Meta Ads"],
    sourceRoles: ["meta_ads"],
  },
};

function isNumericLike(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    return normalized !== "" && !Number.isNaN(Number(normalized));
  }
  return false;
}

function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function buildCanonicalSuggestion(key: string): MetricKeySuggestion {
  const sourceSpecific = SOURCE_SPECIFIC_KEY_LABELS[key];
  const label = sourceSpecific?.label || getMetricLabel("google_meta_ads_s4x", key as any) || humanizeKey(key);
  return {
    key,
    label,
    origin: "canonical",
    ...(sourceSpecific
      ? {
          sourceLabels: sourceSpecific.sourceLabels,
          sourceRoles: sourceSpecific.sourceRoles,
        }
      : {}),
  };
}

function collectCanonicalMetricKeys() {
  const suggestions = new Map<string, MetricKeySuggestion>();

  Object.keys(SOURCE_SPECIFIC_KEY_LABELS).forEach((key) => {
    suggestions.set(key, buildCanonicalSuggestion(key));
  });

  const templates = [
    getDefaultTemplateMetricConfig("google_ads_s4x"),
    ...META_ADS_OBJECTIVES.flatMap((objective) => [
      getDefaultTemplateMetricConfig("meta_ads_s4x", [objective.id], objective.id),
      getDefaultTemplateMetricConfig("google_meta_ads_s4x", [objective.id], objective.id),
    ]),
  ];

  templates.forEach((template) => {
    Object.values(template.sections).forEach((section) => {
      section.metrics.forEach((metric) => {
        if (!suggestions.has(metric.key)) {
          suggestions.set(metric.key, buildCanonicalSuggestion(metric.key));
        }
      });
    });
  });

  return Array.from(suggestions.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export const CANONICAL_METRIC_KEY_SUGGESTIONS = collectCanonicalMetricKeys();

export function buildMetricKeySuggestionMap() {
  return new Map(CANONICAL_METRIC_KEY_SUGGESTIONS.map((item) => [item.key, item]));
}

export function isMetricKeyCandidate(key: string, value: unknown) {
  if (!key) return false;
  if (IGNORED_KEYS.has(key)) return false;
  if (key.endsWith("_id") || key.endsWith("Id")) return false;
  if (key.endsWith("_name") || key.endsWith("Name")) return false;
  if (key.endsWith("_label") || key.endsWith("Label")) return false;
  if (key.endsWith("_status") || key.endsWith("Status")) return false;

  return isNumericLike(value);
}

export function collectMetricKeysFromPayload(payload: unknown) {
  const keys = new Map<string, number>();

  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;

    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      if (isMetricKeyCandidate(key, nested)) {
        keys.set(key, (keys.get(key) || 0) + 1);
      }
      visit(nested);
    });
  };

  visit(payload);

  return Array.from(keys.entries())
    .map(([key, sourceCount]) => ({
      key,
      label: buildCanonicalSuggestion(key).label || humanizeKey(key),
      origin: "discovered" as const,
      sourceCount,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function mergeMetricKeySuggestions(discovered: MetricKeySuggestion[]) {
  const canonicalMap = buildMetricKeySuggestionMap();
  const merged = new Map<string, MetricKeySuggestion>();

  CANONICAL_METRIC_KEY_SUGGESTIONS.forEach((item) => merged.set(item.key, item));
  discovered.forEach((item) => {
    const canonical = canonicalMap.get(item.key);
    merged.set(item.key, canonical ? { ...canonical, sourceCount: item.sourceCount } : item);
  });

  return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
}
