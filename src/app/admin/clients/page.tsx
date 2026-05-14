import type { Metadata } from "next";
import Link from "next/link";
import { Globe, ArrowRight, Plus, Building2 } from "lucide-react";
import { ClientService } from "@/services/client-service";

export const metadata: Metadata = { title: "Clientes | Admin" };

export default async function ClientsPage() {
  const clients = await ClientService.getAllClients();

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Clientes</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{clients.length} clientes cadastrados no banco</p>
        </div>
        <Link 
          href="/admin/clients/new"
          style={{ 
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", 
            borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, 
            fontWeight: 500, border: "none", cursor: "pointer", textDecoration: "none" 
          }}
        >
          <Plus size={15} /> Novo Cliente
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {clients.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", borderStyle: "dashed" }}>
            <Building2 size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#64748B", fontSize: 14 }}>Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : (
          clients.map((client: any) => (
            <div key={client.id} className="card card-hover" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div 
                style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: client.primary_color || "#2563EB", 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  color: "white", fontWeight: 700, fontSize: 20, flexShrink: 0 
                }}
              >
                {client.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{client.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                  <span style={{ fontSize: 13, color: "#64748B" }}>{client.company_name || "Empresa"}</span>
                  {client.website_url && (
                    <a href={client.website_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB", textDecoration: "none" }}>
                      <Globe size={11} /> {client.website_url.replace("https://", "")}
                    </a>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Link href={`/admin/clients/${client.id}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                  Detalhes
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
