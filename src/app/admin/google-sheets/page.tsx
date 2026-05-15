"use client";

import { useState, useEffect } from "react";
import { GoogleSheetSourceCard } from "@/components/admin/GoogleSheetSourceCard";
import { Plus, RefreshCw, AlertTriangle, CheckCircle2, Info, X, Loader2, FileSpreadsheet, History, Trash2 } from "lucide-react";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { AdminListSkeleton } from "@/components/admin/AdminListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface SheetSource {
  id: string;
  name: string;
  client_id: string;
  dashboard_id: string;
  type: string;
  status: string;
  google_sheet_sources: {
    spreadsheet_id: string;
    last_import_at?: string;
    last_import_status?: string;
  };
  clients: { name: string };
  dashboards: { name: string; dashboard_type?: string };
}

interface ImportLog {
  id: string;
  started_at: string;
  status: string;
  tabs_read: string[];
  rows_read: number;
  warnings: number;
  errors: number;
  clients: { name: string };
  dashboards: { name: string };
}

export default function GoogleSheetsAdminPage() {
  const [sources, setSources] = useState<SheetSource[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Estados para Modal de Nova Fonte
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientId: "",
    dashboardId: "",
    name: "",
    spreadsheetId: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [sourcesRes, logsRes, clientsRes] = await Promise.all([
        fetch("/api/admin/google-sheets"),
        fetch("/api/admin/import-logs"),
        fetch("/api/admin/clients")
      ]);

      const sourcesData = await sourcesRes.json();
      const logsData = await logsRes.json();
      const clientsData = await clientsRes.json();

      setSources(Array.isArray(sourcesData) ? sourcesData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, clientId, dashboardId: "" });
    if (!clientId) {
      setDashboards([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/dashboards?clientId=${clientId}`);
      const data = await res.json();
      setDashboards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar dashboards:", error);
    }
  };

  const handleOpenEdit = async (source: SheetSource) => {
    setEditingSourceId(source.id);
    setFormData({
      clientId: source.client_id,
      dashboardId: source.dashboard_id,
      name: source.name,
      spreadsheetId: source.google_sheet_sources.spreadsheet_id
    });
    // Carrega os dashboards do cliente para o select
    await handleClientChange(source.client_id);
    // Mas garante que o dashboardId correto seja mantido (handleClientChange reseta ele)
    setFormData(prev => ({ ...prev, dashboardId: source.dashboard_id }));
    setIsModalOpen(true);
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta planilha? Os dados importados não serão apagados, mas não haverá mais sincronização automática.")) return;
    
    try {
      const res = await fetch(`/api/admin/google-sheets/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast("Fonte removida com sucesso.", "success");
        fetchData();
      } else {
        toast(`Erro: ${result.error}`, "error");
      }
    } catch (error) {
      toast("Erro ao excluir fonte.", "error");
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Deseja realmente limpar todo o histórico de logs? Esta ação não pode ser desfeita.")) return;
    
    try {
      const res = await fetch("/api/admin/import-logs", { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast("Histórico de logs limpo.", "success");
        fetchData();
      } else {
        toast(`Erro: ${result.error}`, "error");
      }
    } catch (error) {
      toast("Erro ao limpar logs.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingSourceId ? `/api/admin/google-sheets/${editingSourceId}` : "/api/admin/google-sheets";
      const method = editingSourceId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setEditingSourceId(null);
        setFormData({ clientId: "", dashboardId: "", name: "", spreadsheetId: "" });
        fetchData();
        toast(editingSourceId ? "Fonte atualizada!" : "Fonte criada com sucesso!", "success");
      } else {
        toast("Erro: " + result.error, "error");
      }
    } catch (error) {
      toast("Erro ao conectar com o servidor.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async (source: SheetSource) => {
    setIsSyncing(source.id);
    try {
      const response = await fetch("/api/admin/google-sheets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: source.client_id,
          dashboardId: source.dashboard_id,
          spreadsheetId: source.google_sheet_sources.spreadsheet_id,
          dataSourceId: source.id
        })
      });

      const result = await response.json();
      if (result.success) {
        fetchData(); // Atualiza a lista e os logs
        toast("Sincronização concluída com sucesso!", "success");
      } else {
        const errorMsg = result.error || (result.errors && result.errors.length > 0 ? result.errors[0].message : "Erro desconhecido");
        toast(`Erro na sincronização: ${errorMsg}`, "error");
      }
    } catch (error) {
      console.error(error);
      toast("Erro ao conectar com o servidor.", "error");
    } finally {
      setIsSyncing(null);
    }
  };

  // O carregamento inicial é tratado dentro do layout para manter o header visível

  const [filterClient, setFilterClient] = useState("");

  const filteredSources = sources.filter(s => 
    !filterClient || s.client_id === filterClient
  );

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>Google Sheets</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            Gerencie as planilhas que alimentam os dashboards dos seus clientes.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingSourceId(null);
            setFormData({ clientId: "", dashboardId: "", name: "", spreadsheetId: "" });
            setIsModalOpen(true);
          }}
          style={{ 
            background: "#2563EB", color: "white", border: "none", padding: "10px 16px", 
            borderRadius: 8, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" 
          }}
        >
          <Plus size={18} />
          Nova Planilha
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Planilhas Vinculadas</h2>
          
          <select 
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 13, background: "white", color: "#475569" }}
          >
            <option value="">Todos os clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {isLoading && sources.length === 0 ? (
          <AdminListSkeleton items={3} />
        ) : filteredSources.length === 0 ? (
          <EmptyState 
            icon={FileSpreadsheet}
            title={sources.length === 0 ? "Nenhuma planilha vinculada" : "Nenhuma planilha para este cliente"}
            description={sources.length === 0 ? "Conecte sua primeira planilha do Google Sheets para começar a alimentar os dashboards." : "Este cliente não possui planilhas vinculadas."}
            action={{
              label: "Nova Planilha",
              onClick: () => {
                setEditingSourceId(null);
                setFormData({ clientId: "", dashboardId: "", name: "", spreadsheetId: "" });
                setIsModalOpen(true);
              },
              icon: Plus
            }}
          />
        ) : (
          filteredSources.map((source) => (
            <GoogleSheetSourceCard
              key={source.id}
              spreadsheetName={source.name}
              clientName={source.clients.name}
              dashboardName={source.dashboards?.name}
              templateId={source.dashboards?.dashboard_type}
              tabsCount={source.google_sheet_sources.last_import_status ? 10 : 0}
              lastSynced={source.google_sheet_sources.last_import_at ? new Date(source.google_sheet_sources.last_import_at).toLocaleString("pt-BR") : undefined}
              status={isSyncing === source.id ? "running" : (source.google_sheet_sources.last_import_status as any || "pending")}
              onSync={() => handleSync(source)}
              onEdit={() => handleOpenEdit(source)}
              onDelete={() => handleDeleteSource(source.id)}
              spreadsheetUrl={`https://docs.google.com/spreadsheets/d/${source.google_sheet_sources.spreadsheet_id}`}
            />
          ))
        )}
      </div>

      {/* Tabela de Logs Reais */}
      <div style={{ marginTop: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Logs de Importação Recentes</h2>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button 
              onClick={handleClearLogs}
              style={{ background: "none", border: "none", color: "#EF4444", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Trash2 size={14} />
              Limpar tudo
            </button>
            <button 
              onClick={fetchData}
              style={{ background: "none", border: "none", color: "#2563EB", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Atualizar logs
            </button>
          </div>
        </div>
        
        <div className="card" style={{ overflow: "hidden" }}>
          {isLoading && logs.length === 0 ? (
            <TableSkeleton rows={5} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Data/Hora</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Cliente / Dashboard</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Resultado</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Erros/Avisos</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <EmptyState 
                        icon={History}
                        title="Nenhum log encontrado"
                        description="As atividades de importação aparecerão aqui assim que forem executadas."
                        className="border-none shadow-none"
                      />
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 16px", color: "#0F172A" }}>
                        {new Date(log.started_at).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ fontWeight: 600, color: "#0F172A" }}>{log.clients?.name || "Desconhecido"}</p>
                        <p style={{ fontSize: 11, color: "#64748B" }}>{log.dashboards?.name || "Dashboard Removido"}</p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ 
                          display: "inline-flex", alignItems: "center", gap: 4, 
                          color: log.status === "failed" ? "#EF4444" : log.status === "success_with_warnings" ? "#D97706" : "#16A34A", 
                          fontWeight: 500, fontSize: 12,
                          padding: "2px 8px", borderRadius: 99,
                          background: log.status === "failed" ? "#FEF2F2" : log.status === "success_with_warnings" ? "#FFFBEB" : "#F0FDF4"
                        }}>
                          {log.status === "failed" ? <X size={12} /> : log.status === "success_with_warnings" ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                          {log.status === "failed" ? "Erro" : log.status === "success_with_warnings" ? "Avisos" : "Sucesso"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748B" }}>
                        {log.tabs_read?.length || 0} abas / {log.rows_read || 0} linhas
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ color: log.errors > 0 ? "#EF4444" : "#64748B" }}>{log.errors} erros</span>
                        <span style={{ margin: "0 4px", color: "#CBD5E1" }}>|</span>
                        <span style={{ color: log.warnings > 0 ? "#F59E0B" : "#64748B" }}>{log.warnings} avisos</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Nova Fonte / Edição */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                {editingSourceId ? "Editar Fonte Google Sheets" : "Nova Fonte Google Sheets"}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setEditingSourceId(null); }} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome da Fonte (Ex: Loja XYZ — Ads)</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Título para identificação"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Cliente</label>
                <select 
                  required
                  disabled={!!editingSourceId}
                  value={formData.clientId}
                  onChange={e => handleClientChange(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: editingSourceId ? "#F8FAFC" : "white" }}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Dashboard Destino</label>
                <select 
                  required
                  disabled={!formData.clientId || !!editingSourceId}
                  value={formData.dashboardId}
                  onChange={e => setFormData({ ...formData, dashboardId: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: (editingSourceId || !formData.clientId) ? "#F8FAFC" : "white" }}
                >
                  <option value="">Selecione um dashboard...</option>
                  {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>ID da Planilha (Spreadsheet ID)</label>
                <input 
                  required
                  value={formData.spreadsheetId}
                  onChange={e => setFormData({ ...formData, spreadsheetId: e.target.value })}
                  placeholder="ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
                <p style={{ fontSize: 11, color: "#94A3B8" }}>O ID fica na URL da planilha, entre /d/ e /edit.</p>
              </div>

              {formData.dashboardId && (
                <div style={{ padding: 16, borderRadius: 12, background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <Info size={16} className="text-blue-600" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0369A1" }}>
                      Requisitos do Modelo: {dashboards.find(d => d.id === formData.dashboardId)?.dashboard_type === 'google_ads_s4x' ? 'Google Ads S4X' : 'Custom'}
                    </span>
                  </div>
                  {dashboards.find(d => d.id === formData.dashboardId)?.dashboard_type === 'google_ads_s4x' ? (
                    <ul style={{ fontSize: 11, color: "#0369A1", listStyle: "disc", paddingLeft: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
                      <li>Meta</li>
                      <li>Dashboard_Config</li>
                      <li>Performance Diária</li>
                      <li>Campanhas</li>
                      <li>Grupos de Anúncios</li>
                      <li>Palavras-Chave</li>
                      <li>Termos de Pesquisa</li>
                      <li>Negativas</li>
                      <li>Anúncios (Recursos)</li>
                    </ul>
                  ) : (
                    <p style={{ fontSize: 11, color: "#0369A1" }}>Este modelo aceita qualquer estrutura de planilha.</p>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button 
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingSourceId(null); }}
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
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingSourceId ? "Salvar Alterações" : "Criar Fonte")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
