"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Layers, CheckCircle2, Circle, Settings2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { TemplateMetricsConfigModal } from "@/components/admin/TemplateMetricsConfigModal";

export function TemplatesManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

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

  return (
    <>
      <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 980 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Templates</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>
          Modelos de dashboards pré-configurados disponíveis no sistema.
        </p>

        <div style={{ marginBottom: 24, padding: 18, borderRadius: 14, border: "1px solid #DBEAFE", background: "#EFF6FF", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#2563EB", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings2 size={18} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1E3A8A" }}>Editar templates em si</p>
              <p style={{ fontSize: 13, color: "#1D4ED8", marginTop: 2, lineHeight: 1.5 }}>
                Aqui você define a estrutura base dos templates. Essas alterações viram padrão para dashboards novos criados a partir deles.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Link
              href="/admin/dashboards"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#2563EB",
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ir para Dashboards <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {loading ? (
            <div style={{ padding: 24, color: "#64748B" }}>Carregando templates...</div>
          ) : templates.length === 0 ? (
            <div style={{ padding: 24, color: "#64748B" }}>Nenhum template encontrado.</div>
          ) : templates.map((t) => (
            <div
              key={t.id}
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
                    background: t.platform === "meta_ads" ? "#FDF2F8" : "#E0F2FE",
                    color: t.platform === "meta_ads" ? "#9D174D" : "#0369A1",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "inline-block",
                    marginBottom: 10,
                  }}>
                    Padrão do Sistema
                  </span>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{t.name}</h2>
                  <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>Versão {t.version} · Ativo</p>
                </div>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: t.platform === "meta_ads"
                    ? "linear-gradient(135deg, #1877F2, #0A5DC8)"
                    : "linear-gradient(135deg, #3B82F6, #1D4ED8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}>
                  <Layers size={20} />
                </div>
              </div>

              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 24 }}>
                {t.description}
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(t)}
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
                    Abas Obrigatórias ({t.requiredSheets?.length || 0} {(t.requiredSheets?.length || 0) === 1 ? "aba" : "abas"})
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                    {t.requiredSheets?.map((sheet: string) => (
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

                {t.optionalSheets && t.optionalSheets.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Circle size={16} style={{ color: "#94A3B8" }} />
                      Abas Opcionais ({t.optionalSheets.length} {t.optionalSheets.length === 1 ? "aba" : "abas"})
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {t.optionalSheets.map((sheet: string) => (
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
                    As métricas padrão do template e a ordem das visualizações podem ser ajustadas no editor do template.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
