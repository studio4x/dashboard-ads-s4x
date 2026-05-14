import type { Metadata } from "next";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { DataSourceService } from "@/services/data-source-service";

export const metadata: Metadata = { title: "Logs de Importação | Admin" };

export default async function ImportLogsPage() {
  const logs = await DataSourceService.getImportLogs(100);

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Logs de Importação</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Histórico de sincronizações com Google Sheets</p>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Início</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Cliente</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Dashboard</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Status</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Duração</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Métricas</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#94A3B8" }}>
                  Nenhum log encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px 16px", color: "#0F172A" }}>
                    {new Date(log.started_at).toLocaleString("pt-BR")}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#0F172A" }}>{log.clients?.name}</td>
                  <td style={{ padding: "12px 16px", color: "#0F172A" }}>{log.dashboards?.name}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge status={log.status} />
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16A34A", fontWeight: 600 }}><CheckCircle2 size={14} /> Sucesso</span>;
  }
  if (status === "success_with_warnings") {
    return <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#D97706", fontWeight: 600 }}><AlertTriangle size={14} /> Com Avisos</span>;
  }
  if (status === "failed") {
    return <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#DC2626", fontWeight: 600 }}><XCircle size={14} /> Falhou</span>;
  }
  if (status === "running") {
    return <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563EB", fontWeight: 600 }}><Clock size={14} className="animate-spin" /> Em curso</span>;
  }
  return <span>{status}</span>;
}
