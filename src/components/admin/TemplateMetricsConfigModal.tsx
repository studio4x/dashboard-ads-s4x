"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, GripVertical, Loader2, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  getDefaultTemplateMetricConfig,
  getTemplateMetricLabel,
  listTemplateMetricSections,
  normalizeTemplateMetricConfig,
  type TemplateMetricCompositeType,
  type DashboardTemplateMetricConfig,
  type MetricDisplayMode,
  type TemplateMetricKind,
  type TemplateMetricItem,
} from "@/lib/dashboard/template-metric-config";
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
  const [drafts, setDrafts] = useState<Record<string, {
    label: string;
    key: string;
    preview: string;
    kind: TemplateMetricKind;
    compositeType: TemplateMetricCompositeType;
    primaryMetricKey: string;
    secondaryMetricKey: string;
    displayMode: MetricDisplayMode;
    enabled: boolean;
  }>>({});

  const templateId = template?.id || "google_ads_s4x";
  const baseTemplateId = template?.baseTemplateId || template?.sheetTemplateId || templateId;
  const templateName = template?.name || "Template";
  const isMetaTemplate = baseTemplateId === "meta_ads_s4x" || baseTemplateId === "google_meta_ads_s4x";
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

  useEffect(() => {
    if (!open || !template) return;
    setConfig(
      normalizeTemplateMetricConfig(
        rawMetricConfig,
        baseTemplateId,
        templateObjectives,
        primaryObjective
      )
    );
  }, [open, template, baseTemplateId, rawMetricConfig, templateObjectives, primaryObjective]);

  useEffect(() => {
    if (!open) return;
    setDrafts({});
  }, [open, templateId]);

  if (!open || !template || !config) return null;

  const resetToDefaults = () => {
    setConfig(getDefaultTemplateMetricConfig(baseTemplateId, templateObjectives, primaryObjective));
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
    field: "label" | "key" | "preview" | "kind" | "compositeType" | "primaryMetricKey" | "secondaryMetricKey" | "displayMode" | "enabled",
    value: string | boolean
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: {
        label: prev[sectionKey]?.label || "",
        key: prev[sectionKey]?.key || "",
        preview: prev[sectionKey]?.preview || "",
        kind: prev[sectionKey]?.kind || "standard",
        compositeType: prev[sectionKey]?.compositeType || "sum",
        primaryMetricKey: prev[sectionKey]?.primaryMetricKey || "",
        secondaryMetricKey: prev[sectionKey]?.secondaryMetricKey || "",
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
    const compositeType = draft?.compositeType || "sum";
    const primaryMetricKey = String(draft?.primaryMetricKey || "").trim();
    const secondaryMetricKey = String(draft?.secondaryMetricKey || "").trim();

    if (!label || !key) {
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
      if (section.metrics.some((metric) => metric.key === key)) {
        toast("Já existe uma métrica com essa chave nesta seção.");
        return prev;
      }

      const nextMetric: TemplateMetricItem = {
        key,
        label,
        preview: preview || undefined,
        kind,
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
        compositeType: "sum",
        primaryMetricKey: "",
        secondaryMetricKey: "",
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
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao salvar template.");
      }
      toast("Template atualizado.");
      await onSaved?.();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao salvar template.");
    } finally {
      setIsSaving(false);
    }
  };

  const sections = listTemplateMetricSections(config);

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
                <button
                  type="button"
                  onClick={resetToDefaults}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  <RotateCcw size={14} /> Restaurar defaults
                </button>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ border: "1px dashed #CBD5E1", borderRadius: 12, padding: 12, background: "#F8FAFC", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Tipo</span>
                    <select
                      value={drafts[section.key]?.kind || "standard"}
                      onChange={(e) => updateDraft(section.key, "kind", e.target.value as TemplateMetricKind)}
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
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Chave</span>
                    <input
                      value={drafts[section.key]?.key || ""}
                      onChange={(e) => updateDraft(section.key, "key", e.target.value)}
                      placeholder="ticket_medio"
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                    />
                  </label>
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Métrica base 1</span>
                        <select
                          value={drafts[section.key]?.primaryMetricKey || ""}
                          onChange={(e) => updateDraft(section.key, "primaryMetricKey", e.target.value)}
                          style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
                        >
                          <option value="">Selecione</option>
                          {section.metrics
                            .filter((metric) => (metric.kind || "standard") === "standard")
                            .map((metric) => (
                              <option key={metric.key} value={metric.key}>
                                {getTemplateMetricLabel(baseTemplateId, metric, primaryObjective)}
                              </option>
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
                          {section.metrics
                            .filter((metric) => (metric.kind || "standard") === "standard")
                            .map((metric) => (
                              <option key={metric.key} value={metric.key}>
                                {getTemplateMetricLabel(baseTemplateId, metric, primaryObjective)}
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
                          {(metric.kind || "standard") === "composite" && (
                            <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                              KPI composto ({metric.compositeType || "sum"}): {metric.primaryMetricKey || "?"} + {metric.secondaryMetricKey || "?"}
                            </p>
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
