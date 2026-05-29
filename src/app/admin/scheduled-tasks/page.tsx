"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCcw, Search, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type TaskStatus = "ok" | "overdue" | "disabled" | "never_ran";

function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, { label: string; color: string; bg: string; border: string; Icon: any }> = {
    ok: { label: "OK", color: "#166534", bg: "#F0FDF4", border: "#BBF7D0", Icon: CheckCircle2 },
    overdue: { label: "Atrasado", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", Icon: AlertTriangle },
    disabled: { label: "Desativado", color: "#334155", bg: "#F8FAFC", border: "#E2E8F0", Icon: XCircle },
    never_ran: { label: "Nunca executado", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", Icon: Clock3 },
  };
  const cfg = styles[status];
  const Icon = cfg.Icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [generatedAtLabel, setGeneratedAtLabel] = useState<string>("-");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scheduled-tasks");
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Falha ao carregar dados.");
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setSummary(data.summary || null);
      setGeneratedAtLabel(String(data.generatedAtLabel || "-"));
      setTimezone(String(data.timezone || "America/Sao_Paulo"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let result = tasks;
    if (statusFilter) result = result.filter((task) => task.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (task) =>
          String(task.dashboardName || "").toLowerCase().includes(q) ||
          String(task.clientName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, statusFilter, search]);

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1300 }}>
      <div className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Monitor de Agendamentos</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            Acompanhe se as automacoes agendadas estao executando corretamente.
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #BFDBFE",
            background: "#EFF6FF",
            color: "#1D4ED8",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            padding: "9px 12px",
            cursor: "pointer",
          }}
        >
          <RefreshCcw size={14} />
          Atualizar
        </button>
      </div>

      <div className="admin-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total", value: summary?.total ?? 0 },
          { label: "Ativos", value: summary?.enabled ?? 0 },
          { label: "OK", value: summary?.ok ?? 0 },
          { label: "Atrasados", value: summary?.overdue ?? 0 },
          { label: "Nunca executados", value: summary?.neverRan ?? 0 },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>{item.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginBottom: 16,
          border: "1px solid #E2E8F0",
          background: "#F8FAFC",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12,
          color: "#475569",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Activity size={14} />
        Ultima leitura: <strong>{generatedAtLabel}</strong> ({timezone})
      </div>

      <div className="admin-filter-row" style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 320 }}>
          <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 10 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por dashboard ou cliente..."
            style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white", color: "#475569" }}
        >
          <option value="">Todos os status</option>
          <option value="ok">OK</option>
          <option value="overdue">Atrasado</option>
          <option value="never_ran">Nunca executado</option>
          <option value="disabled">Desativado</option>
        </select>
      </div>

      <div className="card admin-table-wrap" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Dashboard / Cliente</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Agendamento</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Proxima janela</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Ultimo disparo</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Payload / Periodo</th>
            </tr>
          </thead>
          <tbody>
            {loading && tasks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center" }}>Carregando monitoramento...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState
                    icon={Clock3}
                    title="Nenhuma tarefa encontrada"
                    description="Ajuste os filtros ou habilite automacoes nos dashboards."
                    className="border-none shadow-none py-16"
                  />
                </td>
              </tr>
            ) : (
              filtered.map((task) => (
                <tr key={task.dashboardId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{task.dashboardName}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>{task.clientName}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <StatusBadge status={task.status} />
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>{task.schedule}</td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>{task.nextWindow}</td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>{task.lastDispatchedAtLabel}</td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>
                    <div style={{ fontSize: 12 }}>Modo: <strong>{task.reportMode}</strong></div>
                    <div style={{ fontSize: 12 }}>Periodo: <strong>{task.periodDays} dias</strong></div>
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
