"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

type Relation = { id?: string; name?: string | null } | null;

type CheckItem = {
  id: string;
  run_id: string;
  setting_id: string;
  client_id: string;
  dashboard_id: string;
  provider: "google_ads" | "meta_ads";
  account_id: string;
  account_name?: string | null;
  currency?: string | null;
  observed_amount?: number | string | null;
  threshold: number | string;
  decision: string;
  resulting_state?: string | null;
  alert_sent: boolean;
  event_id?: string | null;
  error_message?: string | null;
  observed_at: string;
  clients?: Relation | Relation[];
  dashboards?: Relation | Relation[];
};

type EventItem = {
  id: string;
  setting_id: string;
  client_id: string;
  dashboard_id: string;
  provider: "google_ads" | "meta_ads";
  account_id: string;
  amount: number | string;
  threshold: number | string;
  currency?: string | null;
  decision: string;
  detected_at: string;
  notification_status: "pending" | "sent" | "error";
  notified_at?: string | null;
  error_message?: string | null;
  clients?: Relation | Relation[];
  dashboards?: Relation | Relation[];
  setting?: { account_name?: string | null } | { account_name?: string | null }[] | null;
};

type RunItem = {
  id: string;
  started_at: string;
  finished_at: string;
  total_settings: number;
  healthy_count: number;
  alerted_count: number;
  suppressed_count: number;
  unavailable_count: number;
  error_count: number;
  status: "success" | "partial_error" | "error";
  error_message?: string | null;
};

type HistoryPayload = {
  success: boolean;
  retentionDays?: number;
  runs: RunItem[];
  checks: CheckItem[];
  events: EventItem[];
  error?: string;
};

type Tab = "checks" | "events" | "runs";

