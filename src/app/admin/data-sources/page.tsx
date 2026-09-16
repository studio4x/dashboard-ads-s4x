import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, FileSpreadsheet, Share2 } from "lucide-react";

export const metadata: Metadata = { title: "Fontes de Dados" };

const dataSources = [
  {
    href: "/admin/google-sheets",
    icon: FileSpreadsheet,
    title: "Google Sheets",
    description: "Gerencie planilhas vinculadas, importações e histórico de sincronizações.",
    color: "#34A853",
  },
  {
    href: "/admin/google-ads-api",
    icon: BarChart3,
    title: "Google Ads API",
    description: "Configure conexões do Google Ads, contas acessíveis e sincronizações diretas.",
    color: "#4285F4",
  },
  {
    href: "/admin/meta-marketing",
    icon: Share2,
    title: "Meta Marketing API",
    description: "Configure a integração com a Meta e gerencie as fontes de anúncios conectadas.",
    color: "#1877F2",
  },
];

export default function DataSourcesPage() {
  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Fontes de Dados</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          Acesse as integrações disponíveis para conectar e sincronizar dados dos dashboards.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {dataSources.map((source) => {
          const Icon = source.icon;

          return (
            <Link
              key={source.href}
              href={source.href}
              className="card"
              style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                textDecoration: "none",
                transition: "box-shadow 0.15s ease, transform 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${source.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={23} color={source.color} />
                </div>
                <ArrowRight size={18} color="#94A3B8" />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{source.title}</h2>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.55, marginTop: 7 }}>{source.description}</p>
              </div>
              <span style={{ color: "#2563EB", fontSize: 12, fontWeight: 700 }}>Acessar fonte</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
