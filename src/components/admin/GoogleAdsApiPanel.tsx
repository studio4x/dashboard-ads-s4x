"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, BadgeCheck, Check, ExternalLink, KeyRound, Link2, Loader2, RefreshCw, Save, Search, ShieldCheck, Trash2 } from "lucide-react";
import type { GoogleAdsAccessibleAccount, GoogleAdsConnection, GoogleAdsSettings } from "@/types/google-ads-api";

type SettingsResponse = {
  settings: GoogleAdsSettings;
  status: {
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    developerTokenConfigured: boolean;
    clientIdFromEnvironment: boolean;
    apiVersion: string;
    redirectUri: string;
  };
};

type AccountDiscovery = {
  accounts: GoogleAdsAccessibleAccount[];
  warnings: string[];
  summaryWarnings?: string[];
  diagnostics?: Array<{
    operation: "customer" | "hierarchy";
    customerId: string;
    loginCustomerId: string | null;
    statusCode: number | null;
    apiStatus: string | null;
    errorCode: string | null;
    requestId: string | null;
    classification: string | null;
    message: string;
  }>;
};
type ClientRow = { id: string; name: string };
type DashboardRow = { id: string; client_id: string; name: string; dashboard_type?: string | null };
type NamedRelation = { name?: string | null };
type GoogleAdsSourceConfig = {
  customer_name?: string | null;
  customer_id?: string | null;
  manager_customer_id?: string | null;
  last_import_at?: string | null;
  last_import_status?: string | null;
  last_error?: string | null;
};
type GoogleAdsSourceRow = {
  id: string;
  name: string;
  clients?: NamedRelation | NamedRelation[] | null;
  dashboards?: NamedRelation | NamedRelation[] | null;
  google_ads_sources?: GoogleAdsSourceConfig | GoogleAdsSourceConfig[] | null;
};

