import type { Metadata } from "next";
import { Building2, PieChart, FileSpreadsheet, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import Link from "next/link";
import { mockClients, mockDashboards } from "@/data/mock-sheet-overview";

export const metadata: Metadata = { title: "Visão Geral" };

const statCards = [
  { label: "Clientes Ativos", value: "3", icon: Building2, color: "#2563EB", bg: "#EFF6FF", href: "/admin/clients" },
  { label: "Dashboards", value: "5", icon: PieChart, color: "#7C3AED", bg: "#F5F3FF", href: "/admin/dashboards" },
  { label: "Planilhas Vinculadas", value: "3", icon: FileSpreadsheet, color: "#059669", bg: "#ECFDF5", href: "/admin/google-sheets" },
  { label: "Importações (30d)", value: "142", icon: Activity, color: "#D97706", bg: "#FFFBEB", href: "/admin/import-logs" },
];

export default function AdminPage() {
  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>Visão Geral</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          Bem-vindo ao painel administrativo da plataforma.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
              <div className="card card-hover" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color={card.color} />
                  </div>
                  <ArrowUpRight size={16} color="#CBD5E1" />
                </div>
                <div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "#0F172A" }}>{card.value}</p>
                  <p style={{ fontSize: 13, color: "#64748B" }}>{card.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Clientes */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Clientes Recentes</h2>
            <Link href="/admin/clients" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mockClients.map((c) => (
              <Link key={c.id} href={`/admin/clients/${c.id}`} style={{ textDecoration: "none" }}>
                <div className="card-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid #F1F5F9", background: "#FAFBFC", transition: "background 0.15s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: c.primary_color || "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>{c.industry}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>Ativo</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Dashboards */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Dashboards Recentes</h2>
            <Link href="/admin/dashboards" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mockDashboards.map((d) => {
              const client = mockClients.find((c) => c.id === d.client_id);
              return (
                <Link key={d.id} href={`/app/dashboards/${d.id}/executive-summary`} style={{ textDecoration: "none" }}>
                  <div className="card-hover" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #F1F5F9", background: "#FAFBFC", transition: "background 0.15s" }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{d.title}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <p style={{ fontSize: 12, color: "#94A3B8" }}>{client?.name}</p>
                      <span style={{ fontSize: 11, color: d.status === "active" ? "#16A34A" : "#D97706", background: d.status === "active" ? "#DCFCE7" : "#FEF3C7", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>
                        {d.status === "active" ? "Ativo" : "Rascunho"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