type ClientGroup<T> = {
  clientId: string;
  clientName: string;
  items: T[];
  days: Array<{
    key: string;
    label: string;
    items: T[];
  }>;
};

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function dateKey(value?: string | null) {
  if (!value) return "sem-data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem-data";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function dateLabel(value?: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupByClientAndDay<T extends { client_id: string; clients?: Relation | Relation[] }>(items: T[], getDate: (item: T) => string | null | undefined): ClientGroup<T>[] {
  const groups = new Map<string, ClientGroup<T>>();
  for (const item of items) {
    const client = relation(item.clients);
    const clientId = item.client_id || "unknown-client";
    const existing = groups.get(clientId);
    if (existing) {
      existing.items.push(item);
      const key = dateKey(getDate(item));
      const day = existing.days.find((candidate) => candidate.key === key);
      if (day) day.items.push(item);
      else existing.days.push({ key, label: dateLabel(getDate(item)), items: [item] });
      continue;
    }
    groups.set(clientId, {
      clientId,
      clientName: client?.name || "Cliente não identificado",
      items: [item],
      days: [{ key: dateKey(getDate(item)), label: dateLabel(getDate(item)), items: [item] }],
    });
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      days: group.days.sort((a, b) => b.key.localeCompare(a.key)),
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "pt-BR"));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatMoney(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(parsed);
  } catch {
    return `${currency || ""} ${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
  }
}

function providerLabel(provider: string) {
  return provider === "meta_ads" ? "Meta Ads" : "Google Ads";
}

const decisionMap: Record<string, { label: string; bg: string; color: string }> = {
  healthy: { label: "Saudável", bg: "#F0FDF4", color: "#15803D" },
  crossed_below_threshold: { label: "Abaixo do limite · novo alerta", bg: "#FEF2F2", color: "#B91C1C" },
  repeat_alert_due: { label: "Abaixo do limite · alerta recorrente", bg: "#FFF7ED", color: "#C2410C" },
  still_below_suppressed: { label: "Abaixo do limite · suprimido 24h", bg: "#FFF7ED", color: "#B45309" },
  financial_value_unavailable: { label: "Valor financeiro indisponível", bg: "#F8FAFC", color: "#64748B" },
  execution_error: { label: "Erro na análise", bg: "#FEF2F2", color: "#B91C1C" },
  alert_disabled: { label: "Alerta desativado", bg: "#F8FAFC", color: "#64748B" },
};

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 9px", background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const presentation = decisionMap[decision] || { label: decision || "Desconhecido", bg: "#F8FAFC", color: "#64748B" };
  return <Badge {...presentation} />;
}

function DeliveryBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge label="Enviado" bg="#F0FDF4" color="#15803D" />;
  if (status === "error") return <Badge label="Falha no envio" bg="#FEF2F2" color="#B91C1C" />;
  return <Badge label="Pendente" bg="#FFF7ED" color="#B45309" />;
}

function RunBadge({ status }: { status: string }) {
  if (status === "success") return <Badge label="Concluído" bg="#F0FDF4" color="#15803D" />;
  if (status === "partial_error") return <Badge label="Concluído com falhas" bg="#FFF7ED" color="#B45309" />;
  return <Badge label="Falha" bg="#FEF2F2" color="#B91C1C" />;
}

export default function FinancialAlertsHistoryPage() {
  const [payload, setPayload] = useState<HistoryPayload>({ success: true, runs: [], checks: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("checks");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [cleanupFrom, setCleanupFrom] = useState("");
  const [cleanupTo, setCleanupTo] = useState("");
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/financial-alerts/history?limit=700&days=14", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar o histórico.");
      setPayload(json);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar o histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const clientOptions = useMemo(() => {
    const entries = new Map<string, string>();
    for (const item of [...payload.checks, ...payload.events]) {
      const client = relation(item.clients);
      if (item.client_id && client?.name) entries.set(item.client_id, client.name);
    }
    return Array.from(entries.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [payload]);

  const normalizedSearch = search.trim().toLowerCase();
  const checkRows = useMemo(() => payload.checks.filter((item) => {
    const client = relation(item.clients);
    const dashboard = relation(item.dashboards);
    if (clientId && item.client_id !== clientId) return false;
    if (provider && item.provider !== provider) return false;
    if (statusFilter && item.decision !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return [client?.name, dashboard?.name, item.account_name, item.account_id, item.decision]
      .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
  }), [payload.checks, clientId, provider, statusFilter, normalizedSearch]);

  const eventRows = useMemo(() => payload.events.filter((item) => {
    const client = relation(item.clients);
    const dashboard = relation(item.dashboards);
    const setting = relation(item.setting);
    if (clientId && item.client_id !== clientId) return false;
    if (provider && item.provider !== provider) return false;
    if (statusFilter && item.notification_status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return [client?.name, dashboard?.name, setting?.account_name, item.account_id, item.notification_status]
      .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
  }), [payload.events, clientId, provider, statusFilter, normalizedSearch]);

  const groupedCheckRows = useMemo(() => groupByClientAndDay(checkRows, (item) => item.observed_at), [checkRows]);
  const groupedEventRows = useMemo(() => groupByClientAndDay(eventRows, (item) => item.detected_at), [eventRows]);

  const activeClientGroups = tab === "checks" ? groupedCheckRows : tab === "events" ? groupedEventRows : [];
  const clientPageCount = Math.max(1, Math.ceil(activeClientGroups.length / 10));
  const visibleClientPage = Math.min(clientPage, clientPageCount);
  const visibleCheckRows = groupedCheckRows.slice((visibleClientPage - 1) * 10, visibleClientPage * 10);
  const visibleEventRows = groupedEventRows.slice((visibleClientPage - 1) * 10, visibleClientPage * 10);

  useEffect(() => {
    setClientPage(1);
    setExpandedClients({});
    setExpandedDays({});
  }, [tab, normalizedSearch, clientId, provider, statusFilter]);

  const runs = payload.runs;
  const lastRun = runs[0] || null;
  const sentCount = payload.events.filter((event) => event.notification_status === "sent").length;
  const failedCount = payload.events.filter((event) => event.notification_status === "error").length;

  const resetFilters = () => {
    setSearch("");
    setProvider("");
    setClientId("");
    setStatusFilter("");
  };

  const clearLogsByPeriod = async () => {
    if (!cleanupFrom || !cleanupTo) {
      setError("Informe a data inicial e a data final para limpar os logs.");
      return;
    }
    if (cleanupFrom > cleanupTo) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }
    const confirmed = window.confirm(`Os logs de ${cleanupFrom} até ${cleanupTo} serão excluídos permanentemente. Deseja continuar?`);
    if (!confirmed) return;

    setCleanupLoading(true);
    setError(null);
    setCleanupMessage(null);
    try {
      const response = await fetch("/api/admin/financial-alerts/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: cleanupFrom, endDate: cleanupTo }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível limpar os logs.");
      const deleted = json.deleted || {};
      setCleanupMessage(`${Number(deleted.checks || 0)} análises, ${Number(deleted.events || 0)} envios e ${Number(deleted.runs || 0)} execuções foram removidos.`);
      await load();
    } catch (cleanupError) {
      setError(cleanupError instanceof Error ? cleanupError.message : "Erro ao limpar os logs.");
    } finally {
      setCleanupLoading(false);
    }
  };

  const clientExpansionKey = (client: { clientId: string }) => `${tab}:client:${client.clientId}`;
  const dayExpansionKey = (client: { clientId: string }, dayKey: string) => `${tab}:day:${client.clientId}:${dayKey}`;
  const expandAllGroups = () => {
    const nextClients: Record<string, boolean> = {};
    const nextDays: Record<string, boolean> = {};
    for (const group of activeClientGroups) {
      nextClients[clientExpansionKey(group)] = true;
      for (const day of group.days) nextDays[dayExpansionKey(group, day.key)] = true;
    }
    setExpandedClients(nextClients);
    setExpandedDays(nextDays);
  };

  const collapseAllGroups = () => {
    setExpandedClients({});
    setExpandedDays({});
  };

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1320 }}>
      <div className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 9 }}>
            <BellRing size={22} color="#D97706" /> Histórico de Alertas Financeiros
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 5 }}>
            Auditoria das análises de saldo, decisões do anti-spam e notificações enviadas ao administrador.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontWeight: 600, fontSize: 12, cursor: loading ? "wait" : "pointer" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "11px 13px", borderRadius: 9, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 15 }}><p style={{ fontSize: 11, color: "#64748B" }}>Execuções registradas</p><p style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginTop: 3 }}>{runs.length}</p></div>
        <div className="card" style={{ padding: 15 }}><p style={{ fontSize: 11, color: "#64748B" }}>Análises registradas</p><p style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginTop: 3 }}>{payload.checks.length}</p></div>
        <div className="card" style={{ padding: 15 }}><p style={{ fontSize: 11, color: "#64748B" }}>Alertas enviados</p><p style={{ fontSize: 24, fontWeight: 800, color: "#15803D", marginTop: 3 }}>{sentCount}</p></div>
        <div className="card" style={{ padding: 15 }}><p style={{ fontSize: 11, color: "#64748B" }}>Falhas de envio</p><p style={{ fontSize: 24, fontWeight: 800, color: failedCount ? "#B91C1C" : "#0F172A", marginTop: 3 }}>{failedCount}</p></div>
        <div className="card" style={{ padding: 15 }}><p style={{ fontSize: 11, color: "#64748B" }}>Última execução</p><p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 7 }}>{lastRun ? formatDate(lastRun.finished_at) : "Ainda não registrada"}</p></div>
      </div>

      <div className="card" style={{ padding: 15, marginBottom: 16, borderColor: "#FECACA" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p style={{ display: "flex", alignItems: "center", gap: 7, color: "#991B1B", fontWeight: 800, fontSize: 13 }}><Trash2 size={15} /> Limpar logs por período</p>
            <p style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>Remove análises, envios e execuções do cron no período informado. A exclusão é permanente.</p>
          </div>
          <span style={{ color: "#94A3B8", fontSize: 11 }}>Retenção automática: {payload.retentionDays || 14} dias</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 11, fontWeight: 700 }}>
            De
            <input type="date" value={cleanupFrom} onChange={(event) => setCleanupFrom(event.target.value)} style={{ padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, color: "#334155", fontSize: 12 }} />
          </label>
          <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 11, fontWeight: 700 }}>
            Até
            <input type="date" value={cleanupTo} onChange={(event) => setCleanupTo(event.target.value)} style={{ padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, color: "#334155", fontSize: 12 }} />
          </label>
          <button type="button" onClick={() => void clearLogsByPeriod()} disabled={cleanupLoading} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 13px", border: 0, borderRadius: 8, background: cleanupLoading ? "#FCA5A5" : "#DC2626", color: "#FFF", fontWeight: 700, fontSize: 12, cursor: cleanupLoading ? "wait" : "pointer" }}>
            {cleanupLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Limpar período
          </button>
        </div>
        {cleanupMessage && <p style={{ color: "#15803D", fontSize: 12, marginTop: 10 }}>{cleanupMessage}</p>}
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 260px" }}>
            <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 11, top: 10 }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, conta ou dashboard..." style={{ width: "100%", padding: "8px 10px 8px 34px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
          </div>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 13, color: "#475569" }}>
            <option value="">Todos os clientes</option>
            {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={provider} onChange={(event) => setProvider(event.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 13, color: "#475569" }}>
            <option value="">Todas as plataformas</option>
            <option value="google_ads">Google Ads</option>
            <option value="meta_ads">Meta Ads</option>
          </select>
          {tab === "checks" && (
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 13, color: "#475569" }}>
              <option value="">Todas as decisões</option>
              {Object.entries(decisionMap).map(([value, presentation]) => <option key={value} value={value}>{presentation.label}</option>)}
            </select>
          )}
          {tab === "events" && (
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 13, color: "#475569" }}>
              <option value="">Todos os envios</option>
              <option value="sent">Enviados</option>
              <option value="pending">Pendentes</option>
              <option value="error">Falhas</option>
            </select>
          )}
          {(search || clientId || provider || statusFilter) && <button type="button" onClick={resetFilters} style={{ padding: "8px 10px", border: 0, background: "transparent", color: "#64748B", fontSize: 12, cursor: "pointer" }}>Limpar filtros</button>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {([
          ["checks", "Análises", ShieldCheck],
          ["events", "Envios", BellRing],
          ["runs", "Execuções do cron", Clock3],
        ] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" onClick={() => { setTab(value); setStatusFilter(""); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 9, border: tab === value ? "1px solid #2563EB" : "1px solid #E2E8F0", background: tab === value ? "#EFF6FF" : "#FFF", color: tab === value ? "#1D4ED8" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab !== "runs" && activeClientGroups.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={expandAllGroups} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", border: "1px solid #E2E8F0", borderRadius: 7, background: "#FFF", color: "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            <ChevronDown size={13} /> Expandir tudo
          </button>
          <button type="button" onClick={collapseAllGroups} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", border: "1px solid #E2E8F0", borderRadius: 7, background: "#FFF", color: "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            <ChevronUp size={13} /> Recolher tudo
          </button>
        </div>
      )}

      <div className="card admin-table-wrap" style={{ overflow: "auto" }}>
        {loading && payload.checks.length === 0 && payload.events.length === 0 && payload.runs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748B" }}><Loader2 className="animate-spin" size={22} style={{ margin: "0 auto 8px" }} /> Carregando histórico...</div>
        ) : tab === "checks" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980 }}>
            <thead><tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}><th style={{ padding: 12 }}>Analisado em</th><th style={{ padding: 12 }}>Cliente / Conta</th><th style={{ padding: 12 }}>Plataforma</th><th style={{ padding: 12 }}>Valor observado</th><th style={{ padding: 12 }}>Limite</th><th style={{ padding: 12 }}>Decisão</th><th style={{ padding: 12 }}>Alerta</th><th style={{ padding: 12 }}></th></tr></thead>
            <tbody>
              {groupedCheckRows.length === 0 ? <tr><td colSpan={8} style={{ padding: 42, textAlign: "center", color: "#64748B" }}><History size={22} style={{ margin: "0 auto 8px" }} />Nenhuma análise registrada com estes filtros.</td></tr> : visibleCheckRows.map((group) => {
                const groupKey = clientExpansionKey(group);
                const clientExpanded = Boolean(expandedClients[groupKey]);
                return <Fragment key={`check-group-${group.clientId}`}>
                  <tr style={{ background: clientExpanded ? "#F8FAFC" : "#FFF", borderBottom: "1px solid #E2E8F0" }}>
                    <td colSpan={8} style={{ padding: "10px 12px", color: "#0F172A", fontWeight: 800 }}>
                      <button type="button" onClick={() => setExpandedClients((current) => ({ ...current, [groupKey]: !clientExpanded }))} aria-expanded={clientExpanded} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}>
                        {clientExpanded ? <ChevronDown size={16} color="#2563EB" /> : <ChevronRight size={16} color="#64748B" />}
                        <span>Cliente: {group.clientName}</span>
                        <span style={{ color: "#64748B", fontWeight: 600 }}>· {group.items.length} análise(s) · {group.days.length} dia(s)</span>
                      </button>
                    </td>
                  </tr>
                  {clientExpanded && group.days.map((day) => {
                    const currentDayKey = dayExpansionKey(group, day.key);
                    const dayExpanded = Boolean(expandedDays[currentDayKey]);
                    return <Fragment key={`check-day-${group.clientId}-${day.key}`}>
                      <tr style={{ background: "#FFF", borderBottom: "1px solid #E2E8F0" }}>
                        <td colSpan={8} style={{ padding: "8px 12px 8px 34px", color: "#475569", fontWeight: 800 }}>
                          <button type="button" onClick={() => setExpandedDays((current) => ({ ...current, [currentDayKey]: !dayExpanded }))} aria-expanded={dayExpanded} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}>
                            {dayExpanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#94A3B8" />}
                            <span>Dia: {day.label}</span>
                            <span style={{ color: "#94A3B8", fontWeight: 600 }}>· {day.items.length} análise(s)</span>
                          </button>
                        </td>
                      </tr>
                      {dayExpanded && day.items.map((item) => {
                        const dashboard = relation(item.dashboards);
                        return <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.observed_at)}</td>
                          <td style={{ padding: 12 }}><strong style={{ color: "#0F172A" }}>{group.clientName}</strong><div style={{ color: "#64748B", marginTop: 2 }}>{item.account_name || item.account_id}</div><div style={{ color: "#94A3B8", marginTop: 2 }}>{dashboard?.name || "Dashboard"}</div></td>
                          <td style={{ padding: 12 }}>{providerLabel(item.provider)}</td>
                          <td style={{ padding: 12, fontWeight: 700 }}>{formatMoney(item.observed_amount, item.currency)}</td>
                          <td style={{ padding: 12 }}>{formatMoney(item.threshold, item.currency)}</td>
                          <td style={{ padding: 12 }}><DecisionBadge decision={item.decision} />{item.error_message && <div style={{ marginTop: 5, color: "#B91C1C", maxWidth: 260 }}>{item.error_message}</div>}</td>
                          <td style={{ padding: 12 }}>{item.alert_sent ? <Badge label="Disparado" bg="#F0FDF4" color="#15803D" /> : <span style={{ color: "#94A3B8" }}>—</span>}</td>
                          <td style={{ padding: 12 }}>{item.dashboard_id && <Link href={`/app/dashboards/${item.dashboard_id}/executive-summary`} target="_blank" style={{ color: "#2563EB", display: "inline-flex" }} title="Abrir dashboard"><ExternalLink size={15} /></Link>}</td>
                        </tr>;
                      })}
                    </Fragment>;
                  })}
                </Fragment>;
              })}
            </tbody>
          </table>
        ) : tab === "events" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980 }}>
            <thead><tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}><th style={{ padding: 12 }}>Detectado em</th><th style={{ padding: 12 }}>Cliente / Conta</th><th style={{ padding: 12 }}>Plataforma</th><th style={{ padding: 12 }}>Valor</th><th style={{ padding: 12 }}>Limite</th><th style={{ padding: 12 }}>Status do envio</th><th style={{ padding: 12 }}>Enviado em</th><th style={{ padding: 12 }}>Detalhes</th></tr></thead>
            <tbody>
              {groupedEventRows.length === 0 ? <tr><td colSpan={8} style={{ padding: 42, textAlign: "center", color: "#64748B" }}><BellRing size={22} style={{ margin: "0 auto 8px" }} />Nenhuma notificação registrada com estes filtros.</td></tr> : visibleEventRows.map((group) => {
                const groupKey = clientExpansionKey(group);
                const clientExpanded = Boolean(expandedClients[groupKey]);
                return <Fragment key={`event-group-${group.clientId}`}>
                  <tr style={{ background: clientExpanded ? "#F8FAFC" : "#FFF", borderBottom: "1px solid #E2E8F0" }}>
                    <td colSpan={8} style={{ padding: "10px 12px", color: "#0F172A", fontWeight: 800 }}>
                      <button type="button" onClick={() => setExpandedClients((current) => ({ ...current, [groupKey]: !clientExpanded }))} aria-expanded={clientExpanded} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}>
                        {clientExpanded ? <ChevronDown size={16} color="#2563EB" /> : <ChevronRight size={16} color="#64748B" />}
                        <span>Cliente: {group.clientName}</span>
                        <span style={{ color: "#64748B", fontWeight: 600 }}>· {group.items.length} envio(s) · {group.days.length} dia(s)</span>
                      </button>
                    </td>
                  </tr>
                  {clientExpanded && group.days.map((day) => {
                    const currentDayKey = dayExpansionKey(group, day.key);
                    const dayExpanded = Boolean(expandedDays[currentDayKey]);
                    return <Fragment key={`event-day-${group.clientId}-${day.key}`}>
                      <tr style={{ background: "#FFF", borderBottom: "1px solid #E2E8F0" }}>
                        <td colSpan={8} style={{ padding: "8px 12px 8px 34px", color: "#475569", fontWeight: 800 }}>
                          <button type="button" onClick={() => setExpandedDays((current) => ({ ...current, [currentDayKey]: !dayExpanded }))} aria-expanded={dayExpanded} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}>
                            {dayExpanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#94A3B8" />}
                            <span>Dia: {day.label}</span>
                            <span style={{ color: "#94A3B8", fontWeight: 600 }}>· {day.items.length} envio(s)</span>
                          </button>
                        </td>
                      </tr>
                      {dayExpanded && day.items.map((item) => {
                        const setting = relation(item.setting);
                        return <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.detected_at)}</td>
                          <td style={{ padding: 12 }}><strong style={{ color: "#0F172A" }}>{group.clientName}</strong><div style={{ color: "#64748B", marginTop: 2 }}>{setting?.account_name || item.account_id}</div></td>
                          <td style={{ padding: 12 }}>{providerLabel(item.provider)}</td>
                          <td style={{ padding: 12, fontWeight: 700 }}>{formatMoney(item.amount, item.currency)}</td>
                          <td style={{ padding: 12 }}>{formatMoney(item.threshold, item.currency)}</td>
                          <td style={{ padding: 12 }}><DeliveryBadge status={item.notification_status} /></td>
                          <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.notified_at)}</td>
                          <td style={{ padding: 12 }}>{item.error_message ? <span style={{ color: "#B91C1C" }}>{item.error_message}</span> : <span style={{ color: "#64748B" }}>{item.decision}</span>}</td>
                        </tr>;
                      })}
                    </Fragment>;
                  })}
                </Fragment>;
              })}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 850 }}>
            <thead><tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}><th style={{ padding: 12 }}>Início</th><th style={{ padding: 12 }}>Fim</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Contas</th><th style={{ padding: 12 }}>Saudáveis</th><th style={{ padding: 12 }}>Alertas</th><th style={{ padding: 12 }}>Suprimidos</th><th style={{ padding: 12 }}>Indisponíveis</th><th style={{ padding: 12 }}>Erros</th></tr></thead>
            <tbody>
              {runs.length === 0 ? <tr><td colSpan={9} style={{ padding: 42, textAlign: "center", color: "#64748B" }}><Clock3 size={22} style={{ margin: "0 auto 8px" }} />Nenhuma execução do cron foi registrada ainda.</td></tr> : runs.map((item) => <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.started_at)}</td><td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.finished_at)}</td><td style={{ padding: 12 }}><RunBadge status={item.status} />{item.error_message && <div style={{ color: "#B91C1C", marginTop: 5 }}>{item.error_message}</div>}</td><td style={{ padding: 12, fontWeight: 700 }}>{item.total_settings}</td><td style={{ padding: 12, color: "#15803D" }}>{item.healthy_count}</td><td style={{ padding: 12, color: "#B91C1C" }}>{item.alerted_count}</td><td style={{ padding: 12, color: "#B45309" }}>{item.suppressed_count}</td><td style={{ padding: 12 }}>{item.unavailable_count}</td><td style={{ padding: 12, color: item.error_count ? "#B91C1C" : "#64748B" }}>{item.error_count}</td>
              </tr>)}
            </tbody>
          </table>
        )}
      </div>

      {tab !== "runs" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12, color: "#64748B", fontSize: 12 }}>
          <span>
            {activeClientGroups.length === 0
              ? "Nenhum cliente neste resultado"
              : `Clientes ${((visibleClientPage - 1) * 10) + 1}–${Math.min(visibleClientPage * 10, activeClientGroups.length)} de ${activeClientGroups.length}`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setClientPage((page) => Math.max(1, page - 1))} disabled={visibleClientPage <= 1} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 9px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFF", color: visibleClientPage <= 1 ? "#CBD5E1" : "#334155", cursor: visibleClientPage <= 1 ? "not-allowed" : "pointer", fontSize: 12 }}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ minWidth: 82, textAlign: "center", fontWeight: 700, color: "#334155" }}>Página {visibleClientPage} de {clientPageCount}</span>
            <button type="button" onClick={() => setClientPage((page) => Math.min(clientPageCount, page + 1))} disabled={visibleClientPage >= clientPageCount} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 9px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFF", color: visibleClientPage >= clientPageCount ? "#CBD5E1" : "#334155", cursor: visibleClientPage >= clientPageCount ? "not-allowed" : "pointer", fontSize: 12 }}>
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
        <WalletCards size={13} /> O histórico de análises começa a ser persistido a partir desta versão. Envios já existentes continuam disponíveis na aba “Envios”.
      </div>
    </div>
  );
}