async function jsonRequest<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Falha HTTP ${response.status}.`);
  return body as T;
}

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

const fieldStyle: React.CSSProperties = { width: "100%", marginTop: 6, border: "1px solid #CBD5E1", borderRadius: 8, padding: "9px 10px", fontSize: 13, background: "white" };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 650, color: "#475569" };
const buttonStyle: React.CSSProperties = { border: 0, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 };

export function GoogleAdsApiPanel() {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [connections, setConnections] = useState<GoogleAdsConnection[]>([]);
  const [sources, setSources] = useState<GoogleAdsSourceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [dashboards, setDashboards] = useState<DashboardRow[]>([]);
  const [discovery, setDiscovery] = useState<AccountDiscovery | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [settingsForm, setSettingsForm] = useState({ clientId: "", apiVersion: "v25", defaultHistoryDays: 90, defaultLookbackDays: 28, defaultSyncInterval: "daily" });
  const [sourceForm, setSourceForm] = useState({ connectionId: "", clientId: "", dashboardId: "", name: "Google Ads API", managerCustomerId: "", customerId: "", historyDays: 90, lookbackDays: 28, syncInterval: "daily" });

  const loadAll = useCallback(async () => {
    setBusy("loading");
    try {
      const [settings, connectionRows, sourceRows, clientRows, dashboardRows] = await Promise.all([
        jsonRequest<SettingsResponse>("/api/admin/google-ads/settings"), jsonRequest<GoogleAdsConnection[]>("/api/admin/google-ads/connections"), jsonRequest<GoogleAdsSourceRow[]>("/api/admin/google-ads/sources"),
        jsonRequest<ClientRow[]>("/api/admin/clients"), jsonRequest<DashboardRow[]>("/api/admin/dashboards/list-all"),
      ]);
      setSettingsData(settings);
      setConnections(Array.isArray(connectionRows) ? connectionRows : []);
      setSources(Array.isArray(sourceRows) ? sourceRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setDashboards(Array.isArray(dashboardRows) ? dashboardRows : []);
      setSettingsForm({
        clientId: settings.settings.client_id || "", apiVersion: settings.settings.api_version,
        defaultHistoryDays: settings.settings.default_history_days, defaultLookbackDays: settings.settings.default_lookback_days,
        defaultSyncInterval: settings.settings.default_sync_interval,
      });
      setSourceForm((current) => ({ ...current, historyDays: settings.settings.default_history_days, lookbackDays: settings.settings.default_lookback_days, syncInterval: settings.settings.default_sync_interval }));
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar a integração." });
    } finally { setBusy(null); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const status = searchParams.get("connection");
      const clientId = searchParams.get("clientId") || "";
      const dashboardId = searchParams.get("dashboardId") || "";
      if (clientId || dashboardId) {
        setSourceForm((current) => ({
          ...current,
          clientId: clientId || current.clientId,
          dashboardId: dashboardId || current.dashboardId,
        }));
      }
      if (status === "success") setNotice({ type: "ok", text: "Conta Google conectada. Agora liste as contas Google Ads acessíveis." });
      else if (status) setNotice({ type: "error", text: status === "denied" ? "A autorização foi cancelada no Google." : "Não foi possível concluir a autorização Google. Revise a configuração e tente novamente." });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredDashboards = useMemo(() => dashboards.filter((dashboard) => dashboard.client_id === sourceForm.clientId && String(dashboard.dashboard_type || "").includes("google")), [dashboards, sourceForm.clientId]);
  const managers = useMemo(() => (discovery?.accounts || []).filter((account) => account.manager), [discovery]);
  const targetAccounts = useMemo(() => (discovery?.accounts || []).filter((account) => {
    if (account.manager) return false;
    return sourceForm.managerCustomerId ? account.loginCustomerId === sourceForm.managerCustomerId : !account.loginCustomerId || account.directlyAccessible;
  }), [discovery, sourceForm.managerCustomerId]);
  const selectedAccount = discovery?.accounts.find((account) => account.customerId === sourceForm.customerId && !account.manager) || null;

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setBusy("settings"); setNotice(null);
    try {
      await jsonRequest("/api/admin/google-ads/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settingsForm) });
      setNotice({ type: "ok", text: "Configuração Google Ads salva." }); await loadAll();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar." }); }
    finally { setBusy(null); }
  }

  async function loadAccounts(connectionId: string) {
    setBusy(`accounts:${connectionId}`); setNotice(null);
    try {
      const data = await jsonRequest<AccountDiscovery>(`/api/admin/google-ads/connections/${connectionId}/accounts`);
      setDiscovery(data); setSourceForm((current) => ({ ...current, connectionId, managerCustomerId: "", customerId: "" }));
      if (!data.accounts?.length && !data.summaryWarnings?.length) setNotice({ type: "error", text: "Nenhuma conta Google Ads acessível foi encontrada para este usuário." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao consultar contas." }); }
    finally { setBusy(null); }
  }

  async function createSource(event: React.FormEvent) {
    event.preventDefault(); setBusy("source"); setNotice(null);
    try {
      if (!selectedAccount) throw new Error("Selecione uma conta cliente Google Ads.");
      await jsonRequest("/api/admin/google-ads/sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...sourceForm, account: selectedAccount }) });
      setNotice({ type: "ok", text: "Fonte Google Ads vinculada. Execute a primeira sincronização abaixo." });
      setDiscovery(null); setSourceForm((current) => ({ ...current, connectionId: "", clientId: "", dashboardId: "", managerCustomerId: "", customerId: "" })); await loadAll();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao vincular fonte." }); }
    finally { setBusy(null); }
  }

  async function syncSource(id: string) {
    setBusy(`sync:${id}`); setNotice(null);
    try {
      const result = await jsonRequest<{ rowCounts?: Record<string, number>; dateStart: string; dateEnd: string; warnings?: string[] }>(`/api/admin/google-ads/sources/${id}/sync`, { method: "POST" });
      const total = Object.values(result.rowCounts || {}).reduce((sum: number, value) => sum + Number(value || 0), 0);
      setNotice({ type: "ok", text: `Sincronização concluída: ${total} registros normalizados entre ${result.dateStart} e ${result.dateEnd}${result.warnings?.length ? `, com ${result.warnings.length} aviso(s)` : ""}.` });
      await loadAll();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro na sincronização." }); }
    finally { setBusy(null); }
  }

  async function compareSource(id: string) {
    setBusy(`compare:${id}`); setNotice(null);
    try {
      const result = await jsonRequest<{ metrics?: Record<string, { percentDifference: number | null; withinTolerance: boolean }> }>(`/api/admin/google-ads/sources/${id}/compare`);
      const metricEntries = Object.entries(result.metrics || {}) as Array<[string, { percentDifference: number | null; withinTolerance: boolean }]>;
      const outside = metricEntries.filter(([, metric]) => !metric.withinTolerance).map(([key]) => key);
      setNotice({ type: outside.length ? "error" : "ok", text: outside.length ? `Comparação concluída. Fora da tolerância: ${outside.join(", ")}. Revise período, timezone e atribuição.` : "Paridade API × Google Sheets dentro das tolerâncias configuradas para as métricas principais." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro na comparação." }); }
    finally { setBusy(null); }
  }

  async function removeSource(id: string) {
    if (!window.confirm("Remover esta fonte Google Ads API? Os snapshots históricos serão preservados.")) return;
    setBusy(`delete:${id}`);
    try { await jsonRequest(`/api/admin/google-ads/sources/${id}`, { method: "DELETE" }); setNotice({ type: "ok", text: "Fonte Google Ads removida." }); await loadAll(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao remover fonte." }); }
    finally { setBusy(null); }
  }

  async function revokeConnection(id: string) {
    if (!window.confirm("Revogar esta conexão e apagar o refresh token OAuth do Vault?")) return;
    setBusy(`revoke:${id}`);
    try { await jsonRequest(`/api/admin/google-ads/connections/${id}`, { method: "DELETE" }); setNotice({ type: "ok", text: "Refresh token removido do Vault e conexão revogada." }); await loadAll(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao revogar conexão." }); }
    finally { setBusy(null); }
  }

  return <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1120 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
      <div><h1 style={{ fontSize: 24, fontWeight: 750, color: "#0F172A" }}>Google Ads API</h1><p style={{ fontSize: 14, color: "#64748B", marginTop: 5 }}>Importe dados diretamente do Google Ads, mantendo o Google Sheets disponível para comparação e fallback.</p></div>
      <button onClick={() => void loadAll()} disabled={Boolean(busy)} style={{ ...buttonStyle, background: "#E2E8F0", color: "#334155" }}><RefreshCw size={15} /> Atualizar</button>
    </div>
    {notice && <div style={{ marginBottom: 18, padding: "11px 13px", borderRadius: 9, display: "flex", gap: 8, alignItems: "center", background: notice.type === "ok" ? "#ECFDF5" : "#FEF2F2", color: notice.type === "ok" ? "#047857" : "#B91C1C", border: `1px solid ${notice.type === "ok" ? "#A7F3D0" : "#FECACA"}`, fontSize: 13 }}>{notice.type === "ok" ? <Check size={16} /> : <AlertCircle size={16} />}{notice.text}</div>}

    <section className="card" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 18 }}><KeyRound color="#4285F4" size={21} /><div><h2 style={{ fontSize: 16, fontWeight: 700 }}>1. Google Ads API</h2><p style={{ fontSize: 12, color: "#64748B" }}>Client ID público no painel; Client Secret e Developer Token somente na Vercel.</p></div></div>
      <form onSubmit={saveSettings}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 13 }}>
        <label style={labelStyle}>OAuth Client ID<input style={fieldStyle} value={settingsForm.clientId} onChange={(e) => setSettingsForm({ ...settingsForm, clientId: e.target.value })} placeholder="...apps.googleusercontent.com" /></label>
        <label style={labelStyle}>Google Ads API<input style={fieldStyle} value={settingsForm.apiVersion} onChange={(e) => setSettingsForm({ ...settingsForm, apiVersion: e.target.value })} /></label>
        <label style={labelStyle}>Histórico inicial (dias)<input type="number" min={1} max={730} style={fieldStyle} value={settingsForm.defaultHistoryDays} onChange={(e) => setSettingsForm({ ...settingsForm, defaultHistoryDays: Number(e.target.value) })} /></label>
        <label style={labelStyle}>Reprocessamento (dias)<input type="number" min={1} max={90} style={fieldStyle} value={settingsForm.defaultLookbackDays} onChange={(e) => setSettingsForm({ ...settingsForm, defaultLookbackDays: Number(e.target.value) })} /></label>
        <label style={labelStyle}>Sincronização<select style={fieldStyle} value={settingsForm.defaultSyncInterval} onChange={(e) => setSettingsForm({ ...settingsForm, defaultSyncInterval: e.target.value })}><option value="manual">Manual</option><option value="one_hour">A cada hora</option><option value="six_hours">A cada 6 horas</option><option value="twelve_hours">A cada 12 horas</option><option value="daily">Diária</option><option value="weekly">Semanal</option></select></label>
      </div>
      <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#F8FAFC", fontSize: 12, color: "#475569", overflowWrap: "anywhere" }}><strong>Redirect URI:</strong> {settingsData?.status.redirectUri || "Carregando..."}<br /><strong>Client Secret:</strong> {settingsData?.status.clientSecretConfigured ? "configurado na Vercel" : "pendente na Vercel"} · <strong>Developer Token:</strong> {settingsData?.status.developerTokenConfigured ? "configurado na Vercel" : "pendente na Vercel"}</div>
      <button disabled={busy === "settings"} style={{ ...buttonStyle, marginTop: 14, background: "#0F172A", color: "white" }}>{busy === "settings" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar configuração</button></form>
    </section>

    <section className="card" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}><div style={{ display: "flex", gap: 11, alignItems: "center" }}><ShieldCheck color="#4285F4" size={21} /><div><h2 style={{ fontSize: 16, fontWeight: 700 }}>2. Autorizações OAuth</h2><p style={{ fontSize: 12, color: "#64748B" }}>O refresh token fica criptografado no Supabase Vault e nunca aparece no navegador.</p></div></div><a href="/api/admin/google-ads/oauth/start" style={{ ...buttonStyle, textDecoration: "none", background: settingsData?.status.clientIdConfigured && settingsData?.status.clientSecretConfigured ? "#4285F4" : "#94A3B8", color: "white", pointerEvents: settingsData?.status.clientIdConfigured && settingsData?.status.clientSecretConfigured ? "auto" : "none" }}><ExternalLink size={15} /> Conectar com Google</a></div>
      <div style={{ display: "grid", gap: 10 }}>{connections.length === 0 && <p style={{ fontSize: 13, color: "#64748B" }}>Nenhuma conta Google conectada.</p>}{connections.map((connection) => <div key={connection.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 12, border: "1px solid #E2E8F0", borderRadius: 9 }}><BadgeCheck size={18} color={connection.status === "active" ? "#059669" : "#DC2626"} /><div style={{ flex: 1, minWidth: 180 }}><strong style={{ fontSize: 13 }}>{connection.google_user_email || connection.name}</strong><p style={{ fontSize: 11, color: "#64748B" }}>Status: {connection.status} · última validação: {connection.last_validated_at ? new Date(connection.last_validated_at).toLocaleString("pt-BR") : "nunca"}</p></div><button onClick={() => void loadAccounts(connection.id)} disabled={connection.status !== "active" || Boolean(busy)} style={{ ...buttonStyle, background: "#EFF6FF", color: "#1D4ED8" }}>{busy === `accounts:${connection.id}` ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Ver contas</button><button aria-label="Revogar conexão" onClick={() => void revokeConnection(connection.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, padding: 9, background: "#FEF2F2", color: "#DC2626" }}><Trash2 size={14} /></button></div>)}</div>
    </section>

    {discovery && <section className="card" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 18 }}><Link2 color="#4285F4" size={21} /><div><h2 style={{ fontSize: 16, fontWeight: 700 }}>3. Vincular conta ao dashboard</h2><p style={{ fontSize: 12, color: "#64748B" }}>{managers.length} MCC(s) e {discovery.accounts.filter((account) => !account.manager).length} conta(s) cliente encontradas.</p></div></div>
      {discovery.summaryWarnings?.length ? <div role="alert" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, marginBottom: 16, borderRadius: 9, background: "#FFFBEB", color: "#92400E", border: "1px solid #FCD34D", fontSize: 13 }}><AlertTriangle size={19} style={{ flex: "0 0 auto", marginTop: 1 }} /><div><strong style={{ display: "block", marginBottom: 5 }}>Developer Token ainda sem acesso à produção</strong><p>{discovery.summaryWarnings.join(" ")}</p>{discovery.diagnostics?.some((diagnostic) => diagnostic.classification === "developer_token_production_access_required") && <details style={{ marginTop: 9, fontSize: 11 }}><summary style={{ cursor: "pointer", fontWeight: 650 }}>Ver detalhes técnicos</summary><div style={{ marginTop: 7, display: "grid", gap: 4 }}>{discovery.diagnostics.filter((diagnostic) => diagnostic.classification === "developer_token_production_access_required").map((diagnostic) => <div key={`${diagnostic.operation}:${diagnostic.customerId}:${diagnostic.requestId || "no-request"}`}>{diagnostic.operation === "customer" ? "Customer" : "MCC"} {diagnostic.customerId} · {diagnostic.errorCode || diagnostic.apiStatus || `HTTP ${diagnostic.statusCode || "n/d"}`}{diagnostic.requestId ? ` · request-id ${diagnostic.requestId}` : ""}</div>)}</div></details>}</div></div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, fontSize: 11, color: "#475569" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 999, background: "#ECFDF5", color: "#047857" }}><Check size={13} /> OAuth conectado</span><span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 999, background: "#EFF6FF", color: "#1D4ED8" }}><Check size={13} /> Customer IDs descobertos</span>{discovery.summaryWarnings?.length ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 999, background: "#FEF3C7", color: "#92400E" }}><AlertTriangle size={13} /> Validação de produção pendente</span> : null}</div>
      <form onSubmit={createSource}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 13 }}>
        <label style={labelStyle}>Cliente<select required style={fieldStyle} value={sourceForm.clientId} onChange={(e) => setSourceForm({ ...sourceForm, clientId: e.target.value, dashboardId: "" })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label style={labelStyle}>Dashboard Google<select required style={fieldStyle} value={sourceForm.dashboardId} onChange={(e) => setSourceForm({ ...sourceForm, dashboardId: e.target.value })}><option value="">Selecione</option>{filteredDashboards.map((dashboard) => <option key={dashboard.id} value={dashboard.id}>{dashboard.name}</option>)}</select></label>
        <label style={labelStyle}>Nome da fonte<input required minLength={3} maxLength={180} style={fieldStyle} value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} /></label>
        <label style={labelStyle}>Gerenciador / MCC<select style={fieldStyle} value={sourceForm.managerCustomerId} onChange={(e) => setSourceForm({ ...sourceForm, managerCustomerId: e.target.value, customerId: "" })}><option value="">Acesso direto</option>{managers.map((manager) => <option key={manager.customerId} value={manager.customerId}>{manager.descriptiveName} · {manager.formattedCustomerId}</option>)}</select></label>
        <label style={labelStyle}>Conta Google Ads<select required style={fieldStyle} value={sourceForm.customerId} onChange={(e) => setSourceForm({ ...sourceForm, customerId: e.target.value })}><option value="">Selecione uma conta cliente</option>{targetAccounts.map((account) => <option key={`${account.customerId}:${account.loginCustomerId || "direct"}`} value={account.customerId}>{account.descriptiveName} · {account.formattedCustomerId}{account.testAccount ? " · TESTE" : ""} · {account.currencyCode || "moeda n/d"}</option>)}</select></label>
        <label style={labelStyle}>Histórico (dias)<input type="number" min={1} max={730} style={fieldStyle} value={sourceForm.historyDays} onChange={(e) => setSourceForm({ ...sourceForm, historyDays: Number(e.target.value) })} /></label>
        <label style={labelStyle}>Lookback (dias)<input type="number" min={1} max={90} style={fieldStyle} value={sourceForm.lookbackDays} onChange={(e) => setSourceForm({ ...sourceForm, lookbackDays: Number(e.target.value) })} /></label>
        <label style={labelStyle}>Sincronização<select style={fieldStyle} value={sourceForm.syncInterval} onChange={(e) => setSourceForm({ ...sourceForm, syncInterval: e.target.value })}><option value="manual">Manual</option><option value="one_hour">A cada hora</option><option value="six_hours">A cada 6 horas</option><option value="twelve_hours">A cada 12 horas</option><option value="daily">Diária</option><option value="weekly">Semanal</option></select></label>
      </div>{discovery.warnings.length > 0 && <p style={{ marginTop: 10, color: "#B45309", fontSize: 11 }}>{discovery.warnings.join(" · ")}</p>}<button disabled={Boolean(busy) || !selectedAccount} style={{ ...buttonStyle, marginTop: 14, background: "#4285F4", color: "white", opacity: selectedAccount ? 1 : .55 }}>{busy === "source" ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Vincular conta</button></form>
    </section>}

    <section className="card" style={{ padding: 22 }}><h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Fontes Google Ads API vinculadas</h2>{sources.length === 0 ? <p style={{ fontSize: 13, color: "#64748B" }}>Ainda não há fontes Google Ads API vinculadas.</p> : <div style={{ display: "grid", gap: 10 }}>{sources.map((source) => { const config = relation(source.google_ads_sources); return <div key={source.id} style={{ padding: 13, border: "1px solid #E2E8F0", borderRadius: 9, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><div style={{ flex: 1, minWidth: 260 }}><strong style={{ fontSize: 13 }}>{source.name}</strong><p style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>{relation(source.clients)?.name} · {relation(source.dashboards)?.name} · {config?.customer_name} ({config?.customer_id}){config?.manager_customer_id ? ` via MCC ${config.manager_customer_id}` : ""}</p><p style={{ fontSize: 11, color: config?.last_import_status === "failed" ? "#DC2626" : "#64748B", marginTop: 3 }}>Última sincronização: {config?.last_import_at ? new Date(config.last_import_at).toLocaleString("pt-BR") : "nunca"}{config?.last_error ? ` · ${config.last_error}` : ""}</p></div><button onClick={() => void compareSource(source.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, background: "#FFF7ED", color: "#C2410C" }}>{busy === `compare:${source.id}` ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Comparar Sheets</button><button onClick={() => void syncSource(source.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, background: "#ECFDF5", color: "#047857" }}>{busy === `sync:${source.id}` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar agora</button><button aria-label="Remover fonte" onClick={() => void removeSource(source.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, padding: 9, background: "#FEF2F2", color: "#DC2626" }}><Trash2 size={14} /></button></div>; })}</div>}</section>
  </div>;
}
