"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Globe, Plus, Building2, X, Loader2, Save, Trash2, Upload, ImageIcon, AlertTriangle } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logo upload state (modal de criação)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload logo em cliente já existente
  const [uploadTarget, setUploadTarget] = useState<any | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    website_url: "",
    primary_color: "#2563EB",
  });

  useEffect(() => { fetchClients(); }, []);

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

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>, forModal: boolean) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (forModal) { setLogoFile(file); setLogoPreview(url); }
    else { setUploadFile(file); setUploadPreview(url); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!result.success) { alert("Erro: " + result.error); return; }

      // Se houver logo, faz upload após criar
      if (logoFile && result.client?.id) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        await fetch(`/api/admin/clients/${result.client.id}/logo`, { method: "POST", body: fd });
      }

      setIsModalOpen(false);
      setFormData({ name: "", company_name: "", website_url: "", primary_color: "#2563EB" });
      setLogoFile(null); setLogoPreview(null);
      fetchClients();
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/clients/${deleteTarget.id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setDeleteTarget(null);
        fetchClients();
      } else {
        alert("Erro ao excluir: " + result.error);
      }
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUploadLogo() {
    if (!uploadTarget || !uploadFile) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", uploadFile);
      const res = await fetch(`/api/admin/clients/${uploadTarget.id}/logo`, { method: "POST", body: fd });
      const result = await res.json();
      if (result.success) {
        setUploadTarget(null);
        setUploadFile(null);
        setUploadPreview(null);
        fetchClients();
      } else {
        alert("Erro ao enviar logo: " + result.error);
      }
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsUploading(false);
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Clientes</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{clients.length} clientes cadastrados na plataforma</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}
        >
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {clients.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", borderStyle: "dashed" }}>
            <Building2 size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#64748B", fontSize: 14 }}>Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : (
          clients.map((client: any) => (
            <div key={client.id} className="card card-hover" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              {/* Avatar / Logo */}
              <div
                style={{ width: 48, height: 48, borderRadius: 12, background: client.primary_color || "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 20, flexShrink: 0, overflow: "hidden" }}
              >
                {client.logo_url
                  ? <img src={client.logo_url} alt={client.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : client.name.charAt(0)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                  {client.name}
                  <span style={{ fontSize: 11, color: client.status === "active" ? "#16A34A" : "#64748B", background: client.status === "active" ? "#DCFCE7" : "#F1F5F9", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>
                    {client.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#64748B" }}>{client.company_name || "Empresa"}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>•</span>
                  <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>
                    <strong>{client.dashboards_count}</strong> {client.dashboards_count === 1 ? "dashboard" : "dashboards"}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>
                    <strong>{client.sources_count}</strong> {client.sources_count === 1 ? "fonte conectada" : "fontes conectadas"}
                  </span>
                  {client.website_url && (
                    <>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>•</span>
                      <a href={client.website_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB", textDecoration: "none" }}>
                        <Globe size={11} /> URL
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => { setUploadTarget(client); setUploadFile(null); setUploadPreview(client.logo_url || null); }}
                  title="Enviar logotipo"
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 13, color: "#475569", cursor: "pointer", fontWeight: 500 }}
                >
                  <ImageIcon size={14} /> Logo
                </button>
                <Link href={`/admin/clients/${client.id}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                  Abrir
                </Link>
                <button
                  onClick={() => setDeleteTarget(client)}
                  title="Excluir cliente"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "7px 10px", borderRadius: 8, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#DC2626", cursor: "pointer", fontWeight: 500 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ──────────── Modal: Novo Cliente ──────────── */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Cadastrar Novo Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Logo upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Logotipo (opcional)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    style={{ width: 72, height: 72, borderRadius: 12, border: "2px dashed #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Upload size={22} color="#94A3B8" />}
                  </div>
                  <div>
                    <button type="button" onClick={() => logoInputRef.current?.click()} style={{ fontSize: 13, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>
                      {logoPreview ? "Trocar imagem" : "Selecionar arquivo"}
                    </button>
                    <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>PNG, JPG, WEBP ou SVG — máx. 2 MB</p>
                    {logoFile && <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{logoFile.name}</p>}
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: "none" }} onChange={(e) => handleLogoChange(e, true)} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome do Cliente (Exibição)</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Loja XYZ" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Razão Social / Nome da Empresa</label>
                <input value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} placeholder="Ex: Loja XYZ Varejo LTDA" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Website (URL)</label>
                <input value={formData.website_url} onChange={e => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://exemplo.com.br" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Cor Primária (Branding)</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} style={{ width: 44, height: 44, padding: 0, border: "none", borderRadius: 8, overflow: "hidden", cursor: "pointer" }} />
                  <input value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "monospace" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "none", background: "#2563EB", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Cliente</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────── Modal: Upload de Logo (cliente existente) ──────────── */}
      {uploadTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 420, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>Logotipo — {uploadTarget.name}</h2>
              <button onClick={() => { setUploadTarget(null); setUploadFile(null); setUploadPreview(null); }} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Preview */}
              <div
                onClick={() => uploadInputRef.current?.click()}
                style={{ width: "100%", height: 160, borderRadius: 12, border: "2px dashed #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative" }}
              >
                {uploadPreview
                  ? <img src={uploadPreview} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  : <div style={{ textAlign: "center", color: "#94A3B8" }}><Upload size={32} style={{ margin: "0 auto 8px" }} /><p style={{ fontSize: 13 }}>Clique para selecionar</p></div>}
              </div>
              <input ref={uploadInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: "none" }} onChange={(e) => handleLogoChange(e, false)} />
              <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: -12 }}>PNG, JPG, WEBP ou SVG — máx. 2 MB</p>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => { setUploadTarget(null); setUploadFile(null); setUploadPreview(null); }} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleUploadLogo} disabled={!uploadFile || isUploading} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: uploadFile ? "#2563EB" : "#CBD5E1", color: "white", fontSize: 14, fontWeight: 600, cursor: uploadFile ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : <><Upload size={16} /> Enviar Logo</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Modal: Confirmar Exclusão ──────────── */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 28, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 999, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={26} color="#DC2626" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Excluir cliente?</h2>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
              Você está prestes a excluir <strong>{deleteTarget.name}</strong>. Esta ação é irreversível e removerá todos os dados associados.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleDelete} disabled={isDeleting} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "#DC2626", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <><Trash2 size={16} /> Excluir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
