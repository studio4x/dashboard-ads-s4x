import type { Metadata } from "next";
import { DASHBOARD_TEMPLATES } from "@/lib/dashboard/templates";
import { FileSpreadsheet, Layers, CheckCircle2, Circle } from "lucide-react";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  // Filtra para exibir apenas os templates S4X ativos (Google Ads e Meta Ads)
  const templates = DASHBOARD_TEMPLATES.filter(
    t => t.id === "google_ads_s4x" || t.id === "meta_ads_s4x" || t.id === "google_meta_ads_s4x"
  );

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Templates</h1>
      <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>
        Modelos de dashboards pré-configurados disponíveis no sistema.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {templates.map((t) => (
          <div 
            key={t.id} 
            className="card" 
            style={{ 
              padding: 28, 
              border: "1px solid #E2E8F0", 
              borderRadius: 16, 
              background: "white", 
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" 
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
                  marginBottom: 10 
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
                color: "white"
              }}>
                <Layers size={20} />
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 24 }}>
              {t.description}
            </p>

            <hr style={{ border: 0, borderTop: "1px solid #F1F5F9", marginBottom: 20 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Abas Obrigatórias */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <FileSpreadsheet size={16} style={{ color: "#10B981" }} />
                  Abas Obrigatórias ({t.requiredSheets?.length || 0} {(t.requiredSheets?.length || 0) === 1 ? "aba" : "abas"})
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {t.requiredSheets?.map((sheet) => (
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
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle2 size={13} style={{ color: "#10B981", flexShrink: 0 }} />
                      <span>{sheet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abas Opcionais */}
              {t.optionalSheets && t.optionalSheets.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Circle size={16} style={{ color: "#94A3B8" }} />
                    Abas Opcionais ({t.optionalSheets.length} {t.optionalSheets.length === 1 ? "aba" : "abas"})
                  </h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                    {t.optionalSheets.map((sheet) => (
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
                          fontWeight: 500
                        }}
                      >
                        <Circle size={13} style={{ color: "#CBD5E1", flexShrink: 0 }} />
                        <span>{sheet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
