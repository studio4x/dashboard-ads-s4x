import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowRight, CheckCircle, Zap, Shield, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard ADS S4X — Plataforma de Dashboards para Tráfego Pago",
  description: "Plataforma própria de dashboards executivos para clientes de tráfego pago. Google Ads, Meta Ads, GA4 e Search Console em um único lugar.",
};

const features = [
  { icon: TrendingUp, title: "Dashboards Multi-Página", desc: "Resumo Executivo, Google Ads, Meta Ads, Conversões, Público e Search Console." },
  { icon: Zap, title: "Dados em Tempo Real", desc: "Integração com Google Sheets como fonte central de dados consolidados." },
  { icon: Shield, title: "Visual Executivo", desc: "Interface limpa, cards de KPI, gráficos e insights automáticos por cliente." },
  { icon: CheckCircle, title: "Multi-Cliente", desc: "Gerencie múltiplos clientes e dashboards em uma única plataforma." },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Nav */}
      <nav style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart3 size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Dashboard ADS</p>
            <p style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500, marginTop: -2 }}>S4X Platform</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin" style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, color: "#475569", textDecoration: "none", fontWeight: 500 }}>Admin</Link>
          <Link href="/login" style={{ padding: "8px 20px", borderRadius: 8, background: "#2563EB", fontSize: 14, color: "white", textDecoration: "none", fontWeight: 500 }}>Entrar</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 32px 64px", textAlign: "center" }}>
        <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 99, background: "#EFF6FF", color: "#2563EB", fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          🚀 MVP — Fase 1 com Google Sheets
        </span>
        <h1 style={{ fontSize: 52, fontWeight: 800, color: "#0F172A", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em" }}>
          Dashboards executivos para{" "}
          <span style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            tráfego pago
          </span>
        </h1>
        <p style={{ fontSize: 18, color: "#64748B", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 36px" }}>
          Plataforma própria para criar dashboards profissionais para seus clientes, com dados de Google Ads, Meta Ads, GA4 e Search Console.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/app/dashboards/dashboard-demo-001/executive-summary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, background: "#2563EB", color: "white", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
            Ver Dashboard Demo <ArrowRight size={16} />
          </Link>
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, border: "1px solid #E2E8F0", background: "white", color: "#475569", fontSize: 15, fontWeight: 500, textDecoration: "none" }}>
            Painel Admin
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="card" style={{ padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={22} color="#2563EB" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #E2E8F0", padding: "20px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>
          Dashboard ADS S4X — MVP Fase 1 · Dados de demonstração com mocks estruturados como Google Sheets
        </p>
      </footer>
    </div>
  );
}
