"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ArrowRight, PieChart, X, Loader2, Save, Layout, Link2, RefreshCw, Database, Trash2 } from "lucide-react";

import { ShareLinksManager } from "@/components/admin/ShareLinksManager";

export default function AdminDashboardsPage() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareModalDashboard, setShareModalDashboard] = useState<any | null>(null);
  
  // Integração Google Sheets
  const [integrationModalDashboard, setIntegrationModalDashboard] = useState<any | null>(null);
  const [integrationForm, setIntegrationForm] = useState({
    spreadsheetId: "",
    name: ""
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    client_id: "",
    description: "",
    status: "active",
    dashboard_type: "google_ads_s4x"
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [dashRes, clientsRes, sourcesRes] = await Promise.all([
        fetch("/api/admin/dashboards/list-all"),
        fetch("/api/admin/clients"),
        fetch("/api/admin/google-sheets")
      ]);
      const dashboardsData = await dashRes.json();
      const clientsData = await clientsRes.json();
      const sourcesData = await sourcesRes.json();
      
      setDashboards(Array.isArray(dashboardsData) ? dashboardsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setSources(Array.isArray(sourcesData) ? sourcesData : []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const handleOpenIntegration = (dash: any) => {
    setIntegrationModalDashboard(dash);
    const source = sources.find((s: any) => s.dashboard_id === dash.id);
    if (source) {
      setIntegrationForm({
        spreadsheetId: source.google_sheet_sources?.spreadsheet_id || "",
        name: source.name || `Planilha - ${dash.name}`
      });
    } else {
      setIntegrationForm({
        spreadsheetId: "",
        name: `Planilha - ${dash.name}`
      });
    }
  };

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrationModalDashboard) return;
    
    setIsSavingIntegration(true);
    const existingSource = sources.find((s: any) => s.dashboard_id === integrationModalDashboard.id);
    
    try {
      const url = existingSource ? `/api/admin/google-sheets/${existingSource.id}` : "/api/admin/google-sheets";
      const method = existingSource ? "PATCH" : "POST";
      
      const body = {
        clientId: integrationModalDashboard.client_id,
        dashboardId: integrationModalDashboard.id,
        name: integrationForm.name || `Planilha - ${integrationModalDashboard.name}`,
        spreadsheetId: integrationForm.spreadsheetId
      };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const result = await res.json();
      if (result.success) {
        alert(existingSource ? "Integração atualizada com sucesso!" : "Integração criada com sucesso!");
        await fetchData();
      } else {
        alert("Erro ao salvar integração: " + result.error);
      }
    } catch (error) {
      alert("Erro de conexão com o servidor ao salvar integração.");
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const handleSyncIntegration = async () => {
    if (!integrationModalDashboard) return;
    const source = sources.find((s: any) => s.dashboard_id === integrationModalDashboard.id);
    if (!source) {
      alert("Por favor, salve a integração com o ID da planilha antes de sincronizar!");
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/google-sheets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: source.client_id,
          dashboardId: source.dashboard_id,
          spreadsheetId: source.google_sheet_sources?.spreadsheet_id,
          dataSourceId: source.id
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("Sincronização concluída com sucesso! Todos os dados foram atualizados.");
        fetchData();
      } else {
        const errorMsg = result.error || (result.errors && result.errors.length > 0 ? result.errors[0].message : "Erro desconhecido");
        alert(`Erro na sincronização: ${errorMsg}`);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor para sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setFormData({ name: "", slug: "", client_id: "", description: "", status: "active", dashboard_type: "google_ads_s4x" });
        fetchData();
      } else {
        alert("Erro: " + result.error);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicate(dash: any) {
    const newName = prompt(`Duplicar "${dash.name}"\nNovo nome:`, `${dash.name} (Cópia)`);
    if (!newName) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboards/${dash.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: dash.client_id,
          name: newName,
          slug: generateSlug(newName)
        })
      });
      
      const result = await res.json();
      if (result.success) {
        fetchData();
        alert("Dashboard duplicado com sucesso!");
      } else {
        alert("Erro: " + result.error);
        setIsLoading(false);
      }
    } catch (error) {
      alert("Erro ao duplicar dashboard");
      setIsLoading(false);
    }
  }

  async function handleDeleteDashboard(id: string, name: string) {
    if (!confirm(`Deseja realmente EXCLUIR o dashboard "${name}"?\nEsta ação é irreversível e removerá todos os dados sincronizados, conexões com planilhas e links de compartilhamento!`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboards/${id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (result.success) {
        alert("Dashboard excluído com sucesso!");
        fetchData();
      } else {
        alert("Erro ao excluir: " + result.error);
        setIsLoading(false);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
      setIsLoading(false);
    }
  }

  if (isLoading && dashboards.length === 0) {
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Dashboards</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{dashboards.length} dashboards cadastrados</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ 
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", 
            borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, 
            fontWeight: 500, border: "none", cursor: "pointer" 
          }}
        >
          <Plus size={15} /> Novo Dashboard
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {dashboards.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", borderStyle: "dashed" }}>
            <PieChart size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#64748B", fontSize: 14 }}>Nenhum dashboard cadastrado ainda.</p>
          </div>
        ) : (
          dashboards.map((d: any) => (
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#94A3B8" }}>{d.clients?.name}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>•</span>
                  <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>
                    <strong>{d.pages_count}</strong> {d.pages_count === 1 ? "página" : "páginas"}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>
                    Snapshot: <strong>{d.latest_snapshot_date ? new Date(d.latest_snapshot_date).toLocaleDateString('pt-BR') : "Nenhum"}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>•</span>
                  {(() => {
                    const source = sources.find((s: any) => s.dashboard_id === d.id);
                    if (source) {
                      return (
                        <span style={{ fontSize: 12, color: "#16A34A", background: "#E8F5E9", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }}></span>
                          Planilha: <strong>{source.name}</strong>
                        </span>
                      );
                    }
                    return (
                      <span style={{ fontSize: 12, color: "#D97706", background: "#FFF3E0", padding: "2px 6px", borderRadius: 4 }}>
                        Sem Planilha
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: d.status === "active" ? "#DCFCE7" : "#FEF3C7", color: d.status === "active" ? "#16A34A" : "#D97706", fontWeight: 500 }}>
                  {d.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>
                  {d.dashboard_type === "google_ads" ? "Google Ads" : d.dashboard_type === "custom" ? "Customizado" : d.dashboard_type || "Google Ads"}
                </span>
                
                <button 
                  onClick={() => handleDuplicate(d)}
                  style={{ display: "flex", alignItems: "center", padding: "6px 12px", borderRadius: 8, background: "#F8FAFC", fontSize: 13, color: "#475569", border: "1px solid #E2E8F0", cursor: "pointer", fontWeight: 500 }}
                >
                  Duplicar
                </button>

                <button 
                  onClick={() => handleOpenIntegration(d)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "#FFF7ED", fontSize: 13, color: "#EA580C", border: "1px solid #FFEDD5", cursor: "pointer", fontWeight: 500 }}
                >
                  <Link2 size={13} /> Integração
                </button>
                
                <button 
                  onClick={() => setShareModalDashboard(d)}
                  style={{ display: "flex", alignItems: "center", padding: "6px 12px", borderRadius: 8, background: "#F0FDF4", fontSize: 13, color: "#16A34A", border: "1px solid #BBF7D0", cursor: "pointer", fontWeight: 500 }}
                >
                  Compartilhar
                </button>

                <button 
                  onClick={() => handleDeleteDashboard(d.id, d.name)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "#FEF2F2", fontSize: 13, color: "#DC2626", border: "1px solid #FEE2E2", cursor: "pointer", fontWeight: 500 }}
                  title="Excluir Dashboard"
                >
                  <Trash2 size={13} /> Excluir
                </button>
                
                <Link href={`/app/dashboards/${d.id}/executive-summary`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                  Visualizar
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Dashboard */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Criar Novo Dashboard</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Cliente Proprietário</label>
                <select 
                  required
                  value={formData.client_id}
                  onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome do Dashboard</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ex: Performance Mensal"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>URL Slug (Identificador único)</label>
                <input 
                  required
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ex: performance-mensal"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "#F8FAFC" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Descrição (Opcional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do objetivo deste dashboard"
                  rows={2}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, resize: "none" }}
                />
              </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Modelo de Dashboard</label>
                  <select 
                    required
                    value={formData.dashboard_type}
                    onChange={e => setFormData({ ...formData, dashboard_type: e.target.value })}
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                  >
                    <option value="google_ads_s4x">Google Ads — S4X (Oficial)</option>
                    <option value="google_ads">Google Ads (Legado)</option>
                    <option value="meta_ads_s4x" disabled>Meta Ads — S4X (Em breve)</option>
                    <option value="google_ads_meta_ads" disabled>Google Ads + Meta Ads (Em breve)</option>
                    <option value="custom">Em branco (Customizado)</option>
                  </select>
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
                        <Save size={18} /> Criar Dashboard
                      </>
                    )}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compartilhamento Seguro */}
      {shareModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 600, padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                Compartilhar: {shareModalDashboard.name}
              </h2>
              <button onClick={() => setShareModalDashboard(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, overflowY: "auto" }}>
              <ShareLinksManager 
                dashboardId={shareModalDashboard.id} 
                dashboardName={shareModalDashboard.name} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Integração Google Sheets */}
      {integrationModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={18} color="#EA580C" /> Integração Google Sheets
              </h2>
              <button onClick={() => setIntegrationModalDashboard(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveIntegration} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 12, color: "#1E3A8A", fontWeight: 600 }}>Dashboard: {integrationModalDashboard.name}</p>
                <p style={{ fontSize: 11, color: "#1D4ED8", marginTop: 2 }}>Cliente: {clients.find(c => c.id === integrationModalDashboard.client_id)?.name || "Cliente"}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome da Conexão</label>
                <input 
                  required
                  value={integrationForm.name}
                  onChange={e => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                  placeholder="Ex: Planilha de Vendas Google Ads"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>ID da Planilha (Spreadsheet ID)</label>
                <input 
                  required
                  value={integrationForm.spreadsheetId}
                  onChange={e => setIntegrationForm({ ...integrationForm, spreadsheetId: e.target.value })}
                  placeholder="Cole o ID da planilha do Google Sheets"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
                <span style={{ fontSize: 11, color: "#94A3B8" }}>
                  O ID fica na URL da planilha: docs.google.com/spreadsheets/d/<strong>[ID-AQUI]</strong>/edit
                </span>
              </div>

              {/* Status da Planilha & Sincronização direta do Modal */}
              {(() => {
                const source = sources.find((s: any) => s.dashboard_id === integrationModalDashboard.id);
                if (source) {
                  return (
                    <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#64748B" }}>
                          Última sincronização: <strong>{source.google_sheet_sources?.last_import_at ? new Date(source.google_sheet_sources.last_import_at).toLocaleString('pt-BR') : "Nunca"}</strong>
                        </span>
                        {source.google_sheet_sources?.spreadsheet_id && (
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${source.google_sheet_sources.spreadsheet_id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}
                          >
                            Abrir Planilha ↗
                          </a>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleSyncIntegration}
                        disabled={isSyncing}
                        style={{
                          width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #BBF7D0",
                          background: "#F0FDF4", color: "#16A34A", fontSize: 13, fontWeight: 600,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                        }}
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="animate-spin" size={16} /> Sincronizando dados...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} /> Sincronizar Planilha Agora
                          </>
                        )}
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button 
                  type="button"
                  onClick={() => setIntegrationModalDashboard(null)}
                  style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Fechar
                </button>
                <button 
                  type="submit"
                  disabled={isSavingIntegration || isSyncing}
                  style={{ 
                    flex: 1, padding: "12px", borderRadius: 8, border: "none", 
                    background: "#2563EB", color: "white", fontSize: 14, 
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 
                  }}
                >
                  {isSavingIntegration ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <Save size={18} /> Salvar Integração
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
