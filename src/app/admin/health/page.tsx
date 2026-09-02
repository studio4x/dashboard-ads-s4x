"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, CircleAlert, Clock3, Database, ExternalLink, Loader2, RefreshCw, ServerCog, ShieldCheck, WalletCards } from "lucide-react";

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
          {clients.length === 0 ? <tr><td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Nenhum cliente neste filtro.</td></tr> : clients.map((client: any) => <tr key={client.id} style={{ borderBottom: "1px solid #F1F5F9" }}><td style={{ padding: 11, fontWeight: 700, color: "#0F172A" }}>{client.name}</td><td style={{ padding: 11 }}><Badge status={client.status} /></td><td style={{ padding: 11 }}>{client.issues?.length ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{client.issues.slice(0, 4).map((issue: any, index: number) => <span key={`${issue.type}-${index}`} style={{ background: issue.severity === "critical" ? "#FEF2F2" : "#FFF7ED", color: issue.severity === "critical" ? "#B91C1C" : "#B45309", borderRadius: 6, padding: "3px 6px", fontSize: 9 }}>{issue.label}</span>)}{client.issues.length > 4 && <span style={{ fontSize: 9, color: "#64748B" }}>+{client.issues.length - 4}</span>}</div> : <span style={{ color: "#94A3B8" }}>Nenhum</span>}</td><td style={{ padding: 11 }}><Link href={`/admin/clients/${client.id}`} style={{ color: "#2563EB", display: "inline-flex" }}><ExternalLink size={14} /></Link></td></tr>)}
        </tbody></table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", gap: 14 }}>
        <div className="card" style={{ overflow: "auto" }}><div style={{ padding: 13, borderBottom: "1px solid #E2E8F0", fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Fontes de dados</div><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 540 }}><thead><tr style={{ background: "#F8FAFC", textAlign: "left" }}><th style={{ padding: 9 }}>Cliente / Fonte</th><th style={{ padding: 9 }}>Última atualização</th><th style={{ padding: 9 }}>Status</th></tr></thead><tbody>{(snapshot?.sources || []).map((source: any) => <tr key={source.id} style={{ borderTop: "1px solid #F1F5F9" }}><td style={{ padding: 9 }}><strong>{source.clientName}</strong><div style={{ color: "#64748B" }}>{source.name}</div></td><td style={{ padding: 9 }}>{formatDate(source.freshAt)}{source.ageMinutes !== null && <div style={{ color: "#94A3B8" }}>{source.ageMinutes} min</div>}</td><td style={{ padding: 9 }}><Badge status={source.status} /></td></tr>)}</tbody></table></div>
        <div className="card" style={{ overflow: "auto" }}><div style={{ padding: 13, borderBottom: "1px solid #E2E8F0", fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Automações de relatório</div><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 520 }}><thead><tr style={{ background: "#F8FAFC", textAlign: "left" }}><th style={{ padding: 9 }}>Dashboard</th><th style={{ padding: 9 }}>Última conclusão</th><th style={{ padding: 9 }}>Status</th></tr></thead><tbody>{(snapshot?.automations || []).length ? (snapshot?.automations || []).map((item: any) => <tr key={item.dashboardId} style={{ borderTop: "1px solid #F1F5F9" }}><td style={{ padding: 9, fontWeight: 700 }}>{item.dashboardName}</td><td style={{ padding: 9 }}>{formatDate(item.lastCompletedAt)}</td><td style={{ padding: 9 }}><Badge status={item.status} /></td></tr>) : <tr><td colSpan={3} style={{ padding: 25, textAlign: "center", color: "#64748B" }}>Nenhuma automação ativa.</td></tr>}</tbody></table></div>
      </div>

      <p style={{ marginTop: 12, fontSize: 10, color: "#94A3B8" }}><Clock3 size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />Atualizado em {formatDate(snapshot?.generatedAt)}.</p>
    </div>
  );
}
