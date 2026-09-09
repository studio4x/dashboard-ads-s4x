"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, History, Pause, Play, RotateCcw, Search, ShieldCheck, SlidersHorizontal, WalletCards, X } from "lucide-react";

export type NegativeSuggestion = {
  campaignId: string;
  campaignName: string;
  term: string;
  clicks: number;
  cost: number;
};

export type KeywordSuggestion = {
  adGroupId: string;
  criterionId: string;
  keyword: string;
  matchType: string;
  clicks: number;
  cost: number;
  conversions: number;
  status: string;
};

export type EntityOption = {
  id: string;
  parentId?: string;
  name: string;
  status: string;
};

export type BudgetOption = {
  campaignId: string;
  campaignName: string;
  amount: number;
  currencyCode: string;
};

type Preview = {
  requestId: string;
  previewHash: string;
  operationType: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  executable: boolean;
  blockedReason: string | null;
  account: { customerId: string; customerName: string; currencyCode: string | null };
  resourceType: string;
  resourceName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  description: string;
  warnings: string[];
  reversible: boolean;
  validatedByGoogle: boolean;
  requiredConfirmation?: string | null;
};

type HistoryItem = {
  id: string;
  operation_type: string;
  risk_level: string;
  resource_type: string;
  target: Record<string, unknown>;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown>;
  status: string;
  revertible: boolean;
  executed_at: string | null;
  reverted_at: string | null;
  google_request_id: string | null;
  error_message: string | null;
};

type Props = {
  sourceId: string;
  negatives: NegativeSuggestion[];
  keywords: KeywordSuggestion[];
  ads: EntityOption[];
  adGroups: EntityOption[];
  budgets: BudgetOption[];
};

function brl(value: number, currencyCode = "BRL") {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currencyCode }).format(value); }
  catch { return `R$ ${value.toFixed(2).replace(".", ",")}`; }
}

function statusLabel(value: unknown) {
  const status = String(value || "").toUpperCase();
  if (status === "ENABLED") return "Ativo";
  if (status === "PAUSED") return "Pausado";
  return status || "—";
}

