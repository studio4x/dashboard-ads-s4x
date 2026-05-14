import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ArrowRight, PieChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboards | Admin" };

export default async function AdminDashboardsPage() {
  const supabase = await createClient();
  
  const { data: dashboards, error } = await supabase
    .from('dashboards')
    .select('*, clients(name, primary_color)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar dashboards:", error);
  }

  const list = dashboards || [];

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Dashboards</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{list.length} dashboards cadastrados</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}>
          <Plus size={15} /> Novo Dashboard
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", borderStyle: "dashed" }}>
            <PieChart size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#64748B", fontSize: 14 }}>Nenhum dashboard cadastrado ainda.</p>
          </div>
        ) : (
          list.map((d: any) => (
            <div key={d.id} className="card card-hover" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div 
                style={{ 
                  width: 44, height: 44, borderRadius: 10, 
                  background: d.clients?.primary_color || "#2563EB", 
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
                }}
              >
                <PieChart size={22} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{d.name}</p>
                <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>
                  {d.clients?.name} · {d.description || "Sem descrição"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: d.status === "active" ? "#DCFCE7" : "#FEF3C7", color: d.status === "active" ? "#16A34A" : "#D97706", fontWeight: 500 }}>
                  {d.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <Link href={`/app/dashboards/${d.id}/executive-summary`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                  Visualizar <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
