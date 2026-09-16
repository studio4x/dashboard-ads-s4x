"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ImportStatusBadge } from "@/components/admin/ImportStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle, History, ChevronDown, ChevronUp, ExternalLink, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { ImportStatus } from "@/types/data-sources";

const ITEMS_PER_PAGE = 10;
type ImportStatusExtended = ImportStatus | "pending" | "failed" | "success_with_warnings" | "never_imported";
type ImportIssue = string | {
  sheet?: unknown;
  field?: unknown;
  message?: unknown;
  code?: unknown;
};
type ImportLogItem = {
  id: string;
  status: ImportStatusExtended;
  started_at: string;
  duration_ms?: number | null;
  rows_read?: number | null;
  warnings?: number | null;
  errors?: number | null;
  error_details?: unknown;
  details?: {
    errors?: ImportIssue[];
    warnings?: ImportIssue[];
  } | null;
  clients?: { id?: string; name?: string | null } | null;
  dashboards?: { id?: string; name?: string | null } | null;
};

function issueMessage(issue: ImportIssue) {
  if (typeof issue === "string") return issue;
  if (typeof issue.message === "string" && issue.message.trim()) return issue.message;
  return "Detalhe não informado.";
}

function issueContext(issue: ImportIssue) {
  if (typeof issue === "string") return "";
  return [
    issue.sheet ? `Aba: ${String(issue.sheet)}` : "",
    issue.field ? `Campo: ${String(issue.field)}` : "",
    issue.code ? `Código: ${String(issue.code)}` : "",
  ].filter(Boolean).join(" · ");
}

