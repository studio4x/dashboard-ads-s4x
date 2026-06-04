"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, GripVertical, Loader2, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { DASHBOARD_PAGES } from "@/lib/constants";
import {
  getDefaultTemplateMetricConfig,
  getTemplateMetricLabel,
  normalizeTemplateMetricConfig,
  type TemplateMetricCompositeType,
  type DashboardTemplateMetricConfig,
  type MetricDisplayMode,
  type TemplateMetricKind,
  type TemplateMetricItem,
  type TemplateMetricSourcePlatform,
} from "@/lib/dashboard/template-metric-config";
import { CANONICAL_METRIC_KEY_SUGGESTIONS, type MetricKeySuggestion } from "@/lib/dashboard/metric-key-catalog";
import { META_ADS_OBJECTIVES, getMetaObjectiveLabel, normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";

interface TemplateMetricsConfigModalProps {
  template: any | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}

const DISPLAY_MODE_OPTIONS: Array<{ value: MetricDisplayMode; label: string }> = [
  { value: "card", label: "Card" },
  { value: "text", label: "Texto" },
  { value: "chart", label: "Gráfico" },
  { value: "table", label: "Tabela" },
];

const METRIC_KIND_OPTIONS: Array<{ value: TemplateMetricKind; label: string }> = [
  { value: "standard", label: "Simples" },
  { value: "composite", label: "Composta" },
];

const SOURCE_PLATFORM_OPTIONS: Array<{ value: Exclude<TemplateMetricSourcePlatform, "mixed">; label: string }> = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
];

const COMPOSITE_SOURCE_OPTIONS: Array<{ value: TemplateMetricSourcePlatform; label: string }> = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "mixed", label: "Múltiplas origens" },
];

const COMPOSITE_TYPE_OPTIONS: Array<{ value: TemplateMetricCompositeType; label: string }> = [
  { value: "sum", label: "Soma" },
  { value: "subtract", label: "Subtracao" },
  { value: "average", label: "Media" },
  { value: "ratio_percent", label: "Taxa (%)" },
  { value: "ratio_currency", label: "Custo por resultado" },
  { value: "ratio_multiplier", label: "Multiplicador (ROAS)" },
  { value: "ratio_number", label: "Razao numerica" },
  { value: "per_thousand_currency", label: "CPM" },
];

