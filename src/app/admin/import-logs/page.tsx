import type { Metadata } from "next";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Logs de Importação" };

const mockLogs = [
  { id: "log-001", source: "Loja XYZ — Dashboard Completo", client: "Empresa Demo — Loja XYZ", started: "28/04/2024 09:40:12", finished: "28/04/2024 09:42:38", status: "success" as const, rows: 842, errors: 0, trigger: "manual" },
  { id: "log-002", source: "Clínica Bem Estar — Métricas", client: "Clínica Bem Estar", started: "27/04/2024 18:18:54", finished: "27/04/2024 18:20:11", status: "success" as const, rows: 612, errors: 0, trigger: "scheduled" },
  { id: "log-003", source: "Loja XYZ — Dashboard Completo", client: "Empresa Demo — Loja XYZ", started: "26/04/2024 09:40:02", finished: "26/04/2024 09:41:55", status: "success" as const, rows: 836, errors: 0, trigger: "scheduled" },
  { id: "log-004", source: "Clínica Bem Estar — Métricas", client: "Clínica Bem Estar", started: "25/04/2024 18:20:01", finished: "25/04/2024 18:22:48", status: "error" as const, rows: 0, errors: 1, trigger: "scheduled" },
];

const statusConfig = {
  success: { icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7", label: "Concluído" },
  error: { icon: AlertCircle, color: "#DC2626", bg: "#FEE2E2", label: "Erro" },
  running: { icon: Clock, color: "#2563EB", bg: "#EFF6FF", label: "Executando" },
};

export default function ImportLogsPage() {
  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Logs de Importação</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Histórico de sincronizações de dados</p>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F1F5F9" }}>
              {["Fonte", "Cliente", "Início", "Fim", "Status", "Linhas", "Trigger"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", background: "#FAFBFC" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockLogs.map((log) => {
              const sc = statusConfig[log.status];
              const Icon = sc.icon;
              return (
                <tr key={log.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#1E293B" }}>{log.source}</td>
                  <td style={{ padding: "12px 16px", color: "#64748B" }}>{log.client}</td>
                  <td style={{ padding: "12px 16px", color: "#64748B", fontFamily: "monospace", fontSize: 12 }}>{log.started}</td>
                  <td style={{ padding: "12px 16px", color: "#64748B", fontFamily: "monospace", fontSize: 12 }}>{log.finished}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 500 }}>
                      <Icon size={12} /> {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#1E293B", fontWeight: 500 }}>{log.rows > 0 ? log.rows.toLocaleString("pt-BR") : "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{log.trigger}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
