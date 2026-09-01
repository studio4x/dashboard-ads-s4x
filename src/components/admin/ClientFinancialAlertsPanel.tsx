"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save, WalletCards } from "lucide-react";

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

function formatMoney(value: number | null, currency: string | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
  } catch {
    return `${currency || ""} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`.trim();
  }
}

export function ClientFinancialAlertsPanel({ clientId }: { clientId: string }) {
  const [accounts, setAccounts] = useState<AccountSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
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
      if (!Number.isFinite(Number(account.thresholdAmount)) || Number(account.thresholdAmount) < 0) {
        throw new Error("Informe um valor de alerta maior ou igual a zero.");
      }
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSourceId: account.dataSourceId,
          provider: account.provider,
          accountId: account.accountId,
          enabled: account.enabled,
          thresholdAmount: Number(account.thresholdAmount),
          repeatIntervalHours: 24,
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

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
          <WalletCards size={20} color="#D97706" /> Alertas financeiros
        </h2>
        <p style={{ marginTop: 5, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
          Notifica o administrador por e-mail e WhatsApp quando o valor realmente disponível da conta fica abaixo do limite configurado. A repetição é limitada a uma vez a cada 24 horas enquanto a conta permanecer abaixo do limite.
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
          Nenhuma conta nativa do Google Ads ou Meta Ads foi encontrada para este cliente. O alerta financeiro fica disponível quando uma conta nativa é vinculada ao dashboard.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((account, index) => {
            const key = `${account.provider}|${account.dataSourceId}|${account.accountId}`;
            const saving = savingKey === key;
            const below = account.lastState === "below_threshold";
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
                    {account.lastObservedAmount !== null && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#475569" }}>
                        Último valor observado: <strong>{formatMoney(account.lastObservedAmount, account.currency)}</strong>
                      </div>
                    )}
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={account.enabled}
                      onChange={(event) => updateAccount(index, { enabled: event.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    Ativar alerta financeiro
                  </label>
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                  <label style={{ flex: "1 1 240px", fontSize: 12, color: "#475569" }}>
                    <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Notificar quando o valor disponível for menor que:</span>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #CBD5E1", borderRadius: 8, overflow: "hidden", background: account.enabled ? "#FFF" : "#F8FAFC" }}>
                      <span style={{ padding: "9px 10px", background: "#F8FAFC", borderRight: "1px solid #E2E8F0", fontWeight: 600, color: "#475569" }}>{currencyLabel(account.currency)}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number.isFinite(account.thresholdAmount) ? account.thresholdAmount : ""}
                        disabled={!account.enabled}
                        onChange={(event) => updateAccount(index, { thresholdAmount: Number(event.target.value) })}
                        style={{ minWidth: 0, width: "100%", padding: "9px 10px", border: 0, outline: 0, background: "transparent", color: "#0F172A" }}
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save(account)}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minWidth: 110, padding: "9px 14px", border: 0, borderRadius: 8, background: saving ? "#94A3B8" : "#2563EB", color: "#FFF", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
