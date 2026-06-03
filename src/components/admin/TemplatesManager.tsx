"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, FileSpreadsheet, Layers, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { TemplateMetricsConfigModal } from "@/components/admin/TemplateMetricsConfigModal";
import { CreateTemplateModal } from "@/components/admin/CreateTemplateModal";

type TemplateItem = {
  id: string;
  name: string;
  platform: "google_ads" | "meta_ads" | "mixed" | "custom";
  version: string;
  status: "active" | "coming_soon" | "deprecated";
  sourceType?: string;
  description?: string;
  requiredSheets?: string[];
  optionalSheets?: string[];
  visiblePages?: string[];
  metric_config?: Record<string, unknown>;
  metricConfig?: Record<string, unknown>;
  isCustom?: boolean;
  baseTemplateId?: string | null;
  sheetTemplateId?: string;
};

export function TemplatesManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar templates.");
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao carregar templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const activeSystemTemplates = useMemo(
    () => templates.filter((template) => !template.isCustom && template.status === "active"),
    [templates]
  );
  const customTemplates = useMemo(
    () => templates.filter((template) => template.isCustom),
    [templates]
  );

  const renderTemplateCard = (template: TemplateItem) => {
    const isCustom = Boolean(template.isCustom);
    const label = isCustom ? "Personalizado" : "Padrão do Sistema";
    const badgeColor = template.platform === "meta_ads" || template.platform === "mixed" ? "#DB2777" : "#0284C7";
    const accent = template.platform === "meta_ads" || template.platform === "mixed"
      ? "linear-gradient(135deg, #1877F2, #0A5DC8)"
      : "linear-gradient(135deg, #3B82F6, #1D4ED8)";

    return (
      <div
        key={template.id}
        className="card"
        style={{
          padding: 28,
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          background: "white",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <span style={{
              fontSize: 10,
              padding: "3px 10px",
              borderRadius: 99,
              background: isCustom ? "#F0FDF4" : "#E0F2FE",
              color: isCustom ? "#166534" : badgeColor,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "inline-block",
              marginBottom: 10,
            }}>
              {label}
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{template.name}</h2>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              Versão {template.version} · {template.status === "active" ? "Ativo" : template.status}
            </p>
            {isCustom && template.baseTemplateId && (
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                Base: <strong>{template.baseTemplateId}</strong>
              </p>
            )}
          </div>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}>
            <Layers size={20} />
          </div>
        </div>

        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 24 }}>
          {template.description}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setSelectedTemplate(template)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #C7D2FE",
              background: "#EEF2FF",
              color: "#4338CA",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Configurar template
          </button>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid #F1F5F9", marginBottom: 20 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <FileSpreadsheet size={16} style={{ color: "#10B981" }} />
              Abas Obrigatórias ({template.requiredSheets?.length || 0} {(template.requiredSheets?.length || 0) === 1 ? "aba" : "abas"})
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {template.requiredSheets?.map((sheet: string) => (
                <div
                  key={sheet}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#15803D",
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={13} style={{ color: "#10B981", flexShrink: 0 }} />
                  <span>{sheet}</span>
                </div>
              ))}
            </div>
          </div>

          {template.optionalSheets && template.optionalSheets.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Circle size={16} style={{ color: "#94A3B8" }} />
                Abas Opcionais ({template.optionalSheets.length} {template.optionalSheets.length === 1 ? "aba" : "abas"})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {template.optionalSheets.map((sheet: string) => (
                  <div
                    key={sheet}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#94A3B8",
                      fontWeight: 500,
                    }}
                  >
                    <Circle size={13} style={{ color: "#CBD5E1", flexShrink: 0 }} />
                    <span>{sheet}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: 12, borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
              As métricas e o formato do template são configurados aqui e reaproveitados em todos os dashboards que forem criados a partir dele.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1180 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Templates</h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>
              Os templates do sistema e os templates personalizados ficam centralizados aqui. Alterações de métricas são aplicadas ao template, não ao dashboard individual.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link
              href="/admin/dashboards"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #BFDBFE",
                background: "#EFF6FF",
                color: "#1D4ED8",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Dashboards <ArrowRight size={14} />
            </Link>

            <button
              type="button"
              onClick={() => setCreateTemplateOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2563EB",
                background: "#2563EB",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Novo template
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20, marginBottom: 24, padding: 18, borderRadius: 14, border: "1px solid #DBEAFE", background: "#EFF6FF", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#2563EB", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings2 size={18} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1E3A8A" }}>Templates padrão e templates personalizados</p>
              <p style={{ fontSize: 13, color: "#1D4ED8", marginTop: 2, lineHeight: 1.5 }}>
                Crie um novo template a partir de um modelo existente, ajuste as métricas e use esse template em vários dashboards.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "#64748B" }}>Carregando templates...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 14 }}>Templates do sistema</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {activeSystemTemplates.map(renderTemplateCard)}
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 14 }}>Templates personalizados</h2>
              {customTemplates.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {customTemplates.map(renderTemplateCard)}
                </div>
              ) : (
                <div style={{ padding: 18, borderRadius: 14, border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: 14 }}>
                  Nenhum template personalizado ainda. Use “Novo template” para criar um clone configurável de um modelo existente.
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {createTemplateOpen && (
        <CreateTemplateModal
          open={createTemplateOpen}
          templates={templates.filter((template) => !template.isCustom && template.status === "active")}
          onClose={() => setCreateTemplateOpen(false)}
          onCreated={async (template) => {
            await fetchTemplates();
            setSelectedTemplate(template);
          }}
        />
      )}

      {selectedTemplate && (
        <TemplateMetricsConfigModal
          open={Boolean(selectedTemplate)}
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSaved={fetchTemplates}
        />
      )}
    </>
  );
}