export function TemplateMetricsConfigModal({ template, open, onClose, onSaved }: TemplateMetricsConfigModalProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<DashboardTemplateMetricConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragState, setDragState] = useState<{ sectionKey: string; metricKey: string } | null>(null);
  const [metricKeySuggestions, setMetricKeySuggestions] = useState<MetricKeySuggestion[]>(CANONICAL_METRIC_KEY_SUGGESTIONS);
  const [metricKeyLoading, setMetricKeyLoading] = useState(false);
  const [metricKeyError, setMetricKeyError] = useState<string | null>(null);
  const [visiblePages, setVisiblePages] = useState<string[]>([]);
  const [newPageKey, setNewPageKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, {
    label: string;
    key: string;
    preview: string;
    kind: TemplateMetricKind;
    sourcePlatform: TemplateMetricSourcePlatform;
    primarySourcePlatform: TemplateMetricSourcePlatform;
    secondarySourcePlatform: TemplateMetricSourcePlatform;
    compositeType: TemplateMetricCompositeType;
    primaryMetricKey: string;
    secondaryMetricKey: string;
    suggestionKey: string;
    displayMode: MetricDisplayMode;
    enabled: boolean;
  }>>({});

  const templateId = template?.id || "google_ads_s4x";
  const baseTemplateId = template?.baseTemplateId || template?.sheetTemplateId || templateId;
  const templateName = template?.name || "Template";
  const isMetaTemplate = baseTemplateId === "meta_ads_s4x" || baseTemplateId === "google_meta_ads_s4x";
  const isCustomTemplate = Boolean(template?.isCustom);
  const isBaselessTemplate = !template?.baseTemplateId && baseTemplateId === "custom";
  const rawMetricConfig = template?.metric_config || template?.metricConfig || null;

  const templateObjectives = useMemo(
    () => normalizeMetaAdsObjectives((rawMetricConfig as any)?.objectives || []),
    [rawMetricConfig]
  );
  const primaryObjective =
    normalizeMetaAdsObjectives([(rawMetricConfig as any)?.primaryObjective])[0] || templateObjectives[0] || null;

  const getPreviewPlaceholder = (displayMode: MetricDisplayMode) => {
    switch (displayMode) {
      case "text":
        return "Ex.: 12.5%";
      case "chart":
        return "Ex.: Série do gráfico";
      case "table":
        return "Ex.: Linha da tabela";
      case "card":
      default:
        return "Ex.: R$ 0,00";
    }
  };

  const getMetricKeyOrigins = (item: MetricKeySuggestion) => {
    if (item.origin === "canonical") return ["Padrão do sistema"];
    if (item.sourceLabels && item.sourceLabels.length > 0) return item.sourceLabels;
    return ["Fonte importada"];
  };

  const getSourceLabel = (sourcePlatform?: TemplateMetricSourcePlatform) => {
    if (sourcePlatform === "google_ads") return "Google Ads";
    if (sourcePlatform === "meta_ads") return "Meta Ads";
    if (sourcePlatform === "mixed") return "Múltiplas origens";
    return "Google Ads";
  };

  const formatMetricSuggestionLabel = (item: MetricKeySuggestion) => {
    const origins = item.origin === "canonical" ? ["Sistema"] : getMetricKeyOrigins(item);
    return `${item.key} - ${item.label} (${origins.join(" / ")})`;
  };

  const filterSuggestionsBySource = (sourcePlatform: TemplateMetricSourcePlatform) => {
    const googleCanonical = new Set(["cost", "impressions", "clicks", "ctr", "cpc", "cpa", "roas", "conversions"]);
    const metaCanonical = new Set(["cost", "impressions", "reach", "clicks", "ctr", "cpc", "cpa", "conversions", "frequency", "postEngagement", "postComments", "postReactions", "postShares", "cpm"]);

    return metricKeySuggestions.filter((item) => {
      if (sourcePlatform === "mixed") {
        if (item.origin === "discovered") {
          return !item.sourceRoles || item.sourceRoles.length === 0 || item.sourceRoles.includes("google_ads") || item.sourceRoles.includes("meta_ads");
        }
        return googleCanonical.has(item.key) || metaCanonical.has(item.key);
      }
      if (item.origin === "discovered") {
        if (!item.sourceRoles || item.sourceRoles.length === 0) return true;
        return item.sourceRoles.includes(sourcePlatform);
      }
      return sourcePlatform === "google_ads"
        ? googleCanonical.has(item.key)
        : metaCanonical.has(item.key);
    });
  };

  useEffect(() => {
    if (!open || !template) return;
    const nextConfig = normalizeTemplateMetricConfig(
      rawMetricConfig,
      baseTemplateId,
      templateObjectives,
      primaryObjective
    );
    setConfig(nextConfig);
    setVisiblePages(Array.isArray(template?.visiblePages) ? template.visiblePages : Object.keys(nextConfig.sections || {}));
    setNewPageKey("");
  }, [open, template, baseTemplateId, rawMetricConfig, templateObjectives, primaryObjective]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setMetricKeyLoading(true);
    setMetricKeyError(null);

    fetch("/api/admin/template-metric-keys", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || "Não foi possível carregar as chaves.");
        }
        return result.suggestions as MetricKeySuggestion[];
      })
      .then((suggestions) => {
        if (!mounted) return;
        setMetricKeySuggestions(
          Array.isArray(suggestions) && suggestions.length > 0
            ? suggestions
            : CANONICAL_METRIC_KEY_SUGGESTIONS
        );
      })
      .catch((error) => {
        if (!mounted) return;
        setMetricKeySuggestions(CANONICAL_METRIC_KEY_SUGGESTIONS);
        setMetricKeyError(error instanceof Error ? error.message : "Erro ao carregar chaves.");
      })
      .finally(() => {
        if (mounted) setMetricKeyLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDrafts({});
  }, [open, templateId]);

  if (!open || !template || !config) return null;

  const resetToDefaults = () => {
    const defaults = getDefaultTemplateMetricConfig(baseTemplateId, templateObjectives, primaryObjective);
    setConfig(defaults);
    setVisiblePages(Object.keys(defaults.sections || {}));
  };

  const updateMetric = (sectionKey: string, metricKey: string, updater: (metric: any) => any) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const section = prev.sections[sectionKey];
      if (!section) return prev;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            ...section,
            metrics: section.metrics.map((metric) => metric.key === metricKey ? updater(metric) : metric),
          },
        },
      };
    });
  };

  const toggleMetric = (sectionKey: string, metricKey: string) => {
    updateMetric(sectionKey, metricKey, (metric) => ({ ...metric, enabled: !metric.enabled }));
  };

  const deleteMetric = (sectionKey: string, metricKey: string) => {
    const section = config?.sections?.[sectionKey];
    const metric = section?.metrics.find((item) => item.key === metricKey);
    if (!metric) return;

    const warning = metric.recommended
      ? `Esta métrica é recomendada pelo template. Excluir pode remover um KPI essencial. Deseja continuar?`
      : `Excluir a métrica "${getTemplateMetricLabel(baseTemplateId, metric, primaryObjective)}"?`;

    if (!window.confirm(warning)) return;
    if (metric.recommended && !window.confirm("Confirme novamente a exclusão desta métrica recomendada.")) return;

    setConfig((prev) => {
      if (!prev) return prev;
      const section = prev.sections[sectionKey];
      if (!section) return prev;

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            ...section,
            metrics: section.metrics
              .filter((metric) => metric.key !== metricKey)
              .map((metric, index) => ({
                ...metric,
                order: (index + 1) * 10,
              })),
          },
        },
      };
    });
  };

  const updateDraft = (
    sectionKey: string,
    field: "label" | "key" | "preview" | "kind" | "sourcePlatform" | "compositeType" | "primaryMetricKey" | "secondaryMetricKey" | "displayMode" | "enabled",
    value: string | boolean
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: {
        label: prev[sectionKey]?.label || "",
        key: prev[sectionKey]?.key || "",
        preview: prev[sectionKey]?.preview || "",
        kind: prev[sectionKey]?.kind || "standard",
        sourcePlatform: prev[sectionKey]?.sourcePlatform || "google_ads",
        primarySourcePlatform: prev[sectionKey]?.primarySourcePlatform || "google_ads",
        secondarySourcePlatform: prev[sectionKey]?.secondarySourcePlatform || "meta_ads",
        compositeType: prev[sectionKey]?.compositeType || "sum",
        primaryMetricKey: prev[sectionKey]?.primaryMetricKey || "",
        secondaryMetricKey: prev[sectionKey]?.secondaryMetricKey || "",
        suggestionKey: prev[sectionKey]?.suggestionKey || "",
        displayMode: prev[sectionKey]?.displayMode || "card",
        enabled: prev[sectionKey]?.enabled ?? true,
        [field]: value,
      },
    }));
  };

  const addManualMetric = (sectionKey: string) => {
    const draft = drafts[sectionKey];
    const label = String(draft?.label || "").trim();
    const key = String(draft?.key || "").trim();
    const preview = String(draft?.preview || "").trim();
    const kind = draft?.kind || "standard";
    const sourcePlatform = draft?.sourcePlatform || "google_ads";
    const primarySourcePlatform = draft?.primarySourcePlatform || "google_ads";
    const secondarySourcePlatform = draft?.secondarySourcePlatform || "meta_ads";
    const compositeType = draft?.compositeType || "sum";
    const primaryMetricKey = String(draft?.primaryMetricKey || "").trim();
    const secondaryMetricKey = String(draft?.secondaryMetricKey || "").trim();
    const suggestionKey = String(draft?.suggestionKey || "").trim();
    const resolvedKey = suggestionKey || key;

    if (!label || !resolvedKey) {
      toast("Informe nome e chave da métrica.");
      return;
    }
    if (kind === "composite" && (!primaryMetricKey || !secondaryMetricKey)) {
      toast("Selecione as duas métricas base do KPI composto.");
      return;
    }

    setConfig((prev) => {
      if (!prev) return prev;
      const section = prev.sections[sectionKey];
      if (!section) return prev;
      if (section.metrics.some((metric) => metric.key === resolvedKey)) {
        toast("Já existe uma métrica com essa chave nesta seção.");
        return prev;
      }

      const nextMetric: TemplateMetricItem = {
        key: resolvedKey,
        label,
        preview: preview || undefined,
        kind,
        sourcePlatform: kind === "composite" ? "mixed" : sourcePlatform,
        primarySourcePlatform: kind === "composite" ? primarySourcePlatform : undefined,
        secondarySourcePlatform: kind === "composite" ? secondarySourcePlatform : undefined,
        compositeType: kind === "composite" ? compositeType : undefined,
        primaryMetricKey: kind === "composite" ? primaryMetricKey : undefined,
        secondaryMetricKey: kind === "composite" ? secondaryMetricKey : undefined,
        enabled: draft?.enabled ?? true,
        displayMode: draft?.displayMode || "card",
        order: (section.metrics.length + 1) * 10,
        recommended: false,
      };

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            ...section,
            metrics: [...section.metrics, nextMetric],
          },
        },
      };
    });

    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: {
        label: "",
        key: "",
        preview: "",
        kind: "standard",
        sourcePlatform: "google_ads",
        primarySourcePlatform: "google_ads",
        secondarySourcePlatform: "meta_ads",
        compositeType: "sum",
        primaryMetricKey: "",
        secondaryMetricKey: "",
        suggestionKey: "",
        displayMode: "card",
        enabled: true,
      },
    }));
  };

  const toggleObjective = (objective: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const objectives = normalizeMetaAdsObjectives(prev.objectives || []);
      const has = objectives.includes(objective as any);
      const nextObjectives = has
        ? objectives.filter((item) => item !== objective)
        : [...objectives, objective as any];
      const nextPrimary = prev.primaryObjective && nextObjectives.includes(prev.primaryObjective as any)
        ? prev.primaryObjective
        : nextObjectives[0] || null;
      return {
        ...prev,
        objectives: nextObjectives as any,
        primaryObjective: nextPrimary as any,
      };
    });
  };

  const reorderMetrics = (sectionKey: string, sourceMetricKey: string, targetMetricKey: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const section = prev.sections[sectionKey];
      if (!section) return prev;

      const sourceIndex = section.metrics.findIndex((metric) => metric.key === sourceMetricKey);
      const targetIndex = section.metrics.findIndex((metric) => metric.key === targetMetricKey);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return prev;

      const nextMetrics = [...section.metrics];
      const [moved] = nextMetrics.splice(sourceIndex, 1);
      nextMetrics.splice(targetIndex, 0, moved);

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            ...section,
            metrics: nextMetrics.map((metric, index) => ({
              ...metric,
              order: (index + 1) * 10,
            })),
          },
        },
      };
    });
  };

  const availablePageOptions = DASHBOARD_PAGES.filter((page) => !visiblePages.includes(page.key));

  const getSuggestionOptionsForMetric = (sourcePlatform: TemplateMetricSourcePlatform, kind: TemplateMetricKind) => {
    const baseSuggestions = filterSuggestionsBySource(sourcePlatform);
    if (kind === "composite") return baseSuggestions;
    return baseSuggestions;
  };

  const getMetricBaseOptions = (sectionKey: string, sourcePlatform: TemplateMetricSourcePlatform) => {
    const section = config.sections?.[sectionKey];
    const fromSection = (section?.metrics || [])
      .filter((metric) => (metric.kind || "standard") === "standard")
      .map((metric) => ({
        key: metric.key,
        label: getTemplateMetricLabel(baseTemplateId, metric, primaryObjective),
        origin: metric.sourcePlatform === "mixed" ? ["Múltiplas origens"] : [getSourceLabel(metric.sourcePlatform)],
      }));

    const fromSuggestions = filterSuggestionsBySource(sourcePlatform).map((item) => ({
      key: item.key,
      label: item.label,
      origin: item.origin === "canonical" ? ["Sistema"] : getMetricKeyOrigins(item),
    }));

    const merged = new Map<string, { key: string; label: string; origin: string[] }>();
    [...fromSection, ...fromSuggestions].forEach((item) => {
      if (!merged.has(item.key)) merged.set(item.key, item);
    });

    return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
  };

  const addPageSection = () => {
    if (!newPageKey) {
      toast("Selecione uma aba para adicionar.");
      return;
    }
    const page = DASHBOARD_PAGES.find((item) => item.key === newPageKey);
    if (!page) {
      toast("Aba inválida.");
      return;
    }

    setVisiblePages((prev) => [...prev, page.key]);
    setConfig((prev) => {
      if (!prev || prev.sections[page.key]) return prev;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [page.key]: {
            key: page.key,
            label: page.label,
            metrics: [],
          },
        },
      };
    });
    setNewPageKey("");
  };

  const removePageSection = (sectionKey: string) => {
    if (!window.confirm(`Remover a aba "${sectionKey}" deste template?`)) return;
    setVisiblePages((prev) => prev.filter((key) => key !== sectionKey));
    setConfig((prev) => {
      if (!prev) return prev;
      const nextSections = { ...prev.sections };
      delete nextSections[sectionKey];
      return {
        ...prev,
        sections: nextSections,
      };
    });
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          templateId: template.id,
          metric_config: config,
          visible_pages: visiblePages,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao salvar template.");
      }
      if (result.template?.metricConfig || result.normalized) {
        const nextConfig = normalizeTemplateMetricConfig(
          result.template?.metricConfig || result.normalized,
          baseTemplateId,
          templateObjectives,
          primaryObjective
        );
        setConfig(nextConfig);
      }
      toast("Template atualizado.");
      await onSaved?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao salvar template.");
    } finally {
      setIsSaving(false);
    }
  };

  const sections = visiblePages
    .map((pageKey) => config.sections?.[pageKey])
    .filter(Boolean);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.58)", zIndex: 100, padding: 20, overflowY: "auto" }}>
      <div className="card" style={{ width: "100%", maxWidth: 1120, height: "calc(100vh - 40px)", margin: "auto", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", background: "#F8FAFC" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Configurar Template</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
              Template: <strong>{templateName}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, minHeight: 0, flex: "1 1 0", scrollbarGutter: "stable" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
            <div style={{ padding: 14, borderRadius: 10, border: "1px solid #DBEAFE", background: "#EFF6FF" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>Template ID</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{templateId}</p>
            </div>
            <div style={{ padding: 14, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Objetivos padrão</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                {templateObjectives.length > 0 ? templateObjectives.map((objective) => getMetaObjectiveLabel(objective)).join(" · ") : "Nenhum"}
              </p>
            </div>
          </div>

          {isMetaTemplate && (
            <div style={{ borderRadius: 10, border: "1px solid #C7D2FE", background: "#EEF2FF", padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#3730A3" }}>Objetivos do template</p>
              <p style={{ fontSize: 12, color: "#4338CA", marginTop: 4, lineHeight: 1.5 }}>
                A configuração abaixo define as métricas principais do template e serve de padrão para dashboards novos criados a partir dele. O dashboard ajusta apenas os objetivos Meta quando necessário.
              </p>
              <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginTop: 12 }}>
                {META_ADS_OBJECTIVES.map((objective) => {
                  const active = config?.objectives?.includes(objective.id as any) || false;
                  return (
                    <button
                      key={objective.id}
                      type="button"
                      onClick={() => toggleObjective(objective.id)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
                        background: active ? "#EFF6FF" : "#FFFFFF",
                        color: active ? "#1D4ED8" : "#475569",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {objective.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isCustomTemplate && (
            <div style={{ borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Abas do template</p>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
                  {isBaselessTemplate
                    ? "Este template foi criado sem base. Adicione as abas primeiro e depois configure as métricas de cada uma."
                    : "Você pode complementar a estrutura do template adicionando abas já suportadas pela plataforma."}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto", gap: 10, alignItems: "end" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Adicionar aba</span>
                  <select
                    value={newPageKey}
                    onChange={(e) => setNewPageKey(e.target.value)}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                  >
                    <option value="">Selecione uma aba</option>
                    {availablePageOptions.map((page) => (
                      <option key={page.key} value={page.key}>
                        {page.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={addPageSection}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 38, padding: "9px 12px", borderRadius: 8, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <Plus size={14} />
                  Adicionar aba
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {visiblePages.length > 0 ? visiblePages.map((pageKey) => {
                  const page = DASHBOARD_PAGES.find((item) => item.key === pageKey);
                  return (
                    <span key={pageKey} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#334155", fontSize: 12, fontWeight: 600 }}>
                      {page?.label || pageKey}
                    </span>
                  );
                }) : (
                  <span style={{ fontSize: 12, color: "#64748B" }}>Nenhuma aba adicionada ainda.</span>
                )}
              </div>
            </div>
          )}

          {sections.length === 0 && (
            <div style={{ padding: 18, borderRadius: 14, border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: 13 }}>
              Nenhuma aba configurada ainda. Adicione pelo menos uma aba para começar a montar este template.
            </div>
          )}

          {sections.map((section) => (
            <div key={section.key} style={{ border: "1px solid #E2E8F0", borderRadius: 14, background: "#FFFFFF", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#F8FAFC" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{section.label}</p>
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Selecione as métricas que devem aparecer e o formato de cada uma.
                  </p>
                  <p style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
                    {section.metrics.length} métricas nesta seção
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <RotateCcw size={14} /> Restaurar defaults
                  </button>
                  {isCustomTemplate && (
                    <button
                      type="button"
                      onClick={() => removePageSection(section.key)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                      Remover aba
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ border: "1px dashed #CBD5E1", borderRadius: 12, padding: 14, background: "#F8FAFC", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Tipo</span>
                    <select
                      value={drafts[section.key]?.kind || "standard"}
                      onChange={(e) => {
                        const nextKind = e.target.value as TemplateMetricKind;
                        setDrafts((prev) => ({
                          ...prev,
                          [section.key]: {
                            label: prev[section.key]?.label || "",
                            key: prev[section.key]?.key || "",
                            preview: prev[section.key]?.preview || "",
                            kind: nextKind,
                            sourcePlatform: nextKind === "composite" ? "mixed" : "google_ads",
                            primarySourcePlatform: prev[section.key]?.primarySourcePlatform || "google_ads",
                            secondarySourcePlatform: prev[section.key]?.secondarySourcePlatform || "meta_ads",
                            compositeType: nextKind === "composite" ? (prev[section.key]?.compositeType || "sum") : "sum",
                            primaryMetricKey: nextKind === "composite" ? (prev[section.key]?.primaryMetricKey || "") : "",
                            secondaryMetricKey: nextKind === "composite" ? (prev[section.key]?.secondaryMetricKey || "") : "",
                            suggestionKey: "",
                            displayMode: prev[section.key]?.displayMode || "card",
                            enabled: prev[section.key]?.enabled ?? true,
                          },
                        }));
                      }}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    >
                      {METRIC_KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Nome</span>
                    <input
                      value={drafts[section.key]?.label || ""}
                      onChange={(e) => updateDraft(section.key, "label", e.target.value)}
                      placeholder="Ex.: Ticket Médio"
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Origem da métrica</span>
                    <select
                      value={drafts[section.key]?.sourcePlatform || ((drafts[section.key]?.kind || "standard") === "composite" ? "mixed" : "google_ads")}
                      onChange={(e) => {
                        const nextSource = e.target.value as TemplateMetricSourcePlatform;
                        setDrafts((prev) => ({
                          ...prev,
                          [section.key]: {
                            label: prev[section.key]?.label || "",
                            key: nextSource === "mixed" ? prev[section.key]?.key || "" : "",
                            preview: prev[section.key]?.preview || "",
                            kind: prev[section.key]?.kind || "standard",
                            sourcePlatform: nextSource,
                            primarySourcePlatform: prev[section.key]?.primarySourcePlatform || "google_ads",
                            secondarySourcePlatform: prev[section.key]?.secondarySourcePlatform || "meta_ads",
                            compositeType: prev[section.key]?.compositeType || "sum",
                            primaryMetricKey: prev[section.key]?.primaryMetricKey || "",
                            secondaryMetricKey: prev[section.key]?.secondaryMetricKey || "",
                            suggestionKey: "",
                            displayMode: prev[section.key]?.displayMode || "card",
                            enabled: prev[section.key]?.enabled ?? true,
                          },
                        }));
                      }}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    >
                      {((drafts[section.key]?.kind || "standard") === "composite" ? COMPOSITE_SOURCE_OPTIONS : SOURCE_PLATFORM_OPTIONS).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 10, color: "#64748B" }}>
                      {(drafts[section.key]?.kind || "standard") === "composite"
                        ? "A métrica composta pode cruzar Google Ads e Meta Ads. As bases abaixo usam origem própria."
                        : "Use esta origem para filtrar as sugestões de chave e evitar puxar dados da plataforma errada."}
                    </span>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Sugestões com origem</span>
                    <select
                      value={drafts[section.key]?.suggestionKey || ""}
                      onChange={(e) => {
                        const suggestionKey = e.target.value;
                        const selectedSuggestion = getSuggestionOptionsForMetric(
                          (drafts[section.key]?.kind || "standard") === "composite"
                            ? (drafts[section.key]?.sourcePlatform || "mixed")
                            : (drafts[section.key]?.sourcePlatform || "google_ads"),
                          drafts[section.key]?.kind || "standard"
                        ).find((item) => item.key === suggestionKey);
                        setDrafts((prev) => ({
                          ...prev,
                          [section.key]: {
                            label: prev[section.key]?.label || selectedSuggestion?.label || "",
                            key: suggestionKey || "",
                            preview: prev[section.key]?.preview || "",
                            kind: prev[section.key]?.kind || "standard",
                            sourcePlatform: prev[section.key]?.sourcePlatform || "google_ads",
                            primarySourcePlatform: prev[section.key]?.primarySourcePlatform || "google_ads",
                            secondarySourcePlatform: prev[section.key]?.secondarySourcePlatform || "meta_ads",
                            compositeType: prev[section.key]?.compositeType || "sum",
                            primaryMetricKey: prev[section.key]?.primaryMetricKey || "",
                            secondaryMetricKey: prev[section.key]?.secondaryMetricKey || "",
                            suggestionKey,
                            displayMode: prev[section.key]?.displayMode || "card",
                            enabled: prev[section.key]?.enabled ?? true,
                          },
                        }));
                      }}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    >
                      <option value="">{metricKeyLoading ? "Carregando sugestões..." : "Selecione uma chave sugerida"}</option>
                      {getSuggestionOptionsForMetric(
                        (drafts[section.key]?.kind || "standard") === "composite"
                          ? (drafts[section.key]?.sourcePlatform || "mixed")
                          : (drafts[section.key]?.sourcePlatform || "google_ads"),
                        drafts[section.key]?.kind || "standard"
                      ).map((item) => (
                        <option key={`${item.key}-${item.origin}`} value={item.key}>
                          {formatMetricSuggestionLabel(item)}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: 10, color: "#64748B" }}>
                      A lista combina chaves do sistema com métricas detectadas nas fontes já importadas.
                    </span>
                  </label>
                  {!drafts[section.key]?.suggestionKey && (
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Chave</span>
                      <input
                        value={drafts[section.key]?.key || ""}
                        onChange={(e) => updateDraft(section.key, "key", e.target.value)}
                        placeholder="Ex.: cost, impressions, custom_metric"
                        style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                      />
                      <span style={{ fontSize: 10, color: "#64748B" }}>
                        {metricKeyLoading
                          ? "Carregando chaves das fontes Google Sheets..."
                          : "Identificador técnico usado para casar a métrica com a coluna/field importado do Google Sheets ou com um KPI calculado."}
                      </span>
                      {metricKeyError && (
                        <span style={{ fontSize: 10, color: "#B45309" }}>
                          Sugestões carregadas apenas com as chaves padrão: {metricKeyError}
                        </span>
                      )}
                    </label>
                  )}
                  {drafts[section.key]?.suggestionKey && (
                    <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1FAE5", background: "#ECFDF5", color: "#166534", fontSize: 12, fontWeight: 600 }}>
                      Chave preenchida automaticamente pela sugestão: <strong>{drafts[section.key]?.suggestionKey}</strong>
                    </div>
                  )}
                  {(drafts[section.key]?.kind || "standard") === "composite" && (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Unificacao</span>
                        <select
                          value={drafts[section.key]?.compositeType || "sum"}
                          onChange={(e) => updateDraft(section.key, "compositeType", e.target.value as TemplateMetricCompositeType)}
                          style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                        >
                          {COMPOSITE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Origem da base 1</span>
                        <select
                          value={drafts[section.key]?.primarySourcePlatform || "google_ads"}
                          onChange={(e) => {
                            const nextSource = e.target.value as TemplateMetricSourcePlatform;
                            setDrafts((prev) => ({
                              ...prev,
                              [section.key]: {
                                label: prev[section.key]?.label || "",
                                key: prev[section.key]?.key || "",
                                preview: prev[section.key]?.preview || "",
                                kind: prev[section.key]?.kind || "composite",
                                sourcePlatform: prev[section.key]?.sourcePlatform || "mixed",
                                primarySourcePlatform: nextSource,
                                secondarySourcePlatform: prev[section.key]?.secondarySourcePlatform || "meta_ads",
                                compositeType: prev[section.key]?.compositeType || "sum",
                                primaryMetricKey: "",
                                secondaryMetricKey: prev[section.key]?.secondaryMetricKey || "",
                                suggestionKey: prev[section.key]?.suggestionKey || "",
                                displayMode: prev[section.key]?.displayMode || "card",
                                enabled: prev[section.key]?.enabled ?? true,
                              },
                            }));
                          }}
                          style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                        >
                          {SOURCE_PLATFORM_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Métrica base 1</span>
                        <select
                          value={drafts[section.key]?.primaryMetricKey || ""}
                          onChange={(e) => updateDraft(section.key, "primaryMetricKey", e.target.value)}
                          style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                        >
                          <option value="">Selecione</option>
                          {getMetricBaseOptions(section.key, drafts[section.key]?.primarySourcePlatform || "google_ads")
                            .map((metric) => (
                              <option key={metric.key} value={metric.key}>
                                {metric.label} ({metric.origin.join(" / ")})
                              </option>
                            ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Origem da base 2</span>
                        <select
                          value={drafts[section.key]?.secondarySourcePlatform || "meta_ads"}
                          onChange={(e) => {
                            const nextSource = e.target.value as TemplateMetricSourcePlatform;
                            setDrafts((prev) => ({
                              ...prev,
                              [section.key]: {
                                label: prev[section.key]?.label || "",
                                key: prev[section.key]?.key || "",
                                preview: prev[section.key]?.preview || "",
                                kind: prev[section.key]?.kind || "composite",
                                sourcePlatform: prev[section.key]?.sourcePlatform || "mixed",
                                primarySourcePlatform: prev[section.key]?.primarySourcePlatform || "google_ads",
                                secondarySourcePlatform: nextSource,
                                compositeType: prev[section.key]?.compositeType || "sum",
                                primaryMetricKey: prev[section.key]?.primaryMetricKey || "",
                                secondaryMetricKey: "",
                                suggestionKey: prev[section.key]?.suggestionKey || "",
                                displayMode: prev[section.key]?.displayMode || "card",
                                enabled: prev[section.key]?.enabled ?? true,
                              },
                            }));
                          }}
                          style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                        >
                          {SOURCE_PLATFORM_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Métrica base 2</span>
                        <select
                          value={drafts[section.key]?.secondaryMetricKey || ""}
                          onChange={(e) => updateDraft(section.key, "secondaryMetricKey", e.target.value)}
                          style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                        >
                          <option value="">Selecione</option>
                          {getMetricBaseOptions(section.key, drafts[section.key]?.secondarySourcePlatform || "meta_ads")
                            .map((metric) => (
                              <option key={metric.key} value={metric.key}>
                                {metric.label} ({metric.origin.join(" / ")})
                              </option>
                            ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Preview / exemplo</span>
                    <input
                      value={drafts[section.key]?.preview || ""}
                      onChange={(e) => updateDraft(section.key, "preview", e.target.value)}
                      placeholder={getPreviewPlaceholder(drafts[section.key]?.displayMode || "card")}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    />
                    <span style={{ fontSize: 10, color: "#64748B" }}>
                      Valor opcional de exibição. O formato visual é definido no campo “Formato”.
                    </span>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Formato</span>
                    <select
                      value={drafts[section.key]?.displayMode || "card"}
                      onChange={(e) => updateDraft(section.key, "displayMode", e.target.value as MetricDisplayMode)}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    >
                      {DISPLAY_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38, fontSize: 12, fontWeight: 600, color: "#334155" }}>
                    <input
                      type="checkbox"
                      checked={drafts[section.key]?.enabled ?? true}
                      onChange={(e) => updateDraft(section.key, "enabled", e.target.checked)}
                    />
                    Ativo
                  </label>
                  <button
                    type="button"
                    onClick={() => addManualMetric(section.key)}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 38, padding: "9px 12px", borderRadius: 8, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
                {section.metrics.length > 0 ? (
                  section.metrics.map((metric, index) => (
                    <div
                      key={metric.key}
                      draggable
                      onDragStart={() => setDragState({ sectionKey: section.key, metricKey: metric.key })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragState && dragState.sectionKey === section.key) {
                          reorderMetrics(section.key, dragState.metricKey, metric.key);
                        }
                        setDragState(null);
                      }}
                      onDragEnd={() => setDragState(null)}
                      style={{
                        border: "1px solid #E2E8F0",
                        borderRadius: 12,
                        padding: "12px 14px",
                        background: metric.enabled ? "#FFFFFF" : "#F8FAFC",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        cursor: "grab",
                        opacity: dragState?.metricKey === metric.key ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(180px, 220px) 110px", gap: 12, alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B" }}>
                              <GripVertical size={13} />
                            </span>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                              {getTemplateMetricLabel(baseTemplateId, metric, primaryObjective)}
                            </p>
                            {metric.recommended && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 999, padding: "2px 8px" }}>
                                Recomendado
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Chave: {metric.key} · Ordem {index + 1}</p>
                          {metric.sourcePlatform && (
                            <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                              Origem: {getSourceLabel(metric.sourcePlatform)}
                            </p>
                          )}
                          {(metric.kind || "standard") === "composite" && (
                            <>
                              <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                                KPI composto ({metric.compositeType || "sum"}): {metric.primaryMetricKey || "?"} + {metric.secondaryMetricKey || "?"}
                              </p>
                              <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                                Bases: {getSourceLabel(metric.primarySourcePlatform)} / {getSourceLabel(metric.secondarySourcePlatform)}
                              </p>
                            </>
                          )}
                          <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                            Preview: {metric.preview || (metric.displayMode === "table" ? "Tabela" : metric.displayMode === "chart" ? "Gráfico" : metric.displayMode === "text" ? "Texto" : "Card")}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Formato</p>
                          <select
                            value={metric.displayMode}
                            onChange={(e) => updateMetric(section.key, metric.key, (item) => ({ ...item, displayMode: e.target.value as MetricDisplayMode }))}
                            style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "white" }}
                          >
                            {DISPLAY_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, fontSize: 12, fontWeight: 600, color: "#334155" }}>
                          <input type="checkbox" checked={metric.enabled} onChange={() => toggleMetric(section.key, metric.key)} />
                          Ativo
                        </label>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
                        <span style={{ fontSize: 11, color: "#64748B" }}>
                          Arraste para reordenar
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteMetric(section.key, metric.key)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 10px",
                            borderRadius: 8,
                            border: "1px solid #FECACA",
                            background: "#FEF2F2",
                            color: "#DC2626",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={14} />
                          Excluir métrica
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 16, borderRadius: 12, border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: 13 }}>
                    Nenhuma métrica configurada nesta seção. Use “Restaurar defaults” para recuperar a estrutura padrão.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 24, borderTop: "1px solid #E2E8F0", display: "flex", gap: 12, justifyContent: "space-between", background: "#FFFFFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontSize: 12 }}>
            <CheckCircle2 size={14} />
            Essa configuração passa a ser o padrão dos dashboards criados a partir desse template.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={onClose} style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="button" onClick={saveConfig} disabled={isSaving} style={{ padding: "12px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, minWidth: 180, justifyContent: "center" }}>
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
