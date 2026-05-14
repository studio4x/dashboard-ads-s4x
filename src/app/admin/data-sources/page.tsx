import type { Metadata } from "next";
import { Database, FileSpreadsheet, TrendingUp, Globe, BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Fontes de Dados" };

const sources = [
  { id: "google-sheets", icon: FileSpreadsheet, title: "Google Sheets", desc: "Planilhas compartilhadas como fonte central de dados consolidados. Principal fonte do MVP.", status: "active", color: "#34A853" },
  { id: "google-ads", icon: BarChart3, title: "Google Ads API", desc: "Integração direta com a API do Google Ads. Dados de campanhas, grupos e palavras-chave em tempo real.", status: "planned", color: "#4285F4" },
  { id: "meta-ads", icon: TrendingUp, title: "Meta Marketing API", desc: "Integração com Facebook e Instagram Ads. Dados de campanhas, conjuntos e criativos.", status: "planned", color: "#1877F2" },
  { id: "ga4", icon: Database, title: "Google Analytics 4 API", desc: "Integração com GA4 Data API. Eventos, sessões, funis e comportamento de usuários.", status: "planned", color: "#E37400" },
  { id: "search-console", icon: Globe, title: "Search Console API", desc: "Integração com Search Console API. Queries, impressões, cliques e posições orgânicas.", status: "planned", color: "#34A853" },
];

export default function DataSourcesPage() {
  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Fontes de Dados</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          Gerencie as integrações de dados da plataforma
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div key={source.id} className="card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: `${source.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={26} color={source.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{source.title}</p>
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: source.status === "active" ? "#DCFCE7" : "#F1F5F9", color: source.status === "active" ? "#16A34A" : "#64748B", fontWeight: 500 }}>
                    {source.status === "active" ? "✅ Ativo (MVP)" : "🔒 Fase Futura"}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>{source.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 20, marginTop: 24, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <p style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 500 }}>
          📋 Consulte <code style={{ background: "#DBEAFE", padding: "1px 6px", borderRadius: 4 }}>/docs/INTEGRATIONS_PLAN.md</code> para o plano completo de integrações futuras.
        </p>
      </div>
    </div>
  );
}
