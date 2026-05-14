import type { Metadata } from "next";
export const metadata: Metadata = { title: "Templates" };
export default function TemplatesPage() {
  const templates = [
    { name: "Dashboard Completo", desc: "Todas as 6 páginas: Executivo, Google Ads, Meta Ads, Conversões, Público e Search Console.", pages: 6, isDefault: true },
    { name: "Só Paid Media", desc: "Resumo Executivo, Google Ads e Meta Ads.", pages: 3, isDefault: false },
    { name: "SEO + Orgânico", desc: "Resumo Executivo, Público e Search Console.", pages: 3, isDefault: false },
  ];
  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Templates</h1>
      <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>Templates pré-configurados de dashboards</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {templates.map((t) => (
          <div key={t.name} className="card card-hover" style={{ padding: 24 }}>
            {t.isDefault && <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#EFF6FF", color: "#2563EB", fontWeight: 600, display: "inline-block", marginBottom: 12 }}>Padrão</span>}
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>{t.name}</h3>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 12 }}>{t.desc}</p>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>{t.pages} página{t.pages > 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
