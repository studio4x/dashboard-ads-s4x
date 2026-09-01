"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Loader2, Play, RefreshCw, Save, WalletCards } from "lucide-react";

type AccountSetting = {
  id: string | null;
  dataSourceId: string;
  dashboardId: string;
  dashboardName: string;
  provider: "google_ads" | "meta_ads";
  accountId: string;
  accountName: string;
  currency: string | null;
  enabled: boolean;
  thresholdAmount: number;
  repeatIntervalHours: number;
  lastState: string;
  lastObservedAmount: number | null;
  lastObservedAt: string | null;
  lastNotifiedAt: string | null;
  amountAlertEnabled: boolean;
  daysAlertEnabled: boolean;
  thresholdDays: number;
  lastObservedDaysRemaining: number | null;
  lastTriggerType: string | null;
};

type ActionResult = {
  amount?: number | null;
  estimatedDaysRemaining?: number | null;
  threshold?: number;
  thresholdDays?: number;
  decision?: string;
  triggerType?: string | null;
  alertSent?: boolean;
  amountLabel?: string;
};

function currencyLabel(currency: string | null) {
  const code = currency || "BRL";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: code, minimumFractionDigits: 2 })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value || code;
  } catch {
    return code;
  }
}

function formatMoney(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
  } catch {
    return `${currency || ""} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`.trim();
  }
}

