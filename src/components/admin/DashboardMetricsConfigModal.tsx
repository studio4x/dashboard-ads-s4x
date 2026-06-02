"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Save, RotateCcw, CheckCircle2, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  getDefaultTemplateMetricConfig,
  getMetricLabel,
  listTemplateMetricSections,
  normalizeTemplateMetricConfig,
  type DashboardTemplateMetricConfig,
  type MetricDisplayMode,
} from "@/lib/dashboard/template-metric-config";
import { normalizeMetaAdsObjectives, getMetaObjectiveLabel } from "@/lib/meta-ads/objectives";

interface DashboardMetricsConfigModalProps {
  dashboard: any | null;
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

export function DashboardMetricsConfigModal({ dashboard, open, onClose, onSaved }: DashboardMetricsConfigModalProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<DashboardTemplateMetricConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragState, setDragState] = useState<{ sectionKey: string; metricKey: string } | null>(null);

  const normalizedObjectives = useMemo(
    () => normalizeMetaAdsObjectives(dashboard?.meta_objectives || []),
    [dashboard?.meta_objectives]
  );
  const primaryObjective = normalizeMetaAdsObjectives([dashboard?.meta_primary_objective])[0] || normalizedObjectives[0] || null;
  const templateId = dashboard?.dashboard_type || "google_ads_s4x";
  const isMetaTemplate = templateId === "meta_ads_s4x" || templateId === "google_meta_ads_s4x";

  useEffect(() => {
    if (!open || !dashboard) return;
    setConfig(
      normalizeTemplateMetricConfig(
        dashboard?.template_config,
        templateId,
        normalizedObjectives,
        primaryObjective
      )
    );
  }, [open, dashboard, templateId, normalizedObjectives, primaryObjective]);

  if (!open || !dashboard || !config) return null;

  const resetToDefaults = () => {
    setConfig(getDefaultTemplateMetricConfig(templateId, normalizedObjectives, primaryObjective));
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
    if (!dashboard) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/dashboards/${dashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_config: config }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao salvar configuração de métricas.");
      }
      toast("Configuração de métricas salva.");
      await onSaved?.();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao salvar configuração.");
    } finally {
      setIsSaving(false);
    }
  };

  const sections = listTemplateMetricSections(config);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.58)", zIndex: 100, padding: 20, overflowY: "auto" }}>
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "auto",
          padding: 0,
          overflow: "hidden",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", background: "#F8FAFC" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Configurar Métricas do Template</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
              Dashboard: <strong>{dashboard.name}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, border: "1px solid #DBEAFE", background: "#EFF6FF" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>Template</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{templateId}</p>
            </div>
            <div style={{ padding: 14, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Objetivos selecionados</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                {normalizedObjectives.length > 0 ? normalizedObjectives.map((objective) => getMetaObjectiveLabel(objective)).join(" · ") : "Nenhum"}
              </p>
            </div>
          </div>

          {isMetaTemplate && (
            <div style={{ borderRadius: 10, border: "1px solid #C7D2FE", background: "#EEF2FF", padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#3730A3" }}>Métricas principais por objetivo</p>
              <p style={{ fontSize: 12, color: "#4338CA", marginTop: 4, lineHeight: 1.5 }}>
                As métricas recomendadas para Meta Ads e para o dashboard integrado seguem os objetivos escolhidos no dashboard.
                O primeiro objetivo define o rótulo principal de conversão.
              </p>
            </div>
          )}

          {sections.map((section) => (
            <div key={section.key} style={{ border: "1px solid #E2E8F0", borderRadius: 14, background: "#FFFFFF", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#F8FAFC" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{section.label}</p>
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Selecione as métricas que devem aparecer e o formato de cada uma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig(getDefaultTemplateMetricConfig(templateId, normalizedObjectives, primaryObjective))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  <RotateCcw size={14} /> Restaurar defaults
                </button>
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {section.metrics.map((metric, index) => (
                  <div
                    key={metric.key}
                    draggable
                    onDragStart={() => setDragState({ sectionKey: section.key, metricKey: metric.key })}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
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
                      padding: 12,
                      background: metric.enabled ? "#FFFFFF" : "#F8FAFC",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      cursor: "grab",
                      opacity: dragState?.metricKey === metric.key ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B" }}>
                            <GripVertical size={13} />
                          </span>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                            {getMetricLabel(templateId, metric.key, primaryObjective)}
                          </p>
                          {metric.recommended && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 999, padding: "2px 8px" }}>
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Chave: {metric.key} · Ordem {index + 1}</p>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        <input
                          type="checkbox"
                          checked={metric.enabled}
                          onChange={() => toggleMetric(section.key, metric.key)}
                        />
                        Ativo
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10, alignItems: "center" }}>
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
                      <div style={{ borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", padding: 10, minHeight: 64, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Preview</p>
                        <p style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>
                          {metric.displayMode === "table" ? "Tabela" : metric.displayMode === "chart" ? "Gráfico" : metric.displayMode === "text" ? "Texto" : "Card"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 24, borderTop: "1px solid #E2E8F0", display: "flex", gap: 12, justifyContent: "space-between", background: "#FFFFFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontSize: 12 }}>
            <CheckCircle2 size={14} />
            Defaults já vêm pré-selecionados com os formatos mais usados.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveConfig}
              disabled={isSaving}
              style={{ padding: "12px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, minWidth: 180, justifyContent: "center" }}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar Métricas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
