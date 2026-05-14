"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Globe, Plus, Building2, X, Loader2, Save } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    website_url: "",
    primary_color: "#2563EB"
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setFormData({ name: "", company_name: "", website_url: "", primary_color: "#2563EB" });
        fetchClients();
      } else {
        alert("Erro: " + result.error);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading && clients.length === 0) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={32} color="#2563EB" />
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Clientes</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{clients.length} clientes cadastrados no banco</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ 
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", 
            borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, 
            fontWeight: 500, border: "none", cursor: "pointer"
          }}
        >
          <Plus size={15} /> Novo Cliente
        </button>
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

      {/* Modal Novo Cliente */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Cadastrar Novo Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome do Cliente (Exibição)</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Loja XYZ"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Razão Social / Nome da Empresa</label>
                <input 
                  value={formData.company_name}
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Ex: Loja XYZ Varejo LTDA"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Website (URL)</label>
                <input 
                  value={formData.website_url}
                  onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://exemplo.com.br"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Cor Primária (Branding)</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input 
                    type="color"
                    value={formData.primary_color}
                    onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                    style={{ width: 44, height: 44, padding: 0, border: "none", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}
                  />
                  <input 
                    value={formData.primary_color}
                    onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  style={{ 
                    flex: 1, padding: "12px", borderRadius: 8, border: "none", 
                    background: "#2563EB", color: "white", fontSize: 14, 
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 
                  }}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <Save size={18} /> Salvar Cliente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
