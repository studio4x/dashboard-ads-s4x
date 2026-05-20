import type { Metadata } from "next";
import { DASHBOARD_TEMPLATES } from "@/lib/dashboard/templates";
import { FileSpreadsheet, Layers, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  // Filtra para exibir apenas os templates S4X ativos (Google Ads e Meta Ads)
  const templates = DASHBOARD_TEMPLATES.filter(t => t.id === "google_ads_s4x" || t.id === "meta_ads_s4x");

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
                  background: "#E0F2FE", 
                  color: "#0369A1", 
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
                background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "white"
              }}>
                <Layers size={20} />
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 24 }}>
              {t.description} Este modelo foi desenhado para importar dados detalhados diretamente do script coletor S4X do Google Ads.
            </p>

            <hr style={{ border: 0, borderTop: "1px solid #F1F5F9", marginBottom: 20 }} />

            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <FileSpreadsheet size={16} className="text-emerald-500" />
                Estrutura de Abas Obrigatórias ({t.requiredSheets?.length || 0} abas)
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {t.requiredSheets?.map((sheet) => (
                  <div 
                    key={sheet} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 8, 
                      padding: "8px 12px", 
                      background: "#F8FAFC", 
                      border: "1px solid #F1F5F9", 
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#475569",
                      fontWeight: 500
                    }}
                  >
                    <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                    <span>{sheet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
