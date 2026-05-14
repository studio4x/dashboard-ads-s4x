import type { Metadata } from "next";
import Link from "next/link";
import { mockClients } from "@/data/mock-sheet-overview";
import { Building2, Plus, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientsPage() {
  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Clientes</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{mockClients.length} clientes cadastrados</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}>
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mockClients.map((client) => (
          <div key={client.id} className="card card-hover" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: client.primary_color || "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
              {client.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{client.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>{client.industry}</span>
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB", textDecoration: "none" }}>
                    <Globe size={11} /> {client.website.replace("https://", "")}
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link href={`/app/dashboards/dashboard-demo-001/executive-summary`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 13, color: "#475569", textDecoration: "none", fontWeight: 500 }}>
                Ver Dashboard <ArrowRight size={13} />
              </Link>
              <Link href={`/admin/clients/${client.id}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                Detalhes
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