function formatDays(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

export function ClientFinancialAlertsPanel({ clientId }: { clientId: string }) {
  const [accounts, setAccounts] = useState<AccountSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const endpoint = useMemo(() => `/api/admin/clients/${clientId}/financial-alerts`, [clientId]);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar os alertas financeiros.");
      setAccounts(Array.isArray(json.accounts) ? json.accounts : []);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Falha ao carregar alertas financeiros." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [endpoint]);

  const updateAccount = (index: number, patch: Partial<AccountSetting>) => {
    setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const save = async (account: AccountSetting) => {
    const key = `${account.provider}|${account.dataSourceId}|${account.accountId}`;
    setSavingKey(key);
    setMessage(null);
    try {
      if (!Number.isFinite(Number(account.thresholdAmount)) || Number(account.thresholdAmount) < 0) throw new Error("Informe um limite financeiro maior ou igual a zero.");
      if (!Number.isFinite(Number(account.thresholdDays)) || Number(account.thresholdDays) < 0) throw new Error("Informe um limite de dias válido.");
      if (account.enabled && !account.amountAlertEnabled && !account.daysAlertEnabled) throw new Error("Ative ao menos um gatilho: valor disponível ou dias restantes.");
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSourceId: account.dataSourceId,
          provider: account.provider,
          accountId: account.accountId,
          enabled: account.enabled,
          thresholdAmount: Number(account.thresholdAmount),
          amountAlertEnabled: account.amountAlertEnabled,
          daysAlertEnabled: account.daysAlertEnabled,
          thresholdDays: Number(account.thresholdDays),
          repeatIntervalHours: Number(account.repeatIntervalHours || 24),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível salvar o alerta financeiro.");
      setMessage({ tone: "success", text: `Alerta de ${account.accountName} salvo com sucesso.` });
      await load();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Falha ao salvar o alerta financeiro." });
    } finally {
      setSavingKey(null);
    }
  };

  const runAction = async (account: AccountSetting, action: "inspect" | "run" | "test_notification") => {
    if (!account.id) {
      setMessage({ tone: "error", text: "Salve a configuração desta conta antes de executar testes." });
      return;
    }
    const key = `${account.id}:${action}`;
    setActionKey(key);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, settingId: account.id }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível executar a ação.");
      if (action === "test_notification") {
        setMessage({ tone: "success", text: `Notificação de teste de ${account.accountName} enviada ao administrador.` });
      } else {
        setActionResults((current) => ({ ...current, [account.id!]: json.result || {} }));
        setMessage({
          tone: "success",
          text: action === "run"
            ? (json.result?.alertSent ? "Análise executada e alerta enviado." : `Análise executada: ${json.result?.decision || "sem alerta"}.`)
            : "Valor financeiro verificado sem alterar o estado do alerta.",
        });
        if (action === "run") await load();
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Falha ao executar ação financeira." });
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
          <WalletCards size={20} color="#D97706" /> Alertas financeiros
        </h2>
        <p style={{ marginTop: 5, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
          O alerta pode considerar o valor disponível, a cobertura estimada em dias ou os dois critérios. Enquanto a condição persistir, a repetição respeita o intervalo configurado.
        </p>
      </div>

      {message && (
        <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", fontSize: 12, background: message.tone === "success" ? "#F0FDF4" : "#FEF2F2", color: message.tone === "success" ? "#15803D" : "#B91C1C" }}>
          {message.tone === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, display: "flex", justifyContent: "center", color: "#64748B" }}><Loader2 size={20} className="animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div style={{ padding: 18, borderRadius: 8, background: "#F8FAFC", border: "1px dashed #CBD5E1", fontSize: 13, color: "#64748B" }}>
          Nenhuma conta nativa do Google Ads ou Meta Ads foi encontrada para este cliente.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((account, index) => {
            const key = `${account.provider}|${account.dataSourceId}|${account.accountId}`;
            const saving = savingKey === key;
            const below = account.lastState === "below_threshold";
            const result = account.id ? actionResults[account.id] : null;
            return (
              <div key={key} style={{ border: `1px solid ${below ? "#FCA5A5" : "#E2E8F0"}`, borderRadius: 10, padding: 16, background: below ? "#FFF7F7" : "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: account.provider === "meta_ads" ? "#EEF2FF" : "#EFF6FF", color: "#1D4ED8" }}>
                        {account.provider === "meta_ads" ? "Meta Ads" : "Google Ads"}
                      </span>
                      {below && <span style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C" }}>⚠ Abaixo do limite</span>}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{account.accountName}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: "#64748B" }}>ID: {account.accountId} · Dashboard: {account.dashboardName}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "#475569" }}>
                      <span>Último valor: <strong>{formatMoney(account.lastObservedAmount, account.currency)}</strong></span>
                      <span>Cobertura: <strong>{formatDays(account.lastObservedDaysRemaining)}</strong></span>
                    </div>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={account.enabled} onChange={(event) => updateAccount(index, { enabled: event.target.checked })} style={{ width: 16, height: 16 }} />
                    Ativar alerta financeiro
                  </label>
                </div>

                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", background: account.amountAlertEnabled ? "#FFF" : "#F8FAFC" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 9 }}>
                      <input type="checkbox" checked={account.amountAlertEnabled} onChange={(event) => updateAccount(index, { amountAlertEnabled: event.target.checked })} disabled={!account.enabled} /> Gatilho por valor disponível
                    </label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #CBD5E1", borderRadius: 8, overflow: "hidden" }}>
                      <span style={{ padding: "8px 9px", background: "#F8FAFC", borderRight: "1px solid #E2E8F0", fontWeight: 600, color: "#475569", fontSize: 11 }}>{currencyLabel(account.currency)}</span>
                      <input type="number" min="0" step="0.01" value={Number.isFinite(account.thresholdAmount) ? account.thresholdAmount : ""} disabled={!account.enabled || !account.amountAlertEnabled} onChange={(event) => updateAccount(index, { thresholdAmount: Number(event.target.value) })} style={{ minWidth: 0, width: "100%", padding: "8px 9px", border: 0, outline: 0, background: "transparent", color: "#0F172A", fontSize: 11 }} />
                    </div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", background: account.daysAlertEnabled ? "#FFF" : "#F8FAFC" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 9 }}>
                      <input type="checkbox" checked={account.daysAlertEnabled} onChange={(event) => updateAccount(index, { daysAlertEnabled: event.target.checked })} disabled={!account.enabled} /> Gatilho por cobertura estimada
                    </label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #CBD5E1", borderRadius: 8, overflow: "hidden" }}>
                      <input type="number" min="0" step="0.1" value={Number.isFinite(account.thresholdDays) ? account.thresholdDays : ""} disabled={!account.enabled || !account.daysAlertEnabled} onChange={(event) => updateAccount(index, { thresholdDays: Number(event.target.value) })} style={{ minWidth: 0, width: "100%", padding: "8px 9px", border: 0, outline: 0, background: "transparent", color: "#0F172A", fontSize: 11 }} />
                      <span style={{ padding: "8px 9px", background: "#F8FAFC", borderLeft: "1px solid #E2E8F0", fontWeight: 600, color: "#475569", fontSize: 11 }}>dias</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(130px,.5fr) 1fr", gap: 12, alignItems: "end" }}>
                  <label style={{ fontSize: 11, color: "#475569" }}><span style={{ display: "block", marginBottom: 5, fontWeight: 700 }}>Repetir após (h)</span><input type="number" min={1} max={720} value={account.repeatIntervalHours || 24} disabled={!account.enabled} onChange={(event) => updateAccount(index, { repeatIntervalHours: Number(event.target.value) })} style={{ width: "100%", padding: 8, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 11 }} /></label>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, flexWrap: "wrap" }}>
                    <button type="button" disabled={!account.id || actionKey === `${account.id}:inspect`} onClick={() => void runAction(account, "inspect")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", color: "#334155", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{actionKey === `${account.id}:inspect` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Verificar agora</button>
                    <button type="button" disabled={!account.id || actionKey === `${account.id}:test_notification`} onClick={() => void runAction(account, "test_notification")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 10px", border: "1px solid #FDBA74", borderRadius: 7, background: "#FFF7ED", color: "#C2410C", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{actionKey === `${account.id}:test_notification` ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />} Testar alerta</button>
                    <button type="button" disabled={!account.id || !account.enabled || actionKey === `${account.id}:run`} onClick={() => void runAction(account, "run")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 10px", border: "1px solid #93C5FD", borderRadius: 7, background: "#EFF6FF", color: "#1D4ED8", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{actionKey === `${account.id}:run` ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Executar análise</button>
                    <button type="button" disabled={saving} onClick={() => void save(account)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 11px", border: 0, borderRadius: 7, background: saving ? "#94A3B8" : "#2563EB", color: "#FFF", fontSize: 10, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>{saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar</button>
                  </div>
                </div>

                {result && (
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 11, color: "#475569", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span>Valor atual: <strong>{formatMoney(result.amount, account.currency)}</strong></span>
                    <span>Cobertura: <strong>{formatDays(result.estimatedDaysRemaining)}</strong></span>
                    <span>Decisão: <strong>{result.decision || "—"}</strong></span>
                    {result.triggerType && <span>Gatilho: <strong>{result.triggerType}</strong></span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
