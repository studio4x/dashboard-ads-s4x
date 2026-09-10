"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock3,
  FilePenLine,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import type {
  GoogleAdsAutomationAction,
  GoogleAdsAutomationAd,
  GoogleAdsAutomationContext,
  GoogleAdsAutomationGroup,
  GoogleAdsAutomationReadiness,
} from "@/lib/google-ads-api/optimization-actions";
import type { GoogleAdsRiskLevel } from "@/types/google-ads-mutations";

type Props = { sourceId: string; context: GoogleAdsAutomationContext };
type Controls = { sourceEnabled: boolean; globalEnabled: boolean; highRiskEnabled: boolean };
type Recommendation = { resourceName: string; type: string; impact: unknown; campaign?: { resourceName?: string; name?: string } };
type ChangeOrigin = "S4X_ANALYSIS" | "GOOGLE_RECOMMENDATION" | "MANUAL" | "AI_DRAFT";
type Preview = {
  requestId: string;
  previewHash: string;
  operationType: string;
  riskLevel: GoogleAdsRiskLevel;
  executable: boolean;
  blockedReason: string | null;
  description: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  warnings: string[];
  requiredConfirmation: string | null;
  validatedByGoogle: boolean;
  reversible?: boolean;
};

type AssistantSection = "keywords" | "ads" | "segmentation" | "budget_bidding" | "assets" | "conversions";
type Values = {
  campaignId: string;
  adGroupId: string;
  adId: string;
  keywordText: string;
  matchType: string;
  headlines: string;
  descriptions: string;
  finalUrls: string;
  finalMobileUrls: string;
  dayOfWeek: string;
  start: string;
  end: string;
  geoSearch: string;
  countryCode: string;
  geoTargetResourceName: string;
  geoName: string;
  targetCpa: string;
  targetRoas: string;
  strategy: string;
  assetType: string;
  assetText: string;
  assetUrl: string;
  phoneNumber: string;
  existingAssetResourceName: string;
  conversionResourceName: string;
  conversionValue: string;
};

const GROUPS: Array<{ key: GoogleAdsAutomationGroup; label: string }> = [
  { key: "keywords", label: "Palavras-chave" },
  { key: "ads", label: "Anúncios" },
  { key: "segmentation", label: "Segmentação" },
  { key: "budget_bidding", label: "Orçamento e lances" },
  { key: "assets", label: "Recursos" },
];

const READINESS: Record<GoogleAdsAutomationReadiness, { label: string; color: string; background: string; border: string }> = {
  ready: { label: "PODE AGIR AGORA", color: "#047857", background: "#ECFDF5", border: "#A7F3D0" },
  review: { label: "REVISAR COM CAUTELA", color: "#1D4ED8", background: "#EFF6FF", border: "#BFDBFE" },
  wait: { label: "AGUARDAR MAIS DADOS", color: "#92400E", background: "#FFFBEB", border: "#FDE68A" },
  manual: { label: "EXIGE AJUSTE ASSISTIDO", color: "#6D28D9", background: "#F5F3FF", border: "#DDD6FE" },
};

const RISK_LABEL: Record<GoogleAdsRiskLevel, string> = {
  low: "Baixo risco",
  medium: "Risco moderado",
  high: "Alto risco",
  critical: "Risco crítico",
};

function fieldStyle(): CSSProperties {
  return { width: "100%", minWidth: 0, height: 34, border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 9px", fontSize: 11, color: "#334155", background: "#FFF" };
}

function buttonStyle(tone: "primary" | "neutral" | "danger" = "primary"): CSSProperties {
  const palette = tone === "danger"
    ? { border: "#FCA5A5", background: "#FEF2F2", color: "#B91C1C" }
    : tone === "neutral"
      ? { border: "#CBD5E1", background: "#FFF", color: "#475569" }
      : { border: "#93C5FD", background: "#EFF6FF", color: "#1D4ED8" };
  return { minHeight: 32, border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.background, color: palette.color, padding: "6px 10px", fontSize: 10.5, fontWeight: 800, cursor: "pointer" };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: "grid", gap: 4, minWidth: 0, fontSize: 9.5, fontWeight: 760, color: "#64748B" }}>{label}{children}</label>;
}

function Grid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 9 }}>{children}</div>;
}

function asLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function initialValues(context: GoogleAdsAutomationContext): Values {
  const campaign = context.campaigns[0];
  const adGroup = context.adGroups.find((item) => item.campaignId === campaign?.id) || context.adGroups[0];
  const ad = context.ads.find((item) => item.adGroupId === adGroup?.id && item.type === "RESPONSIVE_SEARCH_AD") || context.ads[0];
  return {
    campaignId: campaign?.id || "",
    adGroupId: adGroup?.id || "",
    adId: ad?.id || "",
    keywordText: "",
    matchType: "EXACT",
    headlines: ad?.headlines.join("\n") || "",
    descriptions: ad?.descriptions.join("\n") || "",
    finalUrls: ad?.finalUrls.join("\n") || "",
    finalMobileUrls: ad?.finalMobileUrls.join("\n") || "",
    dayOfWeek: "MONDAY",
    start: "08:00",
    end: "18:00",
    geoSearch: "",
    countryCode: "BR",
    geoTargetResourceName: "",
    geoName: "",
    targetCpa: campaign?.targetCpaMicros ? String(campaign.targetCpaMicros) : "",
    targetRoas: campaign?.targetRoas ? String(campaign.targetRoas) : "",
    strategy: campaign?.biddingStrategyType || "MAXIMIZE_CONVERSIONS",
    assetType: "SITELINK",
    assetText: "",
    assetUrl: "",
    phoneNumber: "",
    existingAssetResourceName: context.assets[0]?.resourceName || "",
    conversionResourceName: context.conversionActions[0]?.resourceName || "",
    conversionValue: "true",
  };
}

function recommendationLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase("pt-BR").replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function ActionIcon({ group }: { group: GoogleAdsAutomationGroup }) {
  if (group === "keywords") return <Search size={16} color="#EA580C" />;
  if (group === "ads") return <Megaphone size={16} color="#7C3AED" />;
  if (group === "segmentation") return <MapPin size={16} color="#0891B2" />;
  if (group === "budget_bidding") return <WalletCards size={16} color="#059669" />;
  return <FilePenLine size={16} color="#2563EB" />;
}

export function GoogleAdsAdvancedActions({ sourceId, context }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [controls, setControls] = useState<Controls | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<GoogleAdsAutomationGroup | "all">("all");
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSection, setAssistantSection] = useState<AssistantSection>("keywords");
  const [assistantOrigin, setAssistantOrigin] = useState<ChangeOrigin>("MANUAL");
  const [values, setValues] = useState<Values>(() => initialValues(context));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activeAction, setActiveAction] = useState<GoogleAdsAutomationAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [geoResults, setGeoResults] = useState<Array<{ resourceName: string; name: string; canonicalName: string; countryCode: string; targetType?: string }>>([]);

  const selectedCampaign = useMemo(() => context.campaigns.find((item) => item.id === values.campaignId) || null, [context.campaigns, values.campaignId]);
  const availableGroups = useMemo(() => context.adGroups.filter((item) => !values.campaignId || item.campaignId === values.campaignId), [context.adGroups, values.campaignId]);
  const availableAds = useMemo(() => context.ads.filter((item) => !values.adGroupId || item.adGroupId === values.adGroupId), [context.ads, values.adGroupId]);
  const selectedAd = useMemo(() => availableAds.find((item) => item.id === values.adId) || null, [availableAds, values.adId]);
  const visibleActions = useMemo(() => context.actions.filter((item) => activeGroup === "all" || item.group === activeGroup), [activeGroup, context.actions]);
  const actionIndex = useMemo(() => JSON.stringify(context.actions.map((item) => ({ group: item.group, readiness: item.readiness }))), [context.actions]);
  const batchableActions = useMemo(() => context.actions.filter((item) => item.target && item.operationType && ["add_campaign_negative_keyword", "add_ad_group_keyword", "set_keyword_status"].includes(item.operationType) && item.readiness !== "wait" && item.readiness !== "manual"), [context.actions]);
  const selectedBatch = batchableActions.filter((item) => selectedActionIds.includes(item.id));
  const readyCount = context.actions.filter((item) => item.readiness === "ready").length;

  function setValue<Key extends keyof Values>(key: Key, value: Values[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleBatchAction(actionId: string) {
    setSelectedActionIds((current) => current.includes(actionId) ? current.filter((id) => id !== actionId) : [...current, actionId]);
  }

  function selectCampaign(campaignId: string) {
    const campaign = context.campaigns.find((item) => item.id === campaignId);
    const group = context.adGroups.find((item) => item.campaignId === campaignId);
    const ad = context.ads.find((item) => item.campaignId === campaignId && (!group || item.adGroupId === group.id));
    setValues((current) => ({
      ...current,
      campaignId,
      adGroupId: group?.id || "",
      adId: ad?.id || "",
      headlines: ad?.headlines.join("\n") || "",
      descriptions: ad?.descriptions.join("\n") || "",
      finalUrls: ad?.finalUrls.join("\n") || "",
      finalMobileUrls: ad?.finalMobileUrls.join("\n") || "",
      targetCpa: campaign?.targetCpaMicros ? String(campaign.targetCpaMicros) : "",
      targetRoas: campaign?.targetRoas ? String(campaign.targetRoas) : "",
      strategy: campaign?.biddingStrategyType || current.strategy,
    }));
  }

  function selectAd(adId: string) {
    const ad = context.ads.find((item) => item.id === adId);
    setValues((current) => ({
      ...current,
      adId,
      campaignId: ad?.campaignId || current.campaignId,
      adGroupId: ad?.adGroupId || current.adGroupId,
      headlines: ad?.headlines.join("\n") || "",
      descriptions: ad?.descriptions.join("\n") || "",
      finalUrls: ad?.finalUrls.join("\n") || "",
      finalMobileUrls: ad?.finalMobileUrls.join("\n") || "",
    }));
  }

  const loadControls = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/google-ads/changes?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
      if (!response.ok) return;
      const json = await response.json();
      if (json?.controls) setControls(json.controls as Controls);
    } catch { /* a indisponibilidade do status não remove as proteções server-side */ }
  }, [sourceId]);

  const loadRecommendations = useCallback(async () => {
    setRecommendationLoading(true);
    try {
      const response = await fetch(`/api/admin/google-ads/recommendations?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível consultar as recomendações do Google Ads.");
      setRecommendations(Array.isArray(json.items) ? json.items : []);
    } catch (error) {
      setMessage({ tone: "info", text: error instanceof Error ? error.message : "As recomendações do Google Ads não estão disponíveis agora." });
    } finally {
      setRecommendationLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void loadControls();
      void loadRecommendations();
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadControls, loadRecommendations]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ group?: GoogleAdsAutomationGroup; openAssistant?: boolean }>).detail;
      if (detail?.group) setActiveGroup(detail.group);
      if (detail?.group && detail.openAssistant) {
        setAssistantSection(detail.group);
        setAssistantOrigin("S4X_ANALYSIS");
        setAssistantOpen(true);
      }
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("s4x:open-google-ads-action", listener);
    return () => window.removeEventListener("s4x:open-google-ads-action", listener);
  }, []);

  async function prepare(operationType: string, target: Record<string, unknown>, action: GoogleAdsAutomationAction | null = null, origin: ChangeOrigin = action ? "S4X_ANALYSIS" : assistantOrigin) {
    setLoading(true);
    setMessage(null);
    setConfirmation("");
    setActiveAction(action);
    try {
      const response = await fetch("/api/admin/google-ads/changes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ sourceId, operationType, target, origin }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível preparar a alteração.");
      setPreview(json.preview as Preview);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível preparar a alteração." });
      setActiveAction(null);
    } finally {
      setLoading(false);
    }
  }

  async function execute() {
    if (!preview?.executable) return;
    const required = preview.requiredConfirmation || "APLICAR";
    if (confirmation !== required) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/google-ads/changes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ requestId: preview.requestId, previewHash: preview.previewHash, confirmation }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível aplicar a alteração.");
      setPreview(null);
      setActiveAction(null);
      setConfirmation("");
      setMessage({ tone: "ok", text: "Alteração aplicada e confirmada pela leitura pós-escrita. Atualize a análise para ver o novo estado consolidado." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível aplicar a alteração." });
    } finally {
      setLoading(false);
    }
  }

  async function toggleSource() {
    if (!controls) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/google-ads/changes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, enabled: !controls.sourceEnabled }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Somente owner pode alterar a trava da fonte.");
      setControls((current) => current ? { ...current, sourceEnabled: Boolean(json.sourceEnabled) } : current);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível alterar a trava da fonte." });
    } finally {
      setLoading(false);
    }
  }

  async function searchGeo() {
    if (values.geoSearch.trim().length < 2) {
      setMessage({ tone: "error", text: "Digite ao menos dois caracteres para buscar uma localização." });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/google-ads/geo-targets?sourceId=${encodeURIComponent(sourceId)}&q=${encodeURIComponent(values.geoSearch)}&countryCode=${encodeURIComponent(values.countryCode)}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível buscar localizações.");
      setGeoResults(Array.isArray(json.items) ? json.items : []);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível buscar localizações." });
    } finally {
      setLoading(false);
    }
  }

  async function draftRsa(ad: GoogleAdsAutomationAd) {
    setLoading(true);
    setMessage(null);
    selectAd(ad.id);
    try {
      const keywords = context.keywords.filter((item) => item.adGroupId === ad.adGroupId).sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks).slice(0, 12);
      const response = await fetch("/api/admin/google-ads/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          objective: `Melhorar relevância e conversão do anúncio ${ad.name} na campanha ${ad.campaignName}`,
          keywords: keywords.map((item) => item.text),
          currentAd: { headlines: ad.headlines, descriptions: ad.descriptions, finalUrls: ad.finalUrls },
          evidence: keywords.map((item) => ({ text: item.text, qualityScore: item.qualityScore, clicks: item.clicks, conversions: item.conversions })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível gerar o rascunho.");
      const draft = json.draft || {};
      setValues((current) => ({
        ...current,
        campaignId: ad.campaignId,
        adGroupId: ad.adGroupId,
        adId: ad.id,
        headlines: Array.isArray(draft.headlines) ? draft.headlines.join("\n") : ad.headlines.join("\n"),
        descriptions: Array.isArray(draft.descriptions) ? draft.descriptions.join("\n") : ad.descriptions.join("\n"),
        finalUrls: ad.finalUrls.join("\n"),
        finalMobileUrls: ad.finalMobileUrls.join("\n"),
      }));
      setAssistantSection("ads");
      setAssistantOrigin("AI_DRAFT");
      setAssistantOpen(true);
      setMessage({ tone: "ok", text: "Rascunho criado com o contexto real da análise. Revise e edite antes de preparar a alteração." });
      window.setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível gerar o rascunho." });
    } finally {
      setLoading(false);
    }
  }

  function openAssistant(section: AssistantSection, action?: GoogleAdsAutomationAction) {
    if (action?.target) {
      const target = action.target;
      const campaignId = String(target.campaignId || action.campaignId || values.campaignId);
      selectCampaign(campaignId);
      setValues((current) => ({
        ...current,
        campaignId,
        dayOfWeek: String(target.dayOfWeek || current.dayOfWeek),
        start: String(target.start || current.start),
        end: String(target.end || current.end),
        assetType: String(target.assetType || current.assetType),
      }));
    }
    setAssistantSection(section);
    setAssistantOrigin(action ? "S4X_ANALYSIS" : "MANUAL");
    setAssistantOpen(true);
  }

  function handleAction(action: GoogleAdsAutomationAction) {
    if (action.readiness === "wait") {
      setMessage({ tone: "info", text: `${action.title}: a amostra ainda não é suficiente para preparar uma alteração segura.` });
      return;
    }
    if (action.operationType && action.target) {
      void prepare(action.operationType, action.target, action);
      return;
    }
    if (action.editor === "rsa_draft") {
      const ad = context.ads.find((item) => item.id === String(action.target?.adId || "") && item.adGroupId === String(action.target?.adGroupId || ""));
      if (ad) void draftRsa(ad);
      return;
    }
    openAssistant(action.editor === "asset_draft" ? "assets" : "segmentation", action);
  }

  const isLoading = loading;
  const campaignSelect = <select value={values.campaignId} onChange={(event) => selectCampaign(event.target.value)} style={fieldStyle()}>{context.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>;

  return <section ref={rootRef} id="google-ads-optimization-center" data-s4x-google-ads-advanced-actions="true" data-s4x-action-index={actionIndex} className="card" style={{ width: "100%", boxSizing: "border-box", margin: "18px 0", padding: 20, border: "1px solid #BFDBFE", borderRadius: 12, background: "linear-gradient(180deg,#FFFFFF 0%,#F8FBFF 100%)", overflow: "hidden", scrollMarginTop: 24 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 250, flex: 1 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "#DBEAFE", color: "#1D4ED8", flex: "0 0 auto" }}><Sparkles size={17} /></div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><h2 style={{ fontSize: 16, color: "#0F172A", fontWeight: 780 }}>Centro de operações inteligentes</h2><span style={{ fontSize: 9, fontWeight: 850, color: "#1D4ED8", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "3px 7px" }}>VINCULADO À ANÁLISE</span></div>
          <p style={{ marginTop: 4, maxWidth: 760, fontSize: 11, lineHeight: 1.5, color: "#64748B" }}>A S4X cruzou o período de {context.period.start} a {context.period.end} com campanhas, termos, palavras-chave, anúncios, recursos e configurações sincronizadas. Os alvos técnicos já estão preenchidos; você apenas revisa e confirma.</p>
        </div>
      </div>
      <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: readyCount ? "#047857" : "#64748B" }}>{readyCount} ação(ões) pronta(s) para revisão</span>
        <span style={{ fontSize: 9.5, color: controls?.sourceEnabled && controls.globalEnabled ? "#047857" : "#92400E", fontWeight: 760 }}>{controls?.sourceEnabled && controls.globalEnabled ? "Escrita habilitada pelas travas" : "Alterações reais estão desativadas"}</span>
      </div>
    </div>

    <div style={{ marginTop: 12, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setActiveGroup("all")} style={{ ...buttonStyle(activeGroup === "all" ? "primary" : "neutral"), minHeight: 29, padding: "4px 8px" }}>Todas · {context.actions.length}</button>
      {GROUPS.map((group) => {
        const count = context.actions.filter((item) => item.group === group.key).length;
        if (!count) return null;
        return <button key={group.key} type="button" onClick={() => setActiveGroup(group.key)} style={{ ...buttonStyle(activeGroup === group.key ? "primary" : "neutral"), minHeight: 29, padding: "4px 8px" }}>{group.label} · {count}</button>;
      })}
      {selectedBatch.length ? <button type="button" disabled={isLoading} onClick={() => void prepare("batch_google_ads_changes", { items: selectedBatch.map((item) => ({ operationType: item.operationType, target: item.target })) }, null, "S4X_ANALYSIS")} style={{ ...buttonStyle("primary"), minHeight: 29 }}>Preparar {selectedBatch.length} em lote</button> : null}
      <button type="button" onClick={() => { setAssistantOrigin("MANUAL"); setAssistantOpen((value) => !value); }} style={{ ...buttonStyle("neutral"), minHeight: 29, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}><FilePenLine size={12} /> Configuração assistida <ChevronDown size={12} /></button>
    </div>

    {message ? <div style={{ marginTop: 11, border: `1px solid ${message.tone === "ok" ? "#A7F3D0" : message.tone === "error" ? "#FECACA" : "#BFDBFE"}`, background: message.tone === "ok" ? "#ECFDF5" : message.tone === "error" ? "#FEF2F2" : "#EFF6FF", color: message.tone === "ok" ? "#047857" : message.tone === "error" ? "#B91C1C" : "#1D4ED8", borderRadius: 8, padding: "9px 10px", fontSize: 10.5, lineHeight: 1.45 }}>{message.text}</div> : null}

    {visibleActions.length ? <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(285px,1fr))", gap: 10 }}>
      {visibleActions.map((action) => {
        const readiness = READINESS[action.readiness];
        const batchable = batchableActions.some((item) => item.id === action.id);
        return <article key={action.id} data-s4x-smart-action={action.group} data-s4x-action-readiness={action.readiness} style={{ border: "1px solid #E2E8F0", borderRadius: 10, background: "#FFF", padding: 12, display: "grid", gap: 8, alignContent: "start" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><ActionIcon group={action.group} /><div style={{ minWidth: 0, flex: 1 }}><strong style={{ fontSize: 11.5, lineHeight: 1.35, color: "#334155" }}>{action.title}</strong>{action.campaignName ? <p style={{ marginTop: 2, fontSize: 9.5, color: "#94A3B8", overflowWrap: "anywhere" }}>{action.campaignName}</p> : null}</div>{batchable ? <input type="checkbox" aria-label={`Selecionar ${action.title} para lote`} checked={selectedActionIds.includes(action.id)} onChange={() => toggleBatchAction(action.id)} style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer", flex: "0 0 auto" }} /> : null}</div>
          <p style={{ fontSize: 10.5, lineHeight: 1.45, color: "#475569" }}>{action.reason}</p>
          <p style={{ fontSize: 9.5, lineHeight: 1.4, color: "#64748B", background: "#F8FAFC", borderRadius: 7, padding: "6px 7px" }}>{action.evidence}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ border: `1px solid ${readiness.border}`, background: readiness.background, color: readiness.color, borderRadius: 999, padding: "3px 6px", fontSize: 8.5, fontWeight: 850 }}>{readiness.label}</span><span style={{ fontSize: 9, color: "#64748B", fontWeight: 700 }}>{RISK_LABEL[action.riskLevel]}</span></div>
          <button type="button" disabled={isLoading} onClick={() => handleAction(action)} style={{ ...buttonStyle(action.readiness === "wait" ? "neutral" : "primary"), marginTop: 1, width: "100%", opacity: isLoading ? 0.55 : 1 }}>{isLoading ? "Processando…" : action.editor === "rsa_draft" ? "Gerar versão sugerida" : action.readiness === "wait" ? "Ver por que esperar" : action.operationType ? "Revisar alteração" : "Abrir configuração preenchida"}</button>
        </article>;
      })}
    </div> : <div style={{ marginTop: 13, border: "1px solid #E2E8F0", background: "#F8FAFC", borderRadius: 10, padding: 12, color: "#64748B", fontSize: 11 }}>Nenhuma ação desse grupo foi indicada pelos dados do período.</div>}

    <section style={{ marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div style={{ display: "flex", alignItems: "center", gap: 7 }}><Lightbulb size={15} color="#4285F4" /><div><h3 style={{ fontSize: 12, color: "#334155" }}>Google Ads recomenda</h3><p style={{ fontSize: 9.5, color: "#94A3B8" }}>Origem externa, separada dos diagnósticos S4X.</p></div></div>{recommendationLoading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "#64748B" }}><LoaderCircle size={12} className="animate-spin" /> Consultando API…</span> : <button type="button" onClick={() => void loadRecommendations()} style={{ ...buttonStyle("neutral"), minHeight: 28 }}>Atualizar</button>}</div>
      {!recommendationLoading && recommendations.length ? <div style={{ marginTop: 9, display: "grid", gap: 7 }}>{recommendations.slice(0, 6).map((item) => <div key={item.resourceName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", padding: 9 }}><div style={{ minWidth: 0 }}><strong style={{ fontSize: 10.5, color: "#334155" }}>{recommendationLabel(item.type)}</strong><p style={{ marginTop: 2, fontSize: 9, color: "#94A3B8", overflowWrap: "anywhere" }}>{item.campaign?.name || item.resourceName}</p></div><div style={{ display: "flex", gap: 6 }}><button type="button" disabled={isLoading} onClick={() => void prepare("apply_google_recommendation", { recommendationResourceName: item.resourceName, recommendationType: item.type }, null, "GOOGLE_RECOMMENDATION")} style={buttonStyle("primary")}>Revisar</button><button type="button" disabled={isLoading} onClick={() => void prepare("dismiss_google_recommendation", { recommendationResourceName: item.resourceName, recommendationType: item.type }, null, "GOOGLE_RECOMMENDATION")} style={buttonStyle("neutral")}>Dispensar</button></div></div>)}</div> : !recommendationLoading ? <p style={{ marginTop: 8, fontSize: 10.5, color: "#94A3B8" }}>Nenhuma recomendação oficial disponível no momento.</p> : null}
    </section>

    {assistantOpen ? <section style={{ marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><div><h3 style={{ fontSize: 12.5, color: "#334155" }}>Configuração assistida</h3><p style={{ marginTop: 2, fontSize: 9.5, color: "#94A3B8" }}>Escolha nomes reais; a S4X resolve os IDs e ainda valida tudo no Google antes da confirmação.</p></div><button type="button" onClick={() => setAssistantOpen(false)} aria-label="Fechar configuração assistida" style={{ border: 0, background: "transparent", color: "#64748B", cursor: "pointer" }}><X size={16} /></button></div>
      <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>{(["keywords", "ads", "segmentation", "budget_bidding", "assets", "conversions"] as AssistantSection[]).map((section) => <button key={section} type="button" onClick={() => setAssistantSection(section)} style={{ ...buttonStyle(assistantSection === section ? "primary" : "neutral"), minHeight: 28, padding: "4px 7px" }}>{section === "keywords" ? "Palavras-chave" : section === "ads" ? "Anúncios" : section === "segmentation" ? "Segmentação" : section === "budget_bidding" ? "Lances" : section === "assets" ? "Recursos" : "Conversões"}</button>)}</div>

      <div style={{ marginTop: 11, display: "grid", gap: 10 }}>
        {assistantSection === "keywords" ? <><Grid><Field label="Campanha">{campaignSelect}</Field><Field label="Grupo de anúncios"><select value={values.adGroupId} onChange={(event) => setValue("adGroupId", event.target.value)} style={fieldStyle()}>{availableGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Nova palavra-chave"><input value={values.keywordText} onChange={(event) => setValue("keywordText", event.target.value)} style={fieldStyle()} /></Field><Field label="Correspondência"><select value={values.matchType} onChange={(event) => setValue("matchType", event.target.value)} style={fieldStyle()}><option value="EXACT">Exata</option><option value="PHRASE">De frase</option><option value="BROAD">Ampla</option></select></Field></Grid><button type="button" disabled={isLoading} onClick={() => void prepare("add_ad_group_keyword", { campaignId: values.campaignId, adGroupId: values.adGroupId, text: values.keywordText, matchType: values.matchType })} style={{ ...buttonStyle(), justifySelf: "start" }}>Preparar palavra-chave</button></> : null}

        {assistantSection === "ads" ? <><Grid><Field label="Anúncio responsivo"><select value={values.adId} onChange={(event) => selectAd(event.target.value)} style={fieldStyle()}>{context.ads.filter((item) => item.type === "RESPONSIVE_SEARCH_AD").map((item) => <option key={`${item.adGroupId}:${item.id}`} value={item.id}>{item.campaignName} · {item.name}</option>)}</select></Field><Field label="Grupo"><input value={selectedAd?.adGroupName || ""} readOnly style={{ ...fieldStyle(), background: "#F8FAFC" }} /></Field></Grid><Grid><Field label="Títulos (um por linha)"><textarea value={values.headlines} onChange={(event) => setValue("headlines", event.target.value)} style={{ ...fieldStyle(), height: 110, padding: 9, resize: "vertical" }} /></Field><Field label="Descrições (uma por linha)"><textarea value={values.descriptions} onChange={(event) => setValue("descriptions", event.target.value)} style={{ ...fieldStyle(), height: 110, padding: 9, resize: "vertical" }} /></Field></Grid><Grid><Field label="URLs finais"><textarea value={values.finalUrls} onChange={(event) => setValue("finalUrls", event.target.value)} style={{ ...fieldStyle(), height: 68, padding: 9 }} /></Field><Field label="URLs mobile"><textarea value={values.finalMobileUrls} onChange={(event) => setValue("finalMobileUrls", event.target.value)} style={{ ...fieldStyle(), height: 68, padding: 9 }} /></Field></Grid><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" disabled={isLoading || !selectedAd} onClick={() => selectedAd && void draftRsa(selectedAd)} style={buttonStyle("neutral")}><Sparkles size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />Gerar rascunho com IA</button><button type="button" disabled={isLoading || !selectedAd} onClick={() => void prepare("edit_responsive_search_ad", { adGroupId: values.adGroupId, adId: values.adId, headlines: asLines(values.headlines), descriptions: asLines(values.descriptions), finalUrls: asLines(values.finalUrls), finalMobileUrls: asLines(values.finalMobileUrls) })} style={buttonStyle()}>Preparar alteração do anúncio</button></div></> : null}

        {assistantSection === "segmentation" ? <><Grid><Field label="Campanha">{campaignSelect}</Field><Field label="Dia"><select value={values.dayOfWeek} onChange={(event) => setValue("dayOfWeek", event.target.value)} style={fieldStyle()}>{["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => <option key={day}>{day}</option>)}</select></Field><Field label="Início"><input type="time" value={values.start} onChange={(event) => setValue("start", event.target.value)} style={fieldStyle()} /></Field><Field label="Fim"><input type="time" value={values.end} onChange={(event) => setValue("end", event.target.value)} style={fieldStyle()} /></Field></Grid><div><p style={{ fontSize: 9.5, color: "#92400E", marginBottom: 6 }}><Clock3 size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />Fuso da conta: {context.account.timezone}. A API bloqueará sobreposição e intervalo inválido.</p><button type="button" disabled={isLoading} onClick={() => void prepare("add_ad_schedule", { campaignId: values.campaignId, dayOfWeek: values.dayOfWeek, start: values.start, end: values.end })} style={buttonStyle()}>Preparar nova faixa</button></div><Grid><Field label="Buscar localização"><input value={values.geoSearch} onChange={(event) => setValue("geoSearch", event.target.value)} style={fieldStyle()} /></Field><Field label="País"><input value={values.countryCode} onChange={(event) => setValue("countryCode", event.target.value.toUpperCase())} maxLength={2} style={fieldStyle()} /></Field></Grid><button type="button" disabled={isLoading} onClick={() => void searchGeo()} style={{ ...buttonStyle("neutral"), justifySelf: "start" }}><MapPin size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />Buscar local oficial</button>{geoResults.length ? <div style={{ display: "grid", gap: 5 }}>{geoResults.slice(0, 6).map((geo) => <button type="button" key={geo.resourceName} onClick={() => { setValue("geoTargetResourceName", geo.resourceName); setValue("geoName", geo.name); }} style={{ ...buttonStyle(values.geoTargetResourceName === geo.resourceName ? "primary" : "neutral"), textAlign: "left" }}>{geo.name} · {geo.canonicalName} · {geo.countryCode}</button>)}</div> : null}{values.geoTargetResourceName ? <button type="button" disabled={isLoading} onClick={() => void prepare("add_campaign_location", { campaignId: values.campaignId, geoTargetConstantResourceName: values.geoTargetResourceName, name: values.geoName, countryCode: values.countryCode })} style={{ ...buttonStyle(), justifySelf: "start" }}>Preparar localização selecionada</button> : null}</> : null}

        {assistantSection === "budget_bidding" ? <><Grid><Field label="Campanha">{campaignSelect}</Field><Field label="Estratégia atual"><input value={selectedCampaign?.biddingStrategyType || "Não sincronizada"} readOnly style={{ ...fieldStyle(), background: "#F8FAFC" }} /></Field><Field label="Conversões no período"><input value={String(selectedCampaign?.conversions || 0)} readOnly style={{ ...fieldStyle(), background: "#F8FAFC" }} /></Field><Field label="CPA desejado (micros)"><input inputMode="numeric" value={values.targetCpa} onChange={(event) => setValue("targetCpa", event.target.value)} style={fieldStyle()} /></Field><Field label="ROAS desejado"><input inputMode="decimal" value={values.targetRoas} onChange={(event) => setValue("targetRoas", event.target.value)} style={fieldStyle()} /></Field><Field label="Nova estratégia"><select value={values.strategy} onChange={(event) => setValue("strategy", event.target.value)} style={fieldStyle()}>{["MAXIMIZE_CLICKS", "MAXIMIZE_CONVERSIONS", "MAXIMIZE_CONVERSION_VALUE", "TARGET_CPA", "TARGET_ROAS", "MANUAL_CPC"].map((item) => <option key={item}>{item}</option>)}</select></Field></Grid><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" disabled={isLoading} onClick={() => void prepare("set_target_cpa", { campaignId: values.campaignId, targetCpaMicros: Number(values.targetCpa) })} style={buttonStyle()}>Revisar CPA desejado</button><button type="button" disabled={isLoading} onClick={() => void prepare("set_target_roas", { campaignId: values.campaignId, targetRoas: Number(values.targetRoas) })} style={buttonStyle()}>Revisar ROAS desejado</button><button type="button" disabled={isLoading} onClick={() => void prepare("set_campaign_bidding_strategy", { campaignId: values.campaignId, strategy: values.strategy, targetCpaMicros: Number(values.targetCpa), targetRoas: Number(values.targetRoas) })} style={buttonStyle("danger")}>Revisar estratégia de lances</button></div></> : null}

        {assistantSection === "assets" ? <><Grid><Field label="Campanha">{campaignSelect}</Field><Field label="Tipo de recurso"><select value={values.assetType} onChange={(event) => setValue("assetType", event.target.value)} style={fieldStyle()}><option value="SITELINK">Sitelink</option><option value="CALLOUT">Frase de destaque</option><option value="CALL">Chamada</option></select></Field><Field label={values.assetType === "CALL" ? "Telefone" : "Texto"}><input value={values.assetType === "CALL" ? values.phoneNumber : values.assetText} onChange={(event) => values.assetType === "CALL" ? setValue("phoneNumber", event.target.value) : setValue("assetText", event.target.value)} style={fieldStyle()} /></Field>{values.assetType === "SITELINK" ? <Field label="URL final"><input value={values.assetUrl} onChange={(event) => setValue("assetUrl", event.target.value)} style={fieldStyle()} /></Field> : null}</Grid><button type="button" disabled={isLoading} onClick={() => void prepare("create_campaign_asset", { campaignResourceName: selectedCampaign?.resourceName, assetType: values.assetType, text: values.assetText, finalUrl: values.assetUrl, phoneNumber: values.phoneNumber, countryCode: values.countryCode })} style={{ ...buttonStyle(), justifySelf: "start" }}>Preparar criação e vínculo</button>{context.assets.length ? <><Grid><Field label="Recurso existente"><select value={values.existingAssetResourceName} onChange={(event) => setValue("existingAssetResourceName", event.target.value)} style={fieldStyle()}>{context.assets.map((item) => <option key={`${item.campaignId}:${item.resourceName}:${item.fieldType}`} value={item.resourceName}>{item.name} · {item.fieldType}</option>)}</select></Field></Grid><button type="button" disabled={isLoading} onClick={() => void prepare("link_campaign_asset", { campaignResourceName: selectedCampaign?.resourceName, assetResourceName: values.existingAssetResourceName, assetType: values.assetType })} style={{ ...buttonStyle("neutral"), justifySelf: "start" }}>Preparar vínculo do recurso existente</button></> : null}</> : null}

        {assistantSection === "conversions" ? <>{context.conversionActions.length ? <><Grid><Field label="Ação de conversão"><select value={values.conversionResourceName} onChange={(event) => setValue("conversionResourceName", event.target.value)} style={fieldStyle()}>{context.conversionActions.map((item) => <option key={item.resourceName} value={item.resourceName}>{item.name} · {item.primaryForGoal ? "primária" : "secundária"}</option>)}</select></Field><Field label="Definir como"><select value={values.conversionValue} onChange={(event) => setValue("conversionValue", event.target.value)} style={fieldStyle()}><option value="true">Primária</option><option value="false">Secundária</option></select></Field></Grid><div style={{ border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 8, padding: 9, fontSize: 10, color: "#991B1B" }}><AlertTriangle size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />Operação crítica: pode alterar Smart Bidding e exige owner, trava específica e confirmação textual.</div><button type="button" disabled={isLoading} onClick={() => void prepare("set_conversion_action_primary", { resourceName: values.conversionResourceName, value: values.conversionValue === "true" })} style={{ ...buttonStyle("danger"), justifySelf: "start" }}>Revisar alteração crítica</button></> : <p style={{ fontSize: 10.5, color: "#64748B" }}>Nenhuma ação de conversão foi encontrada no último snapshot de configuração.</p>}</> : null}
      </div>
    </section> : null}

    <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><button type="button" disabled={loading || !controls} onClick={() => void toggleSource()} style={buttonStyle("neutral")}>{controls?.sourceEnabled ? "Desativar escrita desta fonte" : "Habilitar escrita desta fonte (owner)"}</button><span style={{ fontSize: 9, color: "#94A3B8" }}>Preview continua disponível mesmo com escrita desativada; as travas globais permanecem no servidor.</span></div>

    {preview ? <div role="dialog" aria-modal="true" aria-labelledby="google-ads-preview-title" style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(15,23,42,.52)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "min(720px,100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: 14, background: "#FFF", padding: 18, boxShadow: "0 24px 70px rgba(15,23,42,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><div style={{ display: "flex", alignItems: "center", gap: 7 }}><ShieldCheck size={16} color="#2563EB" /><h3 id="google-ads-preview-title" style={{ fontSize: 14, color: "#0F172A" }}>Revisão antes da escrita</h3></div><p style={{ marginTop: 5, fontSize: 11, color: "#334155", lineHeight: 1.45 }}>{preview.description}</p></div><button type="button" aria-label="Fechar" onClick={() => { setPreview(null); setActiveAction(null); }} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748B" }}><X size={17} /></button></div>
        {activeAction ? <div style={{ marginTop: 10, border: "1px solid #DBEAFE", background: "#EFF6FF", borderRadius: 8, padding: 9 }}><p style={{ fontSize: 9, fontWeight: 850, color: "#1D4ED8" }}>MOTIVO DA ANÁLISE S4X</p><p style={{ marginTop: 3, fontSize: 10.5, color: "#334155" }}>{activeAction.reason}</p><p style={{ marginTop: 3, fontSize: 9.5, color: "#64748B" }}>{activeAction.evidence}</p></div> : null}
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}><span style={{ borderRadius: 999, padding: "4px 7px", fontSize: 9, fontWeight: 850, color: preview.riskLevel === "critical" || preview.riskLevel === "high" ? "#991B1B" : "#92400E", background: preview.riskLevel === "critical" || preview.riskLevel === "high" ? "#FEF2F2" : "#FFFBEB", border: `1px solid ${preview.riskLevel === "critical" || preview.riskLevel === "high" ? "#FECACA" : "#FDE68A"}` }}>{RISK_LABEL[preview.riskLevel]}</span><span style={{ borderRadius: 999, padding: "4px 7px", fontSize: 9, fontWeight: 800, color: preview.validatedByGoogle ? "#047857" : "#92400E", background: preview.validatedByGoogle ? "#ECFDF5" : "#FFFBEB", border: `1px solid ${preview.validatedByGoogle ? "#A7F3D0" : "#FDE68A"}` }}>{preview.validatedByGoogle ? "VALIDADO PELA API" : "NÃO VALIDADO"}</span><span style={{ fontSize: 9, color: "#64748B", alignSelf: "center" }}>{preview.reversible ? "Reversível com nova verificação" : "Sem reversão automática segura"}</span></div>
        <div className="admin-two-col" style={{ marginTop: 11, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><p style={{ marginBottom: 4, fontSize: 9, fontWeight: 850, color: "#64748B" }}>ANTES</p><pre style={{ minHeight: 110, whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 9, borderRadius: 8, fontSize: 9.5 }}>{JSON.stringify(preview.before, null, 2)}</pre></div><div><p style={{ marginBottom: 4, fontSize: 9, fontWeight: 850, color: "#64748B" }}>DEPOIS</p><pre style={{ minHeight: 110, whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 9, borderRadius: 8, fontSize: 9.5 }}>{JSON.stringify(preview.after, null, 2)}</pre></div></div>
        {preview.warnings.map((warning) => <p key={warning} style={{ marginTop: 7, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", padding: 7, borderRadius: 7, fontSize: 10 }}>{warning}</p>)}
        {preview.blockedReason ? <p style={{ marginTop: 8, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", padding: 8, borderRadius: 7, fontSize: 10.5 }}>{preview.blockedReason}</p> : null}
        {preview.executable ? <Field label={`Digite exatamente: ${preview.requiredConfirmation || "APLICAR"}`}><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" style={{ ...fieldStyle(), marginTop: 4 }} /></Field> : null}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" onClick={() => { setPreview(null); setActiveAction(null); setConfirmation(""); }} style={buttonStyle("neutral")}>Cancelar</button>{preview.executable ? <button type="button" disabled={loading || confirmation !== (preview.requiredConfirmation || "APLICAR")} onClick={() => void execute()} style={{ ...buttonStyle(preview.riskLevel === "critical" || preview.riskLevel === "high" ? "danger" : "primary"), opacity: loading || confirmation !== (preview.requiredConfirmation || "APLICAR") ? 0.5 : 1 }}>{loading ? "Aplicando…" : "Confirmar e aplicar"}</button> : null}</div>
      </div>
    </div> : null}
  </section>;
}
