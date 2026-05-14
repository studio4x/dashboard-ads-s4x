"use client";

import React, { useState, useEffect } from "react";
import { ImportStatusBadge } from "@/components/admin/ImportStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { History, ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";

export default function ImportLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let result = logs;
    if (statusFilter) result = result.filter(log => log.status === statusFilter);
    if (clientFilter) result = result.filter(log => log.clients?.name?.toLowerCase().includes(clientFilter.toLowerCase()));
    if (search) {
      result = result.filter(log => 
        log.dashboards?.name?.toLowerCase().includes(search.toLowerCase()) ||
        log.clients?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredLogs(result);
  }, [logs, statusFilter, clientFilter, search]);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/import-logs");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Logs de Importação</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Histórico de sincronizações com Google Sheets</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ position: "relative", width: 300 }}>
          <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 10 }} />
          <input 
            type="text" 
            placeholder="Buscar por dashboard ou cliente..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white", color: "#475569" }}
        >
          <option value="">Todos os status</option>
          <option value="success">Sucesso</option>
          <option value="success_with_warnings">Avisos</option>
          <option value="failed">Erro</option>
        </select>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Início</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Cliente / Dashboard</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Status</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Duração</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Métricas</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center" }}>Carregando logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState 
                    icon={History}
                    title="Nenhum log encontrado"
                    description="O histórico de sincronizações aparecerá aqui."
                    className="border-none shadow-none py-16"
                  />
                </td>
              </tr>
            ) : (
              filteredLogs.map((log: any) => (
                <React.Fragment key={log.id}>
                  <tr style={{ borderBottom: expandedId === log.id ? "none" : "1px solid #F1F5F9", cursor: "pointer", background: expandedId === log.id ? "#F8FAFC" : "transparent" }} onClick={() => toggleExpand(log.id)}>
                    <td style={{ padding: "12px 16px", color: "#0F172A" }}>
                      {new Date(log.started_at).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 600, color: "#0F172A", display: "block" }}>{log.clients?.name}</span>
                      <span style={{ color: "#64748B", fontSize: 12 }}>{log.dashboards?.name}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <ImportStatusBadge status={log.status as any} />
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span title="Linhas lidas">📊 {log.rows_read}</span>
                        {log.warnings > 0 && <span title="Avisos" style={{ color: "#D97706" }}>⚠️ {log.warnings}</span>}
                        {log.errors > 0 && <span title="Erros" style={{ color: "#DC2626" }}>❌ {log.errors}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {expandedId === log.id ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                      <td colSpan={6} style={{ padding: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {/* JSON error details */}
                          {log.error_details && (
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>Detalhes do Processamento:</p>
                              <pre style={{ margin: 0, padding: 12, background: "#1E293B", color: "#F8FAFC", borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
                                {JSON.stringify(log.error_details, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 12 }}>
                            {log.dashboards?.id && (
                              <a href={`/app/dashboards/${log.dashboards.id}/executive-summary`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                                <ExternalLink size={14} /> Ver Dashboard
                              </a>
                            )}
                            {log.clients?.id && (
                              <a href={`/admin/clients/${log.clients.id}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                                <ExternalLink size={14} /> Ver Cliente
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

