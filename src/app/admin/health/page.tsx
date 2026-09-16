"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Clock3, Database, ExternalLink, Loader2, Play, RefreshCw, ServerCog, ShieldCheck, WalletCards } from "lucide-react";
import { formatAutomationDateKey, getAutomationReferenceDate, normalizeAutomationPeriodPreset, resolveAutomationPeriodRange } from "@/lib/dashboard/automation-period";

type Snapshot = any;

function formatDate(value?: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function statusBadge(status: string) {
  if (status === "healthy") return { label: "Saudável", bg: "#F0FDF4", color: "#15803D" };
  if (status === "critical" || status === "error") return { label: "Crítico", bg: "#FEF2F2", color: "#B91C1C" };
  if (status === "stale" || status === "attention") return { label: "Atenção", bg: "#FFF7ED", color: "#B45309" };
  return { label: "Desconhecido", bg: "#F8FAFC", color: "#64748B" };
}

function Badge({ status }: { status: string }) {
  const p = statusBadge(status);
  return <span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 99, background: p.bg, color: p.color, fontSize: 10, fontWeight: 800 }}>{p.label}</span>;
}

export default function PlatformHealthPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "attention">("attention");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [runningDashboardId, setRunningDashboardId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/health", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar a saúde da plataforma.");
      setSnapshot(json.snapshot);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar a saúde da plataforma.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function forceAutomation(automation: any) {
    const referenceDate = getAutomationReferenceDate(new Date(), "America/Sao_Paulo");
    const preset = normalizeAutomationPeriodPreset(automation.periodPreset);
    const period = resolveAutomationPeriodRange(preset, Boolean(automation.includeToday), referenceDate);
    const from = formatAutomationDateKey(period.from, "America/Sao_Paulo");
    const to = formatAutomationDateKey(period.to, "America/Sao_Paulo");

    if (automation.diagnosis === "pending_completion") {
      setActionMessage("Essa automação já foi disparada e ainda aguarda a confirmação de conclusão. Um novo disparo não foi feito para evitar duplicidade.");
      return;
    }

    const confirmed = window.confirm(
      `Forçar a execução de "${automation.dashboardName}" agora?\n\nProgramação: ${automation.scheduleLabel}.\nPeríodo: ${from} a ${to}.\nIsso enviará o relatório ao webhook de produção do n8n.`
    );
    if (!confirmed) return;

    setRunningDashboardId(automation.dashboardId);
    setActionMessage(null);
    try {
      const response = await fetch("/api/admin/automations/report-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId: automation.dashboardId,
          from,
          to,
          source: "manual",
          reportMode: automation.reportMode || "both",
          automationPeriod: { preset, includeToday: Boolean(automation.includeToday) },
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível forçar a execução.");
      setActionMessage(`Execução de "${automation.dashboardName}" enviada ao n8n. Atualize novamente após a conclusão para confirmar o retorno.`);
      await load();
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "Erro ao forçar a execução.");
    } finally {
      setRunningDashboardId(null);
    }
  }

  const clients = useMemo(() => {
    const list = snapshot?.clients || [];
    return filter === "attention" ? list.filter((client: any) => client.status !== "healthy") : list;
  }, [snapshot, filter]);

  if (loading && !snapshot) return <div className="admin-page" style={{ padding: 40, color: "#64748B" }}><Loader2 className="animate-spin" size={24} /> Carregando saúde da plataforma...</div>;

  const summary = snapshot?.summary || {};
  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1380 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 9 }}><ShieldCheck size={24} color="#2563EB" /> Central de Saúde</h1>
          <p style={{ marginTop: 5, fontSize: 13, color: "#64748B" }}>Visão operacional de clientes, sincronizações, automações, alertas financeiros, webhooks e anomalias.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFF", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar</button>
      </div>

      {error && <div style={{ marginBottom: 16, padding: 11, borderRadius: 8, background: "#FEF2F2", color: "#991B1B", fontSize: 12, display: "flex", gap: 7, alignItems: "center" }}><AlertTriangle size={15} />{error}</div>}
      {actionMessage && <div style={{ marginBottom: 16, padding: 11, borderRadius: 8, background: "#EFF6FF", color: "#1D4ED8", fontSize: 12 }}>{actionMessage}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 11, marginBottom: 18 }}>
        {[
          ["Clientes", summary.clients || 0, summary.criticalClients ? "#B91C1C" : "#0F172A", Activity],
          ["Saudáveis", summary.healthyClients || 0, "#15803D", CheckCircle2],
          ["Exigem atenção", (summary.attentionClients || 0) + (summary.criticalClients || 0), "#B45309", CircleAlert],
          ["Fontes atrasadas", summary.staleSources || 0, "#B45309", Database],
          ["Erros de fonte", summary.sourceErrors || 0, "#B91C1C", Database],
          ["Saldo baixo", summary.financialAlertsActive || 0, "#B91C1C", WalletCards],
          ["Anomalias", summary.anomaliesActive || 0, "#B91C1C", Activity],
          ["Erros 24h", summary.errors24h || 0, "#B91C1C", AlertTriangle],
        ].map(([label, value, color, Icon]: any) => <div key={label} className="card" style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><p style={{ fontSize: 11, color: "#64748B" }}>{label}</p><Icon size={15} color={color} /></div><p style={{ marginTop: 4, fontSize: 24, fontWeight: 800, color }}>{value}</p></div>)}
      </div>

      <div className="card" style={{ padding: 15, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><ServerCog size={17} color="#475569" /><strong style={{ fontSize: 13, color: "#0F172A" }}>Integrações de notificação</strong></div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11 }}>
          {[
            ["Relatórios n8n", snapshot?.integrations?.reportWebhookConfigured],
            ["Alertas financeiros n8n", snapshot?.integrations?.financialWebhookConfigured],
            ["Alertas operacionais n8n", snapshot?.integrations?.operationalWebhookConfigured],
          ].map(([label, ok]: any) => <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: ok ? "#166534" : "#991B1B" }}>{ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}{label}: <strong>{ok ? "configurado" : "pendente"}</strong></span>)}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Clientes</h2>
        <div style={{ display: "flex", gap: 6 }}><button onClick={() => setFilter("attention")} style={{ border: "1px solid #CBD5E1", borderRadius: 7, padding: "6px 9px", background: filter === "attention" ? "#FFF7ED" : "#FFF", color: filter === "attention" ? "#B45309" : "#64748B", fontSize: 10, fontWeight: 700 }}>Somente atenção</button><button onClick={() => setFilter("all")} style={{ border: "1px solid #CBD5E1", borderRadius: 7, padding: "6px 9px", background: filter === "all" ? "#EFF6FF" : "#FFF", color: filter === "all" ? "#1D4ED8" : "#64748B", fontSize: 10, fontWeight: 700 }}>Todos</button></div>
      </div>

      <div className="card" style={{ overflow: "auto", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 760 }}><thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left" }}><th style={{ padding: 11 }}>Cliente</th><th style={{ padding: 11 }}>Status</th><th style={{ padding: 11 }}>Pontos de atenção</th><th style={{ padding: 11 }}></th></tr></thead><tbody>
          {clients.length === 0 ? <tr><td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Nenhum cliente neste filtro.</td></tr> : clients.map((client: any) => {
            const expanded = expandedClientId === client.id;
            return <Fragment key={client.id}>
              <tr key={client.id} style={{ borderBottom: expanded ? "0" : "1px solid #F1F5F9" }}>
                <td style={{ padding: 11, fontWeight: 700, color: "#0F172A" }}>{client.name}</td>
                <td style={{ padding: 11 }}><Badge status={client.status} /></td>
                <td style={{ padding: 11 }}>{client.issues?.length ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{client.issues.slice(0, 4).map((issue: any, index: number) => <span key={`${issue.type}-${index}`} style={{ background: issue.severity === "critical" ? "#FEF2F2" : "#FFF7ED", color: issue.severity === "critical" ? "#B91C1C" : "#B45309", borderRadius: 6, padding: "3px 6px", fontSize: 9 }}>{issue.label}</span>)}{client.issues.length > 4 && <span style={{ fontSize: 9, color: "#64748B" }}>+{client.issues.length - 4}</span>}</div> : <span style={{ color: "#94A3B8" }}>Nenhum</span>}</td>
                <td style={{ padding: 11, whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => setExpandedClientId(expanded ? null : client.id)} aria-expanded={expanded} title={expanded ? "Ocultar diagnóstico" : "Ver diagnóstico"} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginRight: 8, border: 0, background: "transparent", color: "#2563EB", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Detalhes</button>
                  <Link href={`/admin/clients/${client.id}`} style={{ color: "#2563EB", display: "inline-flex" }} title="Abrir cliente"><ExternalLink size={14} /></Link>
                </td>
              </tr>
              {expanded && <tr key={`${client.id}-details`} style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}><td colSpan={4} style={{ padding: 13 }}>
                <div style={{ display: "grid", gap: 9 }}>
                  {client.issues?.map((issue: any, index: number) => {
                    const details = issue.details;
                    const isAutomation = issue.type === "automation" && details;
                    return <div key={`${issue.type}-${index}`} style={{ padding: 11, borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <strong style={{ color: issue.severity === "critical" ? "#B91C1C" : "#92400E", fontSize: 11 }}>{issue.label}</strong>
                          {isAutomation && <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "5px 14px", color: "#475569", fontSize: 10 }}>
                            <span><strong>Diagnóstico:</strong> {details.diagnosisLabel}</span>
                            <span><strong>Programação:</strong> {details.scheduleLabel}</span>
                            <span><strong>Último início:</strong> {formatDate(details.lastStartedAt)}</span>
                            <span><strong>Último disparo:</strong> {formatDate(details.lastDispatchedAt)}</span>
                            <span><strong>Última conclusão:</strong> {formatDate(details.lastCompletedAt)}</span>
                            <span><strong>Status retornado:</strong> {details.lastCompletionStatus || details.lastExecutionStatus || "Pendente"}</span>
                            {details.lastExecutionPeriodFrom && <span><strong>Período enviado:</strong> {details.lastExecutionPeriodFrom} a {details.lastExecutionPeriodTo || "..."}</span>}
                          </div>}
                          {isAutomation && details.lastCompletionMessage && <p style={{ marginTop: 7, color: "#B91C1C", fontSize: 10 }}><strong>Mensagem:</strong> {details.lastCompletionMessage}</p>}
                        </div>
                        {isAutomation && <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                          <Link href={`/app/dashboards/${details.dashboardId}/executive-summary`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 7, background: "#EFF6FF", color: "#1D4ED8", fontSize: 10, fontWeight: 700, textDecoration: "none" }}><ExternalLink size={12} /> Abrir dashboard</Link>
                          {details.diagnosis !== "pending_completion" && <button type="button" onClick={() => void forceAutomation(details)} disabled={runningDashboardId === details.dashboardId} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", border: 0, borderRadius: 7, background: runningDashboardId === details.dashboardId ? "#93C5FD" : "#2563EB", color: "#FFF", fontSize: 10, fontWeight: 700, cursor: runningDashboardId === details.dashboardId ? "wait" : "pointer" }}>{runningDashboardId === details.dashboardId ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Forçar execução</button>}
                        </div>}
                      </div>
                    </div>;
                  })}
                </div>
              </td></tr>}
            </Fragment>;
          })}
        </tbody></table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", gap: 14 }}>
        <div className="card" style={{ overflow: "auto" }}><div style={{ padding: 13, borderBottom: "1px solid #E2E8F0", fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Fontes de dados</div><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 540 }}><thead><tr style={{ background: "#F8FAFC", textAlign: "left" }}><th style={{ padding: 9 }}>Cliente / Fonte</th><th style={{ padding: 9 }}>Última atualização</th><th style={{ padding: 9 }}>Status</th></tr></thead><tbody>{(snapshot?.sources || []).map((source: any) => <tr key={source.id} style={{ borderTop: "1px solid #F1F5F9" }}><td style={{ padding: 9 }}><strong>{source.clientName}</strong><div style={{ color: "#64748B" }}>{source.name}</div></td><td style={{ padding: 9 }}>{formatDate(source.freshAt)}{source.ageMinutes !== null && <div style={{ color: "#94A3B8" }}>{source.ageMinutes} min</div>}</td><td style={{ padding: 9 }}><Badge status={source.status} /></td></tr>)}</tbody></table></div>
        <div className="card" style={{ overflow: "auto" }}><div style={{ padding: 13, borderBottom: "1px solid #E2E8F0", fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Automações de relatório</div><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 700 }}><thead><tr style={{ background: "#F8FAFC", textAlign: "left" }}><th style={{ padding: 9 }}>Cliente</th><th style={{ padding: 9 }}>Dashboard</th><th style={{ padding: 9 }}>Última conclusão</th><th style={{ padding: 9 }}>Status</th></tr></thead><tbody>{(snapshot?.automations || []).length ? (snapshot?.automations || []).map((item: any) => <tr key={item.dashboardId} style={{ borderTop: "1px solid #F1F5F9" }}><td style={{ padding: 9 }}><Link href={`/admin/clients/${item.clientId}`} style={{ color: "#2563EB", fontWeight: 700, textDecoration: "none" }}>{item.clientName || "Cliente"}</Link></td><td style={{ padding: 9 }}><Link href={`/app/dashboards/${item.dashboardId}/executive-summary`} target="_blank" rel="noreferrer" style={{ color: "#2563EB", fontWeight: 700, textDecoration: "none" }}>{item.dashboardName}</Link></td><td style={{ padding: 9 }}>{formatDate(item.lastCompletedAt)}</td><td style={{ padding: 9 }}><Badge status={item.status} /></td></tr>) : <tr><td colSpan={4} style={{ padding: 25, textAlign: "center", color: "#64748B" }}>Nenhuma automação ativa.</td></tr>}</tbody></table></div>
      </div>

      <p style={{ marginTop: 12, fontSize: 10, color: "#94A3B8" }}><Clock3 size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />Atualizado em {formatDate(snapshot?.generatedAt)}.</p>
    </div>
  );
}
