"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileClock, Loader2, RefreshCw, XCircle } from "lucide-react";

type HistoryItem = {
  id: string;
  source: "manual" | "scheduled";
  status: "running" | "dispatched" | "success" | "partial" | "error";
  started_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
  period_from: string | null;
  period_to: string | null;
  report_mode: string | null;
  workflow_run_id: string | null;
  message: string | null;
  dashboards?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

const TZ = "America/Sao_Paulo";

function relation(value: HistoryItem["dashboards"]) {
  return Array.isArray(value) ? value[0] : value;
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", { timeZone: TZ });
}

function statusConfig(status: HistoryItem["status"]) {
  if (status === "success") return { label: "Sucesso", color: "#15803D", background: "#F0FDF4", Icon: CheckCircle2 };
  if (status === "partial") return { label: "Parcial", color: "#B45309", background: "#FFF7ED", Icon: AlertTriangle };
  if (status === "error") return { label: "Erro", color: "#B91C1C", background: "#FEF2F2", Icon: XCircle };
  if (status === "dispatched") return { label: "Disparado", color: "#1D4ED8", background: "#EFF6FF", Icon: FileClock };
  return { label: "Em execução", color: "#64748B", background: "#F1F5F9", Icon: Clock3 };
}

function sourceLabel(source: HistoryItem["source"]) {
  return source === "scheduled" ? "Agendada" : "Manual";
}

function periodLabel(item: HistoryItem) {
  if (!item.period_from && !item.period_to) return "Período não informado";
  return `${item.period_from || "..."} a ${item.period_to || "..."}`;
}

export function ClientAutomationHistoryPanel({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/automation-history?limit=100`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar o histórico.");
      setItems(Array.isArray(json.history) ? json.history : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar o histórico de automações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]);

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}><FileClock size={19} color="#2563EB" /> Histórico de execuções de automação</h2>
          <p style={{ marginTop: 5, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Registros dos disparos de relatórios e das conclusões informadas pelo n8n para este cliente.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", color: "#334155", fontSize: 11, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Atualizar
        </button>
      </div>

      {error && <div style={{ marginBottom: 14, padding: "9px 11px", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", fontSize: 12 }}>{error}</div>}

      {loading && items.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}><Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 7px" }} />Carregando histórico...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 18, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#64748B", fontSize: 12 }}>Nenhuma execução de automação registrada para este cliente.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "#F8FAFC", textAlign: "left" }}>
              <th style={{ padding: "9px 10px", color: "#475569", fontWeight: 700 }}>Execução</th>
              <th style={{ padding: "9px 10px", color: "#475569", fontWeight: 700 }}>Dashboard</th>
              <th style={{ padding: "9px 10px", color: "#475569", fontWeight: 700 }}>Origem</th>
              <th style={{ padding: "9px 10px", color: "#475569", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "9px 10px", color: "#475569", fontWeight: 700 }}>Período</th>
            </tr></thead>
            <tbody>{items.map((item) => {
              const status = statusConfig(item.status);
              const StatusIcon = status.Icon;
              const dashboard = relation(item.dashboards);
              return <tr key={item.id} style={{ borderTop: "1px solid #F1F5F9", verticalAlign: "top" }}>
                <td style={{ padding: "11px 10px", color: "#334155", whiteSpace: "nowrap" }}><strong>{dateLabel(item.completed_at || item.dispatched_at || item.started_at)}</strong>{item.message && <div style={{ marginTop: 4, maxWidth: 260, whiteSpace: "normal", color: "#64748B", lineHeight: 1.4 }}>{item.message}</div>}</td>
                <td style={{ padding: "11px 10px", color: "#0F172A", fontWeight: 600 }}>{dashboard?.name || "Dashboard"}</td>
                <td style={{ padding: "11px 10px", color: "#475569" }}>{sourceLabel(item.source)}{item.report_mode ? <div style={{ marginTop: 3, fontSize: 10, color: "#94A3B8" }}>{item.report_mode}</div> : null}</td>
                <td style={{ padding: "11px 10px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 99, background: status.background, color: status.color, fontSize: 10, fontWeight: 800 }}><StatusIcon size={11} />{status.label}</span></td>
                <td style={{ padding: "11px 10px", color: "#64748B", whiteSpace: "nowrap" }}>{periodLabel(item)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
