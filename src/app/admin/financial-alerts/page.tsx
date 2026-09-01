"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
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
  runs: RunItem[];
  checks: CheckItem[];
  events: EventItem[];
  error?: string;
};

type Tab = "checks" | "events" | "runs";

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/financial-alerts/history?limit=700", { cache: "no-store" });
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

  const [clientId, setClientId] = useState("");

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

      <div className="card admin-table-wrap" style={{ overflow: "auto" }}>
        {loading && payload.checks.length === 0 && payload.events.length === 0 && payload.runs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748B" }}><Loader2 className="animate-spin" size={22} style={{ margin: "0 auto 8px" }} /> Carregando histórico...</div>
        ) : tab === "checks" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980 }}>
            <thead><tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}><th style={{ padding: 12 }}>Analisado em</th><th style={{ padding: 12 }}>Cliente / Conta</th><th style={{ padding: 12 }}>Plataforma</th><th style={{ padding: 12 }}>Valor observado</th><th style={{ padding: 12 }}>Limite</th><th style={{ padding: 12 }}>Decisão</th><th style={{ padding: 12 }}>Alerta</th><th style={{ padding: 12 }}></th></tr></thead>
            <tbody>
              {checkRows.length === 0 ? <tr><td colSpan={8} style={{ padding: 42, textAlign: "center", color: "#64748B" }}><History size={22} style={{ margin: "0 auto 8px" }} />Nenhuma análise registrada com estes filtros.</td></tr> : checkRows.map((item) => {
                const client = relation(item.clients);
                const dashboard = relation(item.dashboards);
                return <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.observed_at)}</td>
                  <td style={{ padding: 12 }}><strong style={{ color: "#0F172A" }}>{client?.name || "Cliente"}</strong><div style={{ color: "#64748B", marginTop: 2 }}>{item.account_name || item.account_id}</div><div style={{ color: "#94A3B8", marginTop: 2 }}>{dashboard?.name || "Dashboard"}</div></td>
                  <td style={{ padding: 12 }}>{providerLabel(item.provider)}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{formatMoney(item.observed_amount, item.currency)}</td>
                  <td style={{ padding: 12 }}>{formatMoney(item.threshold, item.currency)}</td>
                  <td style={{ padding: 12 }}><DecisionBadge decision={item.decision} />{item.error_message && <div style={{ marginTop: 5, color: "#B91C1C", maxWidth: 260 }}>{item.error_message}</div>}</td>
                  <td style={{ padding: 12 }}>{item.alert_sent ? <Badge label="Disparado" bg="#F0FDF4" color="#15803D" /> : <span style={{ color: "#94A3B8" }}>—</span>}</td>
                  <td style={{ padding: 12 }}>{item.dashboard_id && <Link href={`/app/dashboards/${item.dashboard_id}/executive-summary`} target="_blank" style={{ color: "#2563EB", display: "inline-flex" }} title="Abrir dashboard"><ExternalLink size={15} /></Link>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        ) : tab === "events" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980 }}>
            <thead><tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}><th style={{ padding: 12 }}>Detectado em</th><th style={{ padding: 12 }}>Cliente / Conta</th><th style={{ padding: 12 }}>Plataforma</th><th style={{ padding: 12 }}>Valor</th><th style={{ padding: 12 }}>Limite</th><th style={{ padding: 12 }}>Status do envio</th><th style={{ padding: 12 }}>Enviado em</th><th style={{ padding: 12 }}>Detalhes</th></tr></thead>
            <tbody>
              {eventRows.length === 0 ? <tr><td colSpan={8} style={{ padding: 42, textAlign: "center", color: "#64748B" }}><BellRing size={22} style={{ margin: "0 auto 8px" }} />Nenhuma notificação registrada com estes filtros.</td></tr> : eventRows.map((item) => {
                const client = relation(item.clients);
                const setting = relation(item.setting);
                return <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.detected_at)}</td>
                  <td style={{ padding: 12 }}><strong style={{ color: "#0F172A" }}>{client?.name || "Cliente"}</strong><div style={{ color: "#64748B", marginTop: 2 }}>{setting?.account_name || item.account_id}</div></td>
                  <td style={{ padding: 12 }}>{providerLabel(item.provider)}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{formatMoney(item.amount, item.currency)}</td>
                  <td style={{ padding: 12 }}>{formatMoney(item.threshold, item.currency)}</td>
                  <td style={{ padding: 12 }}><DeliveryBadge status={item.notification_status} /></td>
                  <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(item.notified_at)}</td>
                  <td style={{ padding: 12 }}>{item.error_message ? <span style={{ color: "#B91C1C" }}>{item.error_message}</span> : <span style={{ color: "#64748B" }}>{item.decision}</span>}</td>
                </tr>;
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

      <div style={{ marginTop: 12, fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
        <WalletCards size={13} /> O histórico de análises começa a ser persistido a partir desta versão. Envios já existentes continuam disponíveis na aba “Envios”.
      </div>
    </div>
  );
}
