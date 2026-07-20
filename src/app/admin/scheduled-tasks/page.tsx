"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCcw, Search, Send, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type TaskStatus = "ok" | "overdue" | "disabled" | "never_ran";
type CompletionStatus = "success" | "partial" | "error" | "pending";

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

function CompletionBadge({ status }: { status: string | null | undefined }) {
  const normalized = String(status || "").trim().toLowerCase();
  const key: CompletionStatus =
    normalized === "success" || normalized === "ok" || normalized === "completed" || normalized === "done"
      ? "success"
      : normalized === "partial" || normalized === "warning" || normalized === "success_with_warnings"
        ? "partial"
        : normalized === "error" || normalized === "failed" || normalized === "failure"
          ? "error"
          : "pending";
  const styles: Record<CompletionStatus, { label: string; color: string; bg: string; border: string; Icon: any }> = {
    success: { label: "Sucesso", color: "#166534", bg: "#F0FDF4", border: "#BBF7D0", Icon: CheckCircle2 },
    partial: { label: "Parcial", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", Icon: AlertTriangle },
    error: { label: "Erro", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", Icon: XCircle },
    pending: { label: "Pendente", color: "#475569", bg: "#F8FAFC", border: "#E2E8F0", Icon: Clock3 },
  };
  const cfg = styles[key];
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
  const [forcingTaskById, setForcingTaskById] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function forceExecution(task: any) {
    const confirmRun = window.confirm(
      `Forçar a execução de "${task.dashboardName}" agora?\n\nPeríodo: ${task.periodFrom} a ${task.periodTo}.\nIsso enviará o relatório ao webhook de produção do n8n.`
    );
    if (!confirmRun) return;

    setForcingTaskById((prev) => ({ ...prev, [task.dashboardId]: true }));
    try {
      const response = await fetch("/api/admin/automations/report-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId: task.dashboardId,
          from: task.periodFrom,
          to: task.periodTo,
          source: "scheduled",
          reportMode: task.reportMode,
          automationPeriod: {
            preset: task.periodPreset,
            includeToday: Boolean(task.includeToday),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Falha ao forçar a execução.");
      }
      window.alert("Execução forçada enviada ao n8n com sucesso.");
      await fetchData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Erro ao forçar a execução.");
    } finally {
      setForcingTaskById((prev) => ({ ...prev, [task.dashboardId]: false }));
    }
  }

  function shouldOfferForce(task: any) {
    if (!task?.automationEnabled) return false;
    const completionStatus = String(task.lastCompletionStatus || "").toLowerCase();
    return task.status !== "ok" || completionStatus === "error" || completionStatus === "partial";
  }

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
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Conclusão final</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Payload / Periodo</th>
              <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 700 }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && tasks.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 20, textAlign: "center" }}>Carregando monitoramento...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 0 }}>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <CompletionBadge status={task.lastCompletionStatus} />
                      <div style={{ fontSize: 12, color: "#64748B" }}>{task.lastCompletedAtLabel}</div>
                      {task.lastCompletionMessage ? (
                        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{task.lastCompletionMessage}</div>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>
                    <div style={{ fontSize: 12 }}>Modo: <strong>{task.reportMode}</strong></div>
                    <div style={{ fontSize: 12 }}>Periodo: <strong>{task.periodLabel || `${task.periodDays} dias`}</strong></div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {shouldOfferForce(task) ? (
                      <button
                        type="button"
                        onClick={() => forceExecution(task)}
                        disabled={Boolean(forcingTaskById[task.dashboardId])}
                        title="Forçar execução desta automação"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          border: "1px solid #F59E0B",
                          background: "#FFFBEB",
                          color: "#92400E",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "8px 10px",
                          cursor: forcingTaskById[task.dashboardId] ? "wait" : "pointer",
                          opacity: forcingTaskById[task.dashboardId] ? 0.7 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {forcingTaskById[task.dashboardId] ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        {forcingTaskById[task.dashboardId] ? "Executando..." : "Forçar execução"}
                      </button>
                    ) : (
                      <span style={{ color: "#94A3B8" }}>—</span>
                    )}
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
