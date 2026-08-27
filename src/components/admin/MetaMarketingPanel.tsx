"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, Building2, Check, ExternalLink, KeyRound, Link2, Loader2, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import type { MetaAdAccountAsset, MetaBusinessAsset, MetaBusinessConnection, MetaMarketingSettings } from "@/types/meta-marketing";

type SettingsResponse = {
  settings: MetaMarketingSettings;
  status: { appIdConfigured: boolean; appSecretConfigured: boolean; appIdFromEnvironment: boolean; redirectUri: string };
};
type Client = { id: string; name: string };
type Dashboard = { id: string; client_id: string; name: string; dashboard_type?: string };
type Assets = { businesses: MetaBusinessAsset[]; accounts: MetaAdAccountAsset[]; warnings: string[] };

const fieldStyle = { width: "100%", border: "1px solid #CBD5E1", borderRadius: 8, padding: "9px 11px", fontSize: 13, color: "#0F172A", background: "#FFFFFF" } as const;
const labelStyle = { display: "grid", gap: 5, fontSize: 12, fontWeight: 600, color: "#475569" } as const;
const buttonStyle = { border: 0, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 } as const;

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Falha HTTP ${response.status}`);
  return body;
}

export function MetaMarketingPanel() {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [connections, setConnections] = useState<MetaBusinessConnection[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [settingsForm, setSettingsForm] = useState({ appId: "", loginConfigId: "", apiVersion: "v26.0", defaultHistoryDays: 90, defaultLookbackDays: 28, defaultSyncInterval: "daily" });
  const [sourceForm, setSourceForm] = useState({ connectionId: "", clientId: "", dashboardId: "", name: "Meta Marketing API", businessId: "", historyDays: 90, lookbackDays: 28, syncInterval: "daily", accountIds: [] as string[] });

  const loadAll = useCallback(async () => {
    setBusy("loading");
    try {
      const [settings, connectionRows, sourceRows, clientRows, dashboardRows] = await Promise.all([
        jsonRequest("/api/admin/meta/settings"), jsonRequest("/api/admin/meta/connections"), jsonRequest("/api/admin/meta/sources"),
        jsonRequest("/api/admin/clients"), jsonRequest("/api/admin/dashboards/list-all"),
      ]);
      setSettingsData(settings);
      setConnections(Array.isArray(connectionRows) ? connectionRows : []);
      setSources(Array.isArray(sourceRows) ? sourceRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setDashboards(Array.isArray(dashboardRows) ? dashboardRows : []);
      setSettingsForm({
        appId: settings.settings.app_id || "", loginConfigId: settings.settings.login_config_id || "", apiVersion: settings.settings.api_version,
        defaultHistoryDays: settings.settings.default_history_days, defaultLookbackDays: settings.settings.default_lookback_days,
        defaultSyncInterval: settings.settings.default_sync_interval,
      });
      setSourceForm((current) => ({ ...current, historyDays: settings.settings.default_history_days, lookbackDays: settings.settings.default_lookback_days, syncInterval: settings.settings.default_sync_interval }));
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar a integração." });
    } finally { setBusy(null); }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("connection");
    if (status === "success") setNotice({ type: "ok", text: "Conta Meta conectada. Agora selecione o negócio e as contas de anúncios." });
    else if (status) setNotice({ type: "error", text: status === "denied" ? "A autorização foi cancelada na Meta." : "Não foi possível concluir a autorização Meta. Revise a configuração e tente novamente." });
  }, []);

  const filteredDashboards = useMemo(() => dashboards.filter((dashboard) => dashboard.client_id === sourceForm.clientId && String(dashboard.dashboard_type || "").includes("meta")), [dashboards, sourceForm.clientId]);
  const filteredAccounts = useMemo(() => !sourceForm.businessId ? assets?.accounts || [] : (assets?.accounts || []).filter((account) => account.business_id === sourceForm.businessId), [assets, sourceForm.businessId]);
  const selectedBusiness = assets?.businesses.find((business) => business.id === sourceForm.businessId) || null;

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setBusy("settings"); setNotice(null);
    try {
      await jsonRequest("/api/admin/meta/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settingsForm) });
      setNotice({ type: "ok", text: "Configuração Meta salva." }); await loadAll();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar." }); }
    finally { setBusy(null); }
  }

  async function loadAssets(connectionId: string) {
    setBusy(`assets:${connectionId}`); setNotice(null);
    try {
      const data = await jsonRequest(`/api/admin/meta/connections/${connectionId}/assets`);
      setAssets(data); setSourceForm((current) => ({ ...current, connectionId, businessId: "", accountIds: [] }));
      if (!data.accounts?.length) setNotice({ type: "error", text: "Nenhuma conta de anúncios acessível foi encontrada para este usuário Meta." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao consultar ativos." }); }
    finally { setBusy(null); }
  }

  async function createSource(event: React.FormEvent) {
    event.preventDefault(); setBusy("source"); setNotice(null);
    try {
      const accounts = (assets?.accounts || []).filter((account) => sourceForm.accountIds.includes(account.account_id));
      await jsonRequest("/api/admin/meta/sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...sourceForm, businessName: selectedBusiness?.name || null, accounts }) });
      setNotice({ type: "ok", text: "Fonte Meta vinculada. Execute a primeira sincronização abaixo." });
      setAssets(null); setSourceForm((current) => ({ ...current, connectionId: "", clientId: "", dashboardId: "", businessId: "", accountIds: [] })); await loadAll();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao vincular fonte." }); }
    finally { setBusy(null); }
  }

  async function syncSource(id: string) {
    setBusy(`sync:${id}`); setNotice(null);
    try { const result = await jsonRequest(`/api/admin/meta/sources/${id}/sync`, { method: "POST" }); setNotice({ type: "ok", text: `Sincronização concluída: ${result.rowsRead} linhas importadas.` }); await loadAll(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro na sincronização." }); }
    finally { setBusy(null); }
  }

  async function removeSource(id: string) {
    if (!window.confirm("Remover esta fonte Meta? Os snapshots históricos serão preservados.")) return;
    setBusy(`delete:${id}`);
    try { await jsonRequest(`/api/admin/meta/sources/${id}`, { method: "DELETE" }); setNotice({ type: "ok", text: "Fonte Meta removida." }); await loadAll(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao remover fonte." }); }
    finally { setBusy(null); }
  }

  async function revokeConnection(id: string) {
    if (!window.confirm("Revogar esta conexão e apagar o token OAuth do Vault?")) return;
    setBusy(`revoke:${id}`);
    try { await jsonRequest(`/api/admin/meta/connections/${id}`, { method: "DELETE" }); setNotice({ type: "ok", text: "Token removido do Vault e conexão revogada." }); await loadAll(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Erro ao revogar conexão." }); }
    finally { setBusy(null); }
  }

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1120 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 750, color: "#0F172A" }}>Meta Marketing API</h1><p style={{ fontSize: 14, color: "#64748B", marginTop: 5 }}>Conecte gerenciadores de negócios e importe contas próprias ou compartilhadas diretamente da Meta.</p></div>
        <button onClick={() => void loadAll()} disabled={Boolean(busy)} style={{ ...buttonStyle, background: "#E2E8F0", color: "#334155" }}><RefreshCw size={15} /> Atualizar</button>
      </div>

      {notice && <div style={{ marginBottom: 18, padding: "11px 13px", borderRadius: 9, display: "flex", gap: 8, alignItems: "center", background: notice.type === "ok" ? "#ECFDF5" : "#FEF2F2", color: notice.type === "ok" ? "#047857" : "#B91C1C", border: `1px solid ${notice.type === "ok" ? "#A7F3D0" : "#FECACA"}`, fontSize: 13 }}>{notice.type === "ok" ? <Check size={16} /> : <AlertCircle size={16} />}{notice.text}</div>}

      <section className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 18 }}><KeyRound color="#1877F2" size={21} /><div><h2 style={{ fontSize: 16, fontWeight: 700 }}>1. Aplicativo Meta</h2><p style={{ fontSize: 12, color: "#64748B" }}>Dados públicos no painel; o App Secret permanece apenas na Vercel.</p></div></div>
        <form onSubmit={saveSettings}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 13 }}>
            <label style={labelStyle}>Meta App ID<input style={fieldStyle} value={settingsForm.appId} onChange={(e) => setSettingsForm({ ...settingsForm, appId: e.target.value })} placeholder="1234567890" /></label>
            <label style={labelStyle}>Login Configuration ID<input style={fieldStyle} value={settingsForm.loginConfigId} onChange={(e) => setSettingsForm({ ...settingsForm, loginConfigId: e.target.value })} placeholder="Opcional" /></label>
            <label style={labelStyle}>Graph API<input style={fieldStyle} value={settingsForm.apiVersion} onChange={(e) => setSettingsForm({ ...settingsForm, apiVersion: e.target.value })} /></label>
            <label style={labelStyle}>Histórico inicial (dias)<input type="number" min={1} max={730} style={fieldStyle} value={settingsForm.defaultHistoryDays} onChange={(e) => setSettingsForm({ ...settingsForm, defaultHistoryDays: Number(e.target.value) })} /></label>
            <label style={labelStyle}>Reprocessamento (dias)<input type="number" min={1} max={90} style={fieldStyle} value={settingsForm.defaultLookbackDays} onChange={(e) => setSettingsForm({ ...settingsForm, defaultLookbackDays: Number(e.target.value) })} /></label>
            <label style={labelStyle}>Sincronização<select style={fieldStyle} value={settingsForm.defaultSyncInterval} onChange={(e) => setSettingsForm({ ...settingsForm, defaultSyncInterval: e.target.value })}><option value="manual">Manual</option><option value="one_hour">A cada hora</option><option value="six_hours">A cada 6 horas</option><option value="twelve_hours">A cada 12 horas</option><option value="daily">Diária</option><option value="weekly">Semanal</option></select></label>
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#F8FAFC", fontSize: 12, color: "#475569", overflowWrap: "anywhere" }}><strong>URI de redirecionamento:</strong> {settingsData?.status.redirectUri || "Carregando..."}<br /><strong>META_APP_SECRET:</strong> {settingsData?.status.appSecretConfigured ? "configurado na Vercel" : "pendente na Vercel"}</div>
          <button disabled={busy === "settings"} style={{ ...buttonStyle, marginTop: 14, background: "#0F172A", color: "white" }}>{busy === "settings" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar configuração</button>
        </form>
      </section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}><div style={{ display: "flex", gap: 11, alignItems: "center" }}><ShieldCheck color="#1877F2" size={21} /><div><h2 style={{ fontSize: 16, fontWeight: 700 }}>2. Autorizações OAuth</h2><p style={{ fontSize: 12, color: "#64748B" }}>O token é criptografado no Supabase Vault e nunca aparece no navegador.</p></div></div><a href="/api/admin/meta/oauth/start" style={{ ...buttonStyle, textDecoration: "none", background: settingsData?.status.appIdConfigured && settingsData?.status.appSecretConfigured ? "#1877F2" : "#94A3B8", color: "white", pointerEvents: settingsData?.status.appIdConfigured && settingsData?.status.appSecretConfigured ? "auto" : "none" }}><ExternalLink size={15} /> Conectar com Facebook</a></div>
        <div style={{ display: "grid", gap: 10 }}>
          {connections.length === 0 && <p style={{ fontSize: 13, color: "#64748B" }}>Nenhuma conta Meta conectada.</p>}
          {connections.map((connection) => <div key={connection.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 12, border: "1px solid #E2E8F0", borderRadius: 9 }}><BadgeCheck size={18} color={connection.status === "active" ? "#059669" : "#DC2626"} /><div style={{ flex: 1, minWidth: 180 }}><strong style={{ fontSize: 13 }}>{connection.meta_user_name || connection.name}</strong><p style={{ fontSize: 11, color: "#64748B" }}>Status: {connection.status} · permissões: {connection.granted_scopes.join(", ") || "não informadas"}</p></div><button onClick={() => void loadAssets(connection.id)} disabled={connection.status !== "active" || Boolean(busy)} style={{ ...buttonStyle, background: "#EFF6FF", color: "#1D4ED8" }}>{busy === `assets:${connection.id}` ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />} Ver negócios e contas</button><button aria-label="Revogar conexão" onClick={() => void revokeConnection(connection.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, padding: 9, background: "#FEF2F2", color: "#DC2626" }}><Trash2 size={14} /></button></div>)}
        </div>
      </section>

      {assets && <section className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 18 }}><Link2 color="#1877F2" size={21} /><div><h2 style={{ fontSize: 16, fontWeight: 700 }}>3. Vincular contas ao dashboard</h2><p style={{ fontSize: 12, color: "#64748B" }}>{assets.businesses.length} negócios e {assets.accounts.length} contas acessíveis encontrados.</p></div></div>
        <form onSubmit={createSource}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 13 }}>
            <label style={labelStyle}>Cliente<select required style={fieldStyle} value={sourceForm.clientId} onChange={(e) => setSourceForm({ ...sourceForm, clientId: e.target.value, dashboardId: "" })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label style={labelStyle}>Dashboard Meta<select required style={fieldStyle} value={sourceForm.dashboardId} onChange={(e) => setSourceForm({ ...sourceForm, dashboardId: e.target.value })}><option value="">Selecione</option>{filteredDashboards.map((dashboard) => <option key={dashboard.id} value={dashboard.id}>{dashboard.name}</option>)}</select></label>
            <label style={labelStyle}>Nome da fonte<input required minLength={3} maxLength={180} style={fieldStyle} value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} /></label>
            <label style={labelStyle}>Gerenciador de negócios<select style={fieldStyle} value={sourceForm.businessId} onChange={(e) => setSourceForm({ ...sourceForm, businessId: e.target.value, accountIds: [] })}><option value="">Todas as contas acessíveis</option>{assets.businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
            <label style={labelStyle}>Histórico inicial (dias)<input type="number" min={1} max={730} style={fieldStyle} value={sourceForm.historyDays} onChange={(e) => setSourceForm({ ...sourceForm, historyDays: Number(e.target.value) })} /></label>
            <label style={labelStyle}>Reprocessamento (dias)<input type="number" min={1} max={90} style={fieldStyle} value={sourceForm.lookbackDays} onChange={(e) => setSourceForm({ ...sourceForm, lookbackDays: Number(e.target.value) })} /></label>
            <label style={labelStyle}>Sincronização<select style={fieldStyle} value={sourceForm.syncInterval} onChange={(e) => setSourceForm({ ...sourceForm, syncInterval: e.target.value })}><option value="manual">Manual</option><option value="one_hour">A cada hora</option><option value="six_hours">A cada 6 horas</option><option value="twelve_hours">A cada 12 horas</option><option value="daily">Diária</option><option value="weekly">Semanal</option></select></label>
          </div>
          <div style={{ marginTop: 16 }}><p style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Contas de anúncios</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 8, maxHeight: 300, overflow: "auto" }}>{filteredAccounts.map((account) => <label key={account.account_id} style={{ display: "flex", gap: 9, padding: 10, border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", fontSize: 12 }}><input type="checkbox" checked={sourceForm.accountIds.includes(account.account_id)} onChange={(e) => setSourceForm((current) => ({ ...current, accountIds: e.target.checked ? [...current.accountIds, account.account_id] : current.accountIds.filter((id) => id !== account.account_id) }))} /><span><strong>{account.name}</strong><br /><span style={{ color: "#64748B" }}>act_{account.account_id} · {account.access_origin === "client" ? "compartilhada" : account.access_origin === "owned" ? "própria do negócio" : "acesso direto"}</span></span></label>)}</div></div>
          {assets.warnings.length > 0 && <p style={{ marginTop: 10, color: "#B45309", fontSize: 11 }}>{assets.warnings.join(" · ")}</p>}
          <button disabled={busy === "source" || sourceForm.accountIds.length === 0} style={{ ...buttonStyle, marginTop: 14, background: "#1877F2", color: "white", opacity: sourceForm.accountIds.length === 0 ? .55 : 1 }}>{busy === "source" ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Vincular {sourceForm.accountIds.length || ""} conta(s)</button>
        </form>
      </section>}

      <section className="card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Fontes Meta vinculadas</h2>
        {sources.length === 0 ? <p style={{ fontSize: 13, color: "#64748B" }}>Ainda não há fontes Meta vinculadas.</p> : <div style={{ display: "grid", gap: 10 }}>{sources.map((source) => { const config: any = relation(source.meta_ad_sources); const accounts: any[] = Array.isArray(config?.meta_ad_source_accounts) ? config.meta_ad_source_accounts : []; return <div key={source.id} style={{ padding: 13, border: "1px solid #E2E8F0", borderRadius: 9, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ flex: 1, minWidth: 240 }}><strong style={{ fontSize: 13 }}>{source.name}</strong><p style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>{relation<any>(source.clients)?.name} · {relation<any>(source.dashboards)?.name} · {accounts.length} conta(s)</p><p style={{ fontSize: 11, color: config?.last_import_status === "failed" ? "#DC2626" : "#64748B", marginTop: 3 }}>Última sincronização: {config?.last_import_at ? new Date(config.last_import_at).toLocaleString("pt-BR") : "nunca"}{config?.last_error ? ` · ${config.last_error}` : ""}</p></div><button onClick={() => void syncSource(source.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, background: "#ECFDF5", color: "#047857" }}>{busy === `sync:${source.id}` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar agora</button><button aria-label="Remover fonte" onClick={() => void removeSource(source.id)} disabled={Boolean(busy)} style={{ ...buttonStyle, padding: 9, background: "#FEF2F2", color: "#DC2626" }}><Trash2 size={14} /></button></div>; })}</div>}
      </section>
    </div>
  );
}