function risk(value: Preview["riskLevel"]) {
  if (value === "low") return { label: "Baixo risco", color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" };
  if (value === "medium") return { label: "Risco moderado", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" };
  if (value === "critical") return { label: "Risco crítico", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" };
  return { label: "Alto risco", color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" };
}

function operationLabel(value: string) {
  const labels: Record<string, string> = {
    add_campaign_negative_keyword: "Negativa adicionada",
    set_keyword_status: "Status de palavra-chave",
    set_ad_status: "Status de anúncio",
    set_ad_group_status: "Status de grupo",
    set_campaign_budget: "Orçamento diário",
  };
  return labels[value] || value;
}

function historySummary(item: HistoryItem) {
  const target = item.target || {};
  if (item.operation_type === "add_campaign_negative_keyword") return `“${String(target.text || "") }” · ${String(target.matchType || "")}`;
  if (item.operation_type === "set_campaign_budget") return `Campanha ${String(target.campaignId || "")} · ${String(target.amount || "")}`;
  if (item.operation_type === "set_keyword_status") return `Palavra-chave ${String(target.criterionId || "")} · ${statusLabel(target.status)}`;
  if (item.operation_type === "set_ad_status") return `Anúncio ${String(target.adId || "")} · ${statusLabel(target.status)}`;
  if (item.operation_type === "set_ad_group_status") return `Grupo ${String(target.adGroupId || "")} · ${statusLabel(target.status)}`;
  return "Alteração Google Ads";
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return <div style={{ flex: "1 1 180px", border: "1px solid #E2E8F0", borderRadius: 9, padding: 11, background: "#F8FAFC" }}><p style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>{label}</p><p style={{ marginTop: 4, fontSize: 13, fontWeight: 720, color: "#334155" }}>{value}</p></div>;
}

function previewValues(preview: Preview) {
  const before = preview.before || {};
  const after = preview.after || {};
  if (preview.operationType === "add_campaign_negative_keyword") {
    return { before: "Não existe", after: `Negativa ${String(after.matchType || "").toUpperCase() === "EXACT" ? "exata" : "de frase"}: “${String(after.text || "")}”` };
  }
  if (["set_keyword_status", "set_ad_status", "set_ad_group_status"].includes(preview.operationType)) {
    return { before: statusLabel(before.status), after: statusLabel(after.status) };
  }
  if (preview.operationType === "set_campaign_budget") {
    const currency = preview.account.currencyCode || "BRL";
    return { before: brl(Number(before.amount || 0), currency), after: brl(Number(after.amount || 0), currency) };
  }
  return { before: "Estado atual confirmado", after: "Novo estado" };
}

export function GoogleAdsWriteCenterClient({ sourceId, negatives, keywords, ads, adGroups, budgets }: Props) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [matchByTerm, setMatchByTerm] = useState<Record<string, "EXACT" | "PHRASE">>({});
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>(() => Object.fromEntries(budgets.map((item) => [item.campaignId, String(item.amount)])));
  const [selectedAd, setSelectedAd] = useState(ads[0]?.id || "");
  const [selectedGroup, setSelectedGroup] = useState(adGroups[0]?.id || "");

  const appliedCount = useMemo(() => history.filter((item) => item.status === "applied").length, [history]);

  async function loadHistory() {
    try {
      const response = await fetch(`/api/admin/google-ads/changes?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
      if (!response.ok) return;
      const json = await response.json();
      setHistory(Array.isArray(json.items) ? json.items : []);
    } catch { /* histórico não deve bloquear o restante da tela */ }
  }

  useEffect(() => { void loadHistory(); }, [sourceId]);

  async function prepare(key: string, operationType: string, target: Record<string, unknown>) {
    setLoadingKey(key);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/google-ads/changes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ sourceId, operationType, target }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível preparar a alteração.");
      setPreview(json.preview as Preview);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível preparar a alteração." });
    } finally {
      setLoadingKey(null);
    }
  }

  async function execute() {
    if (!preview?.requestId || !preview.executable) return;
    setLoadingKey(`execute:${preview.requestId}`);
    try {
      const response = await fetch("/api/admin/google-ads/changes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ requestId: preview.requestId, previewHash: preview.previewHash, confirmation: preview.requiredConfirmation || "APLICAR" }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível aplicar a alteração.");
      setPreview(null);
      setMessage({ type: "ok", text: "Alteração aplicada no Google Ads e registrada no histórico." });
      await loadHistory();
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível aplicar a alteração." });
      setPreview(null);
      await loadHistory();
    } finally {
      setLoadingKey(null);
    }
  }

  async function revert(item: HistoryItem) {
    if (!item.revertible || item.status !== "applied") return;
    const confirmed = window.confirm("Desfazer esta alteração no Google Ads? A plataforma fará uma nova validação antes de reverter.");
    if (!confirmed) return;
    setLoadingKey(`revert:${item.id}`);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/google-ads/changes/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: item.id, confirmation: "DESFAZER" }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível desfazer.");
      setMessage({ type: "ok", text: "Alteração desfeita no Google Ads." });
      await loadHistory();
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível desfazer." });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <section data-s4x-google-ads-write-center="true" className="card" style={{ padding: 20, marginBottom: 18, border: "1px solid #BFDBFE", background: "linear-gradient(180deg,#FFFFFF 0%,#F8FBFF 100%)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <ShieldCheck size={21} color="#2563EB" style={{ marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 16, fontWeight: 760, color: "#0F172A" }}>Otimizar no Google Ads</h2>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: "#1D4ED8", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "3px 7px" }}>APROVAÇÃO MANUAL</span>
          </div>
          <p style={{ marginTop: 3, fontSize: 11, color: "#64748B", lineHeight: 1.45 }}>A plataforma prepara e valida a alteração na API. Nada é aplicado até você revisar o antes/depois e confirmar.</p>
        </div>
        <button type="button" onClick={() => setHistoryOpen((value) => !value)} style={{ height: 31, border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFF", color: "#475569", padding: "0 9px", fontSize: 10.5, fontWeight: 720, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}><History size={13} /> Histórico {appliedCount ? `· ${appliedCount}` : ""}<ChevronDown size={12} /></button>
      </div>

      {message ? <div style={{ marginTop: 12, border: `1px solid ${message.type === "ok" ? "#A7F3D0" : "#FECACA"}`, background: message.type === "ok" ? "#ECFDF5" : "#FEF2F2", color: message.type === "ok" ? "#047857" : "#B91C1C", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, fontWeight: 650 }}>{message.text}</div> : null}

      {negatives.length || keywords.length ? <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        {negatives.length ? <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, background: "#FFF", padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Search size={15} color="#EA580C" /><strong style={{ fontSize: 12.5 }}>Buscas candidatas a negativa</strong></div>
          <p style={{ marginTop: 3, fontSize: 10.5, color: "#94A3B8" }}>Somente sinais claros de baixa intenção. A negativa exata é o padrão mais conservador.</p>
          <div style={{ marginTop: 7 }}>
            {negatives.slice(0, 5).map((item) => {
              const key = `neg:${item.campaignId}:${item.term}`;
              const matchType = matchByTerm[key] || "EXACT";
              return <div key={key} style={{ borderTop: "1px solid #F1F5F9", padding: "9px 0", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}><p style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", overflowWrap: "anywhere" }}>{item.term}</p><p style={{ marginTop: 2, fontSize: 9.8, color: "#94A3B8" }}>{item.clicks} clique(s) · {brl(item.cost)} · sem conversão</p></div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <select value={matchType} onChange={(event) => setMatchByTerm((current) => ({ ...current, [key]: event.target.value as "EXACT" | "PHRASE" }))} style={{ height: 28, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 9.5, color: "#475569", background: "#FFF" }}><option value="EXACT">Exata</option><option value="PHRASE">De frase</option></select>
                  <button type="button" disabled={loadingKey === key} onClick={() => void prepare(key, "add_campaign_negative_keyword", { campaignId: item.campaignId, text: item.term, matchType })} style={{ height: 28, border: "1px solid #FDBA74", borderRadius: 7, background: "#FFF7ED", color: "#C2410C", padding: "0 8px", fontSize: 9.5, fontWeight: 800, cursor: "pointer" }}>{loadingKey === key ? "Validando…" : "Preparar"}</button>
                </div>
              </div>;
            })}
          </div>
        </div> : null}

        {keywords.length ? <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, background: "#FFF", padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><SlidersHorizontal size={15} color="#7C3AED" /><strong style={{ fontSize: 12.5 }}>Palavras-chave que merecem revisão</strong></div>
          <p style={{ marginTop: 3, fontSize: 10.5, color: "#94A3B8" }}>Pausar exige confirmação. O estado é relido diretamente do Google antes da aplicação.</p>
          <div style={{ marginTop: 7 }}>
            {keywords.slice(0, 5).map((item) => {
              const key = `kw:${item.adGroupId}:${item.criterionId}`;
              const nextStatus = item.status.toUpperCase() === "PAUSED" ? "ENABLED" : "PAUSED";
              return <div key={key} style={{ borderTop: "1px solid #F1F5F9", padding: "9px 0", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
                <div><p style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>{item.keyword}</p><p style={{ marginTop: 2, fontSize: 9.8, color: "#94A3B8" }}>{item.matchType} · {item.clicks} clique(s) · {brl(item.cost)} · {item.conversions} conv.</p></div>
                <button type="button" disabled={loadingKey === key} onClick={() => void prepare(key, "set_keyword_status", { adGroupId: item.adGroupId, criterionId: item.criterionId, status: nextStatus })} style={{ height: 28, border: "1px solid #C4B5FD", borderRadius: 7, background: "#F5F3FF", color: "#6D28D9", padding: "0 8px", fontSize: 9.5, fontWeight: 800, cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}>{nextStatus === "PAUSED" ? <Pause size={11} /> : <Play size={11} />}{loadingKey === key ? "Validando…" : nextStatus === "PAUSED" ? "Preparar pausa" : "Preparar ativação"}</button>
              </div>;
            })}
          </div>
        </div> : null}
      </div> : <p style={{ marginTop: 13, fontSize: 11.5, color: "#64748B" }}>Nenhuma alteração automática de baixo ou médio risco foi sugerida neste recorte.</p>}

      <details style={{ marginTop: 12, borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
        <summary style={{ cursor: "pointer", fontSize: 10.5, fontWeight: 760, color: "#64748B" }}>Outras alterações controladas</summary>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
          {budgets.map((item) => {
            const key = `budget:${item.campaignId}`;
            return <div key={key} style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 11, background: "#FFF" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><WalletCards size={14} color="#059669" /><strong style={{ fontSize: 11.5 }}>Orçamento diário</strong></div><p style={{ marginTop: 4, fontSize: 9.5, color: "#94A3B8", overflowWrap: "anywhere" }}>{item.campaignName}</p><div style={{ marginTop: 7, display: "flex", gap: 6 }}><input aria-label="Novo orçamento diário" type="number" min="1" step="1" value={budgetDraft[item.campaignId] ?? String(item.amount)} onChange={(event) => setBudgetDraft((current) => ({ ...current, [item.campaignId]: event.target.value }))} style={{ minWidth: 0, flex: 1, height: 30, border: "1px solid #CBD5E1", borderRadius: 7, padding: "0 8px", fontSize: 11 }} /><button type="button" disabled={loadingKey === key} onClick={() => void prepare(key, "set_campaign_budget", { campaignId: item.campaignId, amount: Number(budgetDraft[item.campaignId]) })} style={{ height: 30, border: "1px solid #86EFAC", borderRadius: 7, background: "#F0FDF4", color: "#047857", padding: "0 8px", fontSize: 9.5, fontWeight: 800, cursor: "pointer" }}>Revisar</button></div><p style={{ marginTop: 4, fontSize: 9.5, color: "#94A3B8" }}>Atual: {brl(item.amount, item.currencyCode)} · limite direto: ±30% por alteração</p></div>;
          })}

          {adGroups.length ? <div style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 11, background: "#FFF" }}><strong style={{ fontSize: 11.5 }}>Grupo de anúncios</strong><select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} style={{ marginTop: 7, width: "100%", height: 30, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 10 }}>{adGroups.map((item) => <option key={item.id} value={item.id}>{item.name} · {statusLabel(item.status)}</option>)}</select>{(() => { const item = adGroups.find((entity) => entity.id === selectedGroup); if (!item) return null; const next = item.status.toUpperCase() === "PAUSED" ? "ENABLED" : "PAUSED"; return <button type="button" onClick={() => void prepare(`group:${item.id}`, "set_ad_group_status", { adGroupId: item.id, status: next })} style={{ marginTop: 6, width: "100%", height: 29, border: "1px solid #CBD5E1", borderRadius: 7, background: "#F8FAFC", color: "#475569", fontSize: 9.5, fontWeight: 760, cursor: "pointer" }}>Preparar para {next === "PAUSED" ? "pausar" : "ativar"}</button>; })()}</div> : null}

          {ads.length ? <div style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 11, background: "#FFF" }}><strong style={{ fontSize: 11.5 }}>Anúncio</strong><select value={selectedAd} onChange={(event) => setSelectedAd(event.target.value)} style={{ marginTop: 7, width: "100%", height: 30, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 10 }}>{ads.map((item) => <option key={`${item.parentId}:${item.id}`} value={item.id}>{item.name} · {statusLabel(item.status)}</option>)}</select>{(() => { const item = ads.find((entity) => entity.id === selectedAd); if (!item) return null; const next = item.status.toUpperCase() === "PAUSED" ? "ENABLED" : "PAUSED"; return <button type="button" onClick={() => void prepare(`ad:${item.id}`, "set_ad_status", { adGroupId: item.parentId, adId: item.id, status: next })} style={{ marginTop: 6, width: "100%", height: 29, border: "1px solid #CBD5E1", borderRadius: 7, background: "#F8FAFC", color: "#475569", fontSize: 9.5, fontWeight: 760, cursor: "pointer" }}>Preparar para {next === "PAUSED" ? "pausar" : "ativar"}</button>; })()}</div> : null}
        </div>
      </details>

      {historyOpen ? <div style={{ marginTop: 12, borderTop: "1px solid #E2E8F0", paddingTop: 10 }}><p style={{ fontSize: 10.5, fontWeight: 760, color: "#475569", marginBottom: 6 }}>Últimas alterações pela plataforma</p>{history.length ? history.slice(0, 8).map((item) => <div key={item.id} style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid #F1F5F9" }}><div><p style={{ fontSize: 10.5, fontWeight: 700, color: "#334155" }}>{operationLabel(item.operation_type)} · {historySummary(item)}</p><p style={{ marginTop: 1, fontSize: 9.2, color: item.status === "applied" ? "#047857" : item.status === "reverted" ? "#64748B" : item.status === "failed" ? "#B91C1C" : "#94A3B8" }}>{item.status === "applied" ? "Aplicada" : item.status === "reverted" ? "Desfeita" : item.status === "failed" ? "Falhou" : item.status}{item.executed_at ? ` · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.executed_at))}` : ""}</p></div>{item.status === "applied" && item.revertible ? <button type="button" disabled={loadingKey === `revert:${item.id}`} onClick={() => void revert(item)} style={{ border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", color: "#475569", height: 27, padding: "0 7px", fontSize: 9.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}><RotateCcw size={11} />Desfazer</button> : null}</div>) : <p style={{ fontSize: 10.5, color: "#94A3B8" }}>Nenhuma alteração aplicada pela plataforma ainda.</p>}</div> : null}

      {preview ? <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.42)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "min(620px,100%)", maxHeight: "90vh", overflowY: "auto", background: "#FFF", borderRadius: 14, boxShadow: "0 24px 70px rgba(15,23,42,.25)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><ShieldCheck size={21} color="#2563EB" /><div style={{ flex: 1 }}><h3 style={{ fontSize: 16, fontWeight: 780 }}>Revisar antes de aplicar</h3><p style={{ marginTop: 3, fontSize: 10.5, color: "#64748B" }}>{preview.account.customerName} · {preview.account.customerId}</p></div><button aria-label="Fechar" type="button" onClick={() => setPreview(null)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748B" }}><X size={18} /></button></div>
          <p style={{ marginTop: 13, fontSize: 13, lineHeight: 1.55, color: "#334155", fontWeight: 650 }}>{preview.description}</p>
          <div style={{ marginTop: 11, display: "flex", gap: 8, flexWrap: "wrap" }}>{(() => { const values = previewValues(preview); return <><PreviewValue label="Antes" value={values.before} /><PreviewValue label="Depois" value={values.after} /></>; })()}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}><span style={{ border: `1px solid ${risk(preview.riskLevel).border}`, background: risk(preview.riskLevel).bg, color: risk(preview.riskLevel).color, borderRadius: 999, padding: "4px 8px", fontSize: 9.5, fontWeight: 800 }}>{risk(preview.riskLevel).label}</span>{preview.validatedByGoogle ? <span style={{ fontSize: 9.8, color: "#047857", fontWeight: 750, display: "inline-flex", gap: 4, alignItems: "center" }}><CheckCircle2 size={12} />Pré-validado pela API do Google Ads</span> : null}</div>
          {preview.warnings?.length ? <div style={{ marginTop: 11, border: "1px solid #FDE68A", borderRadius: 9, background: "#FFFBEB", padding: 10 }}>{preview.warnings.map((warning) => <p key={warning} style={{ fontSize: 10.5, lineHeight: 1.5, color: "#92400E", display: "flex", gap: 6 }}><AlertTriangle size={12} style={{ flex: "0 0 auto", marginTop: 2 }} />{warning}</p>)}</div> : null}
          {preview.blockedReason ? <div style={{ marginTop: 11, border: "1px solid #FECACA", borderRadius: 9, background: "#FEF2F2", padding: 10, fontSize: 11, lineHeight: 1.5, color: "#B91C1C", fontWeight: 650 }}>{preview.blockedReason}</div> : null}
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}><button type="button" onClick={() => setPreview(null)} style={{ height: 34, border: "1px solid #CBD5E1", background: "#FFF", color: "#475569", borderRadius: 8, padding: "0 12px", fontSize: 10.5, fontWeight: 750, cursor: "pointer" }}>Cancelar</button>{preview.executable ? <button type="button" disabled={loadingKey === `execute:${preview.requestId}`} onClick={() => void execute()} style={{ height: 34, border: "1px solid #2563EB", background: "#2563EB", color: "#FFF", borderRadius: 8, padding: "0 13px", fontSize: 10.5, fontWeight: 800, cursor: "pointer" }}>{loadingKey === `execute:${preview.requestId}` ? "Aplicando…" : "Confirmar e aplicar no Google Ads"}</button> : null}</div>
          <p style={{ marginTop: 9, fontSize: 9.3, lineHeight: 1.45, color: "#94A3B8" }}>Ao confirmar, o estado do recurso será relido. Se algo tiver mudado desde esta prévia, a execução será bloqueada e você precisará gerar uma nova revisão.</p>
        </div>
      </div> : null}
    </section>
  );
}