function IssueList({ title, issues, color, background, border }: { title: string; issues: ImportIssue[]; color: string; background: string; border: string }) {
  if (issues.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        {title === "Avisos" && <AlertTriangle size={14} />}
        {title} da sincronização ({issues.length})
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {issues.map((issue, index) => {
          const context = issueContext(issue);
          return (
            <div key={`${title}-${index}`} style={{ padding: 10, borderRadius: 6, background, border: `1px solid ${border}`, fontSize: 12 }}>
              <p style={{ fontWeight: 600, color }}>{issueMessage(issue)}</p>
              {context && <p style={{ fontSize: 11, color, marginTop: 2 }}>{context}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ImportLogsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ImportLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

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

  async function handleDeleteAllLogs() {
    if (!confirm("Deseja realmente deletar todos os logs de importação? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await fetch("/api/admin/import-logs", { method: "DELETE" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        toast(result?.error || "Erro ao deletar os logs.", "error");
        return;
      }
      setExpandedId(null);
      await fetchLogs();
      toast("Logs de importação removidos com sucesso.", "success");
    } catch {
      toast("Erro ao deletar os logs.", "error");
    }
  }

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (statusFilter) result = result.filter(log => log.status === statusFilter);
    if (search) {
      result = result.filter(log =>
        log.dashboards?.name?.toLowerCase().includes(search.toLowerCase()) ||
        log.clients?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return result;
  }, [logs, statusFilter, search]);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);
  const startIndex = (visiblePage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const observability = useMemo(() => {
    const total = logs.length;
    const failed = logs.filter((log) => log.status === "failed").length;
    const withWarnings = logs.filter((log) => Number(log.warnings || 0) > 0).length;
    const durations = logs.map((log) => Number(log.duration_ms || 0)).filter((value) => Number.isFinite(value) && value > 0);
    const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((acc, value) => acc + value, 0) / durations.length) : 0;
    const rowsRead = logs.reduce((acc, log) => acc + Number(log.rows_read || 0), 0);
    return { total, failed, withWarnings, avgDurationMs, rowsRead };
  }, [logs]);

  return (
    <div className="admin-page" style={embedded ? { maxWidth: 1200 } : { padding: "clamp(14px, 3vw, 32px)", maxWidth: 1200 }}>
      <div className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Logs de Importação</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Histórico de sincronizações com Google Sheets</p>
        </div>
        <button
          onClick={handleDeleteAllLogs}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #FECACA",
            background: "#FEF2F2",
            color: "#B91C1C",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Trash2 size={14} />
          Deletar todos os logs
        </button>
      </div>

      <div className="admin-filter-row" style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 300 }}>
          <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 10 }} />
          <input 
            type="text" 
            placeholder="Buscar por dashboard ou cliente..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white", color: "#475569" }}
        >
          <option value="">Todos os status</option>
          <option value="success">Sucesso</option>
          <option value="success_with_warnings">Avisos</option>
          <option value="failed">Erro</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: 12, color: "#64748B" }}>Logs analisados</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{observability.total}</p>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: 12, color: "#64748B" }}>Tempo médio</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>
            {observability.avgDurationMs > 0 ? `${(observability.avgDurationMs / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: 12, color: "#64748B" }}>Falhas</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#B91C1C" }}>{observability.failed}</p>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: 12, color: "#64748B" }}>Com avisos</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#B45309" }}>{observability.withWarnings}</p>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: 12, color: "#64748B" }}>Linhas lidas</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{observability.rowsRead.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <div className="card admin-table-wrap" style={{ overflow: "hidden" }}>
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
              paginatedLogs.map((log) => {
                const detailedWarnings = Array.isArray(log.details?.warnings) ? log.details.warnings : [];
                const detailedErrors = Array.isArray(log.details?.errors) ? log.details.errors : [];
                const hasDetailedIssues = detailedWarnings.length > 0 || detailedErrors.length > 0;

                return (
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
                      <ImportStatusBadge status={log.status} />
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span title="Linhas lidas">📊 {Number(log.rows_read || 0)}</span>
                        {Number(log.warnings || 0) > 0 && <span title="Avisos" style={{ color: "#D97706" }}>⚠️ {Number(log.warnings || 0)}</span>}
                        {Number(log.errors || 0) > 0 && <span title="Erros" style={{ color: "#DC2626" }}>❌ {Number(log.errors || 0)}</span>}
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
                          <IssueList
                            title="Avisos"
                            issues={detailedWarnings}
                            color="#92400E"
                            background="#FFFBEB"
                            border="#FEF3C7"
                          />
                          <IssueList
                            title="Erros"
                            issues={detailedErrors}
                            color="#991B1B"
                            background="#FEF2F2"
                            border="#FECACA"
                          />

                          {/* Mantém a mensagem simples para logs antigos sem a lista estruturada. */}
                          {Boolean(log.error_details) && !hasDetailedIssues && (
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>Detalhes do Processamento:</p>
                              <pre style={{ margin: 0, padding: 12, background: "#1E293B", color: "#F8FAFC", borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
                                {typeof log.error_details === "string" ? log.error_details : JSON.stringify(log.error_details, null, 2)}
                              </pre>
                            </div>
                          )}
                          {!hasDetailedIssues && !log.error_details && (
                            <p style={{ fontSize: 12, color: "#64748B" }}>
                              {Number(log.warnings || 0) > 0
                                ? `Este log registra ${Number(log.warnings)} aviso(s), mas a lista detalhada não foi registrada.`
                                : "Não há detalhes registrados para este log."}
                            </p>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredLogs.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span style={{ fontSize: 12, color: "#64748B" }}>
            Exibindo {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)} de {filteredLogs.length} logs
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={visiblePage === 1}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: visiblePage === 1 ? "#F8FAFC" : "white",
                color: visiblePage === 1 ? "#94A3B8" : "#334155",
                cursor: visiblePage === 1 ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Anterior
            </button>
            <span style={{ padding: "6px 10px", fontSize: 12, color: "#334155", fontWeight: 600 }}>
              Página {visiblePage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={visiblePage === totalPages}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: visiblePage === totalPages ? "#F8FAFC" : "white",
                color: visiblePage === totalPages ? "#94A3B8" : "#334155",
                cursor: visiblePage === totalPages ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
