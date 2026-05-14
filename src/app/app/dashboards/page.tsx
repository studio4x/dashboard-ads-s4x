import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowRight, PieChart } from "lucide-react";
import { DashboardService } from "@/services/dashboard-service";

export const metadata: Metadata = { title: "Meus Dashboards | Dashboard ADS S4X" };

export default async function DashboardsListPage() {
  const dashboards = await DashboardService.getDashboardsForUser();

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart3 size={17} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Dashboard ADS S4X</span>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>Admin →</Link>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>Meus Dashboards</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>Selecione um dashboard para visualizar</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dashboards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", background: "white", borderRadius: 12, border: "1px dashed #E2E8F0" }}>
              <p style={{ color: "#64748B", fontSize: 14 }}>Nenhum dashboard encontrado para sua conta.</p>
            </div>
          ) : (
            dashboards.map((dashboard: any) => {
              const client = (dashboard as any).clients;
              return (
                <Link key={dashboard.id} href={`/app/dashboards/${dashboard.id}/executive-summary`} style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: client?.primary_color || "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <PieChart size={26} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{dashboard.name}</p>
                      <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>{client?.name} · {dashboard.description || "Dashboard de métricas"}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", color: "#16A34A", fontWeight: 500 }}>
                        {dashboard.status === "active" ? "Ativo" : "Rascunho"}
                      </span>
                      <ArrowRight size={16} color="#CBD5E1" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
