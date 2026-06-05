import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";
import { DashboardService } from "@/services/dashboard-service";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { PROMPT_ANALISE_IA_TEMPLATE } from "@/lib/ai/prompt-analise-ia";
import {
  buildPdfPeriodPart,
  buildSharePdfFilename,
  buildSharePdfStoragePath,
  createSharePdfSignedUrl,
  getCachedSharePdf,
  normalizePdfPeriodPart,
  renderAndStoreSharePdf,
  sanitizePdfFilePart,
} from "@/lib/share-pdf";

type DispatchBody = {
  dashboardId?: string;
  from?: string;
  to?: string;
  channels?: string[];
  recipients?: {
    emails?: string[];
    phones?: string[];
  };
  shareLinkId?: string;
  dryRun?: boolean;
  source?: "manual" | "scheduled";
  reportMode?: "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf";
  webhookEnvironment?: "production" | "test";
};

type ResolvedRecipients = {
  emails: string[];
  phones: string[];
};

const WEBHOOK_ENV_KEYS = {
  production: "N8N_REPORT_DISPATCH_WEBHOOK_URL",
  test: "N8N_REPORT_DISPATCH_WEBHOOK_TEST_URL",
} as const;
type WebhookEnvironment = keyof typeof WEBHOOK_ENV_KEYS;
const TOKEN_ENV_KEY = "N8N_REPORT_DISPATCH_WEBHOOK_TOKEN";
const OPENAI_ENV_KEY = "OPENAI_API_KEY";
const GEMINI_ENV_KEY = "GEMINI_API_KEY";
const WEBHOOK_HMAC_ENV_KEY = "N8N_REPORT_DISPATCH_HMAC_SECRET";
const MAX_SERIES_POINTS = 90;
const MAX_TOP_ITEMS = 7;
const MAX_INSIGHTS = 10;

function isPlaceholderWebhook(value: string) {
  return (
    !value ||
    value.includes("SEU_N8N_WEBHOOK_URL_AQUI") ||
    value === "https://SEU_N8N_WEBHOOK_URL_AQUI"
  );
}

function isPlaceholderCredential(value: string) {
  if (!value) return true;
  const normalized = value.trim().toUpperCase();
  return (
    normalized.includes("SEU_TOKEN") ||
    normalized.includes("SEU_SECRET") ||
    normalized.includes("SEU_") ||
    normalized.includes("PLACEHOLDER")
  );
}

function isValidWebhookUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "url inválida";
  }
}

function appendDashboardRangeToUrl(url: string | null, from?: string | null, to?: string | null) {
  if (!url) return url;
  if (!from && !to) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("period", "custom");
    if (from) parsed.searchParams.set("from", from);
    if (to) parsed.searchParams.set("to", to);
    return parsed.toString();
  } catch {
    const params = new URLSearchParams();
    params.set("period", "custom");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return url.includes("?") ? `${url}&${params.toString()}` : `${url}?${params.toString()}`;
  }
}

function isTestWebhookUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/webhook-test/");
  } catch {
    return false;
  }
}

function getErrorDetails(error: unknown) {
  const err = error as any;
  return {
    message: String(err?.message || "Erro de rede"),
    name: err?.name || null,
    cause: err?.cause
      ? {
          code: err.cause?.code || null,
          message: err.cause?.message || String(err.cause),
          name: err.cause?.name || null,
        }
      : null,
  };
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n;|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function mergeUnique(base: string[], extra: string[], normalizer: (v: string) => string) {
  const map = new Map<string, string>();
  [...base, ...extra].forEach((item) => {
    const trimmed = String(item || "").trim();
    if (!trimmed) return;
    const key = normalizer(trimmed);
    if (!key) return;
    if (!map.has(key)) map.set(key, trimmed);
  });
  return Array.from(map.values());
}

function resolveRecipients(params: { client: any; manual?: DispatchBody["recipients"] }): ResolvedRecipients {
  const client = params.client || {};
  const manual = params.manual || {};

  const clientEmails = [
    ...parseListValue(client.email),
    ...parseListValue(client.emails),
    ...parseListValue(client.contact_email),
    ...parseListValue(client.contact_emails),
    ...parseListValue(client.billing_email),
  ];

  const clientPhones = [
    ...parseListValue(client.phone),
    ...parseListValue(client.phones),
    ...parseListValue(client.whatsapp),
    ...parseListValue(client.whatsapp_phone),
    ...parseListValue(client.contact_phone),
    ...parseListValue(client.contact_whatsapp),
  ];

  const manualEmails = parseListValue(manual.emails);
  const manualPhones = parseListValue(manual.phones);

  return {
    emails: mergeUnique(clientEmails, manualEmails, normalizeEmail),
    phones: mergeUnique(clientPhones, manualPhones, normalizePhone),
  };
}

function normalizeChannels(value: unknown): string[] {
  const allowed = new Set(["email", "whatsapp"]);
  if (!Array.isArray(value)) return [];
  const channels = value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => allowed.has(item));
  return Array.from(new Set(channels));
}

async function getProjectEnvVarFromVercel(key: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) return null;

  try {
    const response = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env?decrypt=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const json = await response.json();
    const envs = Array.isArray(json?.envs) ? json.envs : [];
    const hit = envs.find((item: any) => item?.key === key);
    const value = String(hit?.value || "").trim();
    return value || null;
  } catch {
    return null;
  }
}

async function resolveWebhookUrl(environment: WebhookEnvironment = "production") {
  const envKey = WEBHOOK_ENV_KEYS[environment];
  const fromVercel = String((await getProjectEnvVarFromVercel(envKey)) || "").trim();
  if (!isPlaceholderWebhook(fromVercel) && isValidWebhookUrl(fromVercel)) {
    return { url: fromVercel, source: "vercel_api" as const };
  }

  const fromRuntime = String(
    environment === "test"
      ? process.env.N8N_REPORT_DISPATCH_WEBHOOK_TEST_URL || ""
      : process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || ""
  ).trim();
  if (!isPlaceholderWebhook(fromRuntime) && isValidWebhookUrl(fromRuntime)) {
    return { url: fromRuntime, source: "runtime_env" as const };
  }

  return { url: "", source: "none" as const };
}

async function resolveWebhookToken() {
  const fromVercel = String((await getProjectEnvVarFromVercel(TOKEN_ENV_KEY)) || "").trim();
  if (!isPlaceholderCredential(fromVercel)) {
    return fromVercel;
  }

  const fromRuntime = String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_TOKEN || "").trim();
  if (!isPlaceholderCredential(fromRuntime)) {
    return fromRuntime;
  }

  return "";
}

async function resolveOpenAiApiKey() {
  const fromVercel = String((await getProjectEnvVarFromVercel(OPENAI_ENV_KEY)) || "").trim();
  if (fromVercel && !isPlaceholderCredential(fromVercel)) return fromVercel;

  const fromRuntime = String(process.env.OPENAI_API_KEY || "").trim();
  if (fromRuntime && !isPlaceholderCredential(fromRuntime)) return fromRuntime;

  return "";
}

type AiInterpretationResult = {
  enabled: boolean;
  provider: "openai" | "gemini" | null;
  model: string | null;
  generated: boolean;
  text: string | null;
  error?: string;
  fallbackUsed?: boolean;
};

function formatPercent(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Não disponível";
  return `${num.toFixed(2).replace(".", ",")}%`;
}

function formatNumber(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Não disponível";
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatCurrency(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Não disponível";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildDashboardTextForPrompt(report: any) {
  const atual = report?.comparativo?.atual || {};
  const anterior = report?.comparativo?.anterior || {};
  const variacao = report?.comparativo?.variacaoPercentual || {};
  const camp = report?.totaisNumericos?.campaigns || {};

  const lines = [
    `Impressões | Semana atual: ${formatNumber(atual.impressoes)} | Semana anterior: ${formatNumber(anterior.impressoes)} | Variação: ${formatPercent(variacao.impressoes)}`,
    `Cliques | Semana atual: ${formatNumber(atual.cliques)} | Semana anterior: ${formatNumber(anterior.cliques)} | Variação: ${formatPercent(variacao.cliques)}`,
    `CTR | Semana atual: ${formatPercent(atual.ctr)} | Semana anterior: ${formatPercent(anterior.ctr)} | Variação: ${formatPercent(variacao.ctr)}`,
    `Conversões | Semana atual: ${formatNumber(atual.conversoes)} | Semana anterior: ${formatNumber(anterior.conversoes)} | Variação: ${formatPercent(variacao.conversoes)}`,
    `Taxa de Conversões | Semana atual: ${formatPercent(atual.taxaConversao)} | Semana anterior: ${formatPercent(anterior.taxaConversao)} | Variação: ${formatPercent(variacao.taxaConversao)}`,
    `Custo por Conversão | Semana atual: ${formatCurrency(atual.cpa)} | Semana anterior: ${formatCurrency(anterior.cpa)} | Variação: ${formatPercent(variacao.cpa)}`,
    `Custo por Clique | Semana atual: ${formatCurrency(atual.cpc)} | Semana anterior: ${formatCurrency(anterior.cpc)} | Variação: ${formatPercent(variacao.cpc)}`,
    `Impressões na Parte Superior | Semana atual: ${formatPercent(Number(camp.searchImpressionShare) * 100)} | Semana anterior: Não disponível | Variação: Não disponível`,
    `Impressões na 1ª Posição | Semana atual: ${formatPercent(Number(camp.searchRankLostImpressionShare) * 100)} | Semana anterior: Não disponível | Variação: Não disponível`,
    `Valor Total Investido | Semana atual: ${formatCurrency(atual.investimento)} | Semana anterior: ${formatCurrency(anterior.investimento)} | Variação: ${formatPercent(variacao.investimento)}`,
  ];

  return lines.join("\n");
}

async function generateAiInterpretation(params: {
  report: any;
  dashboardName: string;
  clientName: string | null;
  periodFrom: string | null;
  periodTo: string | null;
}): Promise<AiInterpretationResult> {
  const openAiApiKey = await resolveOpenAiApiKey();
  const geminiApiKey = await resolveGeminiApiKey();
  const openAiModel = process.env.OPENAI_REPORT_MODEL || "gpt-4.1-mini";
  const geminiModel = process.env.GEMINI_REPORT_MODEL || "gemini-2.0-flash-lite";
  const inputContext = {
    dashboard: params.dashboardName,
    client: params.clientName,
    period: { from: params.periodFrom, to: params.periodTo },
    summary: params.report?.summary || {},
    comparativo: params.report?.comparativo || {},
    funil: params.report?.funil || {},
    topItems: params.report?.topItems || {},
    insights: Array.isArray(params.report?.insights) ? params.report.insights.slice(0, 5) : [],
  };
  const dashboardText = buildDashboardTextForPrompt({
    ...params.report,
    totaisNumericos: params.report?.totaisNumericos || {},
  });
  const prompt = PROMPT_ANALISE_IA_TEMPLATE.replace(/\{\{[\s\S]*\}\}/m, dashboardText);

  if (!openAiApiKey && !geminiApiKey) {
    return {
      enabled: false,
      provider: null,
      model: null,
      generated: false,
      text: null,
      error: "OPENAI_API_KEY e GEMINI_API_KEY não configuradas.",
      fallbackUsed: false,
    };
  }

  let openAiError: string | null = null;
  if (openAiApiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          input: prompt,
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        openAiError = `Falha OpenAI (${response.status}): ${raw.slice(0, 300)}`;
      } else {
        const json = await response.json();
        const text = String(json?.output_text || "").trim();
        if (text) {
          return {
            enabled: true,
            provider: "openai",
            model: openAiModel,
            generated: true,
            text,
            fallbackUsed: false,
          };
        }
        openAiError = "Resposta da OpenAI sem texto.";
      }
    } catch (error: any) {
      openAiError = error?.message || "Erro inesperado na chamada OpenAI.";
    }
  }

  if (!geminiApiKey) {
    return {
      enabled: true,
      provider: "openai",
      model: openAiModel,
      generated: false,
      text: null,
      error: openAiError || "OpenAI indisponível e GEMINI_API_KEY não configurada.",
      fallbackUsed: false,
    };
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      return {
        enabled: true,
        provider: "gemini",
        model: geminiModel,
        generated: false,
        text: null,
        error: `Falha Gemini (${response.status}): ${raw.slice(0, 300)}${openAiError ? ` | OpenAI: ${openAiError}` : ""}`,
        fallbackUsed: true,
      };
    }

    const json = await response.json();
    const text = String(
      json?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    ).trim();
    if (!text) {
      return {
        enabled: true,
        provider: "gemini",
        model: geminiModel,
        generated: false,
        text: null,
        error: `Resposta do Gemini sem texto.${openAiError ? ` OpenAI: ${openAiError}` : ""}`,
        fallbackUsed: true,
      };
    }

    return {
      enabled: true,
      provider: "gemini",
      model: geminiModel,
      generated: true,
      text,
      fallbackUsed: true,
    };
  } catch (error: any) {
    return {
      enabled: true,
      provider: "gemini",
      model: geminiModel,
      generated: false,
      text: null,
      error: `${error?.message || "Erro inesperado no Gemini."}${openAiError ? ` | OpenAI: ${openAiError}` : ""}`,
      fallbackUsed: true,
    };
  }
}

async function resolveGeminiApiKey() {
  const fromVercel = String((await getProjectEnvVarFromVercel(GEMINI_ENV_KEY)) || "").trim();
  if (fromVercel && !isPlaceholderCredential(fromVercel)) return fromVercel;

  const fromRuntime = String(process.env.GEMINI_API_KEY || "").trim();
  if (fromRuntime && !isPlaceholderCredential(fromRuntime)) return fromRuntime;

  return "";
}

async function resolveWebhookHmacSecret() {
  const fromVercel = String((await getProjectEnvVarFromVercel(WEBHOOK_HMAC_ENV_KEY)) || "").trim();
  if (fromVercel && !isPlaceholderCredential(fromVercel)) return fromVercel;

  const fromRuntime = String(process.env.N8N_REPORT_DISPATCH_HMAC_SECRET || "").trim();
  if (fromRuntime && !isPlaceholderCredential(fromRuntime)) return fromRuntime;

  return "";
}

function normalizeReportMode(value: unknown): "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf" {
  const str = String(value || "").trim().toLowerCase();
  if (str === "analysis_only" || str === "metrics_only" || str === "both" || str === "pdf_only" || str === "analysis_pdf" || str === "both_pdf") return str;
  return "both";
}

function formatPdfDisplayDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = normalizePdfPeriodPart(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function pickMetric(source: any, aliases: string[]) {
  for (const alias of aliases) {
    const value = source?.[alias];
    if (value !== undefined && value !== null && value !== "") {
      return toFiniteNumber(value);
    }
  }
  return 0;
}

function normalizeSummaryBlock(data: any) {
  const raw = data?.summary || {};
  const current = raw?.current || raw || {};
  const previous = raw?.previous || {};
  const change = raw?.change || {};
  return { current, previous, change };
}

function aggregateNumericFields(rows: any[]) {
  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const metricsWithValue = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const [key, raw] of Object.entries(row)) {
      if (raw === null || raw === undefined || raw === "") continue;
      const numeric = toFiniteNumber(raw);
      if (Number.isFinite(numeric) && (typeof raw === "number" || /^-?\d+([.,]\d+)?$/.test(String(raw).trim()))) {
        totals[key] = (totals[key] || 0) + numeric;
        counts[key] = (counts[key] || 0) + 1;
        metricsWithValue.add(key);
      }
    }
  }

  const averages: Record<string, number> = {};
  for (const [key, total] of Object.entries(totals)) {
    const count = counts[key] || 1;
    averages[key] = total / count;
  }

  return {
    totals,
    averages,
    nonNullMetricFields: Array.from(metricsWithValue).sort(),
  };
}

function getRowLabel(row: any) {
  return (
    row?.campaignName ||
    row?.campaign_name ||
    row?.adSetName ||
    row?.adset_name ||
    row?.adGroupName ||
    row?.ad_group ||
    row?.adName ||
    row?.ad_name ||
    row?.keyword ||
    row?.searchTerm ||
    row?.term ||
    "Sem nome"
  );
}

function toTopItems(rows: any[], options: { metricKey: string; limit?: number; extraFields?: string[] }) {
  const limit = options.limit ?? MAX_TOP_ITEMS;
  const metricKey = options.metricKey;
  const extraFields = options.extraFields || [];
  const grouped = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const value = toFiniteNumber(row?.[metricKey]);
    if (value <= 0) continue;

    const base: Record<string, unknown> = {
      nome: getRowLabel(row),
      valor: value,
    };
    for (const field of extraFields) {
      base[field] = row?.[field] ?? null;
    }

    const identity = [base.nome, ...extraFields.map((f) => String(base[f] ?? ""))].join("|");
    const prev = grouped.get(identity);
    if (!prev) {
      grouped.set(identity, base);
      continue;
    }
    prev.valor = toFiniteNumber(prev.valor) + value;
  }

  return Array.from(grouped.values())
    .sort((a, b) => toFiniteNumber(b.valor) - toFiniteNumber(a.valor))
    .slice(0, limit);
}

function getReportMetrics(data: any) {
  const { current, previous, change } = normalizeSummaryBlock(data);
  const dailyRows = Array.isArray(data?.dailyPerformance)
    ? data.dailyPerformance
    : Array.isArray(data?.overview)
      ? data.overview
      : [];

  const campaignRows = Array.isArray(data?.campaigns) ? data.campaigns : [];
  const adGroupRows = Array.isArray(data?.adGroups) ? data.adGroups : [];
  const keywordRows = Array.isArray(data?.keywords) ? data.keywords : [];
  const searchTermRows = Array.isArray(data?.searchTerms) ? data.searchTerms : [];
  const adAssetRows = Array.isArray(data?.adsAndAssets) ? data.adsAndAssets : [];

  const dailyAgg = aggregateNumericFields(dailyRows);
  const campaignAgg = aggregateNumericFields(campaignRows);
  const adGroupAgg = aggregateNumericFields(adGroupRows);
  const keywordAgg = aggregateNumericFields(keywordRows);
  const searchTermAgg = aggregateNumericFields(searchTermRows);
  const adAssetAgg = aggregateNumericFields(adAssetRows);

  const kpisCurrent = {
    investimento: pickMetric(current, ["total_spend", "cost"]),
    receita: pickMetric(current, ["total_revenue", "conversionValue", "allConversionsValue"]),
    impressoes: pickMetric(current, ["total_impressions", "impressions"]),
    alcance: pickMetric(current, ["total_reach", "reach"]),
    cliques: pickMetric(current, ["total_clicks", "clicks"]),
    ctr: pickMetric(current, ["ctr"]),
    cpc: pickMetric(current, ["cpc", "avgCpc", "cpc_avg"]),
    cpm: pickMetric(current, ["avgCpm", "cpm"]),
    frequencia: pickMetric(current, ["frequency"]),
    conversoes: pickMetric(current, ["total_conversions", "conversions"]),
    cpa: pickMetric(current, ["cpa", "costPerConversion"]),
    taxaConversao: pickMetric(current, ["conversionRate"]),
    roas: pickMetric(current, ["roas"]),
    engajamentos: pickMetric(current, ["postEngagement", "total_engagement"]),
  };

  const leadsTotal =
    dailyAgg.totals.leads ||
    (dailyAgg.totals.onFacebookLeads || 0) +
      (dailyAgg.totals.websiteLeads || 0) +
      (dailyAgg.totals.offlineLeads || 0);

  const messagingTotal =
    dailyAgg.totals.messagingConversationsStarted ||
    dailyAgg.totals.conversions ||
    dailyAgg.totals.results ||
    0;

  const kpisPrevious = {
    investimento: pickMetric(previous, ["total_spend", "cost"]),
    receita: pickMetric(previous, ["total_revenue", "conversionValue", "allConversionsValue"]),
    impressoes: pickMetric(previous, ["total_impressions", "impressions"]),
    alcance: pickMetric(previous, ["total_reach", "reach"]),
    cliques: pickMetric(previous, ["total_clicks", "clicks"]),
    ctr: pickMetric(previous, ["ctr"]),
    cpc: pickMetric(previous, ["cpc", "avgCpc", "cpc_avg"]),
    cpm: pickMetric(previous, ["avgCpm", "cpm"]),
    frequencia: pickMetric(previous, ["frequency"]),
    conversoes: pickMetric(previous, ["total_conversions", "conversions"]),
    cpa: pickMetric(previous, ["cpa", "costPerConversion"]),
    taxaConversao: pickMetric(previous, ["conversionRate"]),
    roas: pickMetric(previous, ["roas"]),
    engajamentos: pickMetric(previous, ["postEngagement", "total_engagement"]),
  };

  const changePercent = {
    investimento: toFiniteNumber(change?.total_spend),
    receita: toFiniteNumber(change?.total_revenue),
    impressoes: toFiniteNumber(change?.total_impressions),
    alcance: toFiniteNumber(change?.reach),
    cliques: toFiniteNumber(change?.total_clicks),
    ctr: toFiniteNumber(change?.ctr),
    cpc: toFiniteNumber(change?.cpc),
    cpm: toFiniteNumber(change?.avgCpm),
    frequencia: toFiniteNumber(change?.frequency),
    conversoes: toFiniteNumber(change?.total_conversions),
    cpa: toFiniteNumber(change?.cpa),
    taxaConversao: toFiniteNumber(change?.conversionRate),
    roas: toFiniteNumber(change?.roas),
    engajamentos: toFiniteNumber(change?.postEngagement),
  };

  const insightRows = Array.isArray(data?.insights) ? data.insights : [];

  const topSourceRows = campaignRows.length > 0 ? campaignRows : dailyRows;
  const topAdSetSourceRows = adGroupRows.length > 0 ? adGroupRows : dailyRows;
  const topAdAssetSourceRows = adAssetRows.filter((row: any) => {
    const hasAdName = Boolean(row?.adName || row?.ad_name);
    const isAggregatable = row?.isAggregatable !== false;
    const notRepeatedScope = row?.aggregationScope !== "NAO_AGREGAVEL_REPETIDO_POR_RECURSO";
    return hasAdName && isAggregatable && notRepeatedScope;
  });
  const topAdSourceRows = topAdAssetSourceRows.length > 0
    ? topAdAssetSourceRows
    : adGroupRows.length > 0
      ? adGroupRows
      : campaignRows.length > 0
        ? campaignRows
        : dailyRows;

  return {
    summary: {
      ...kpisCurrent,
      leads: leadsTotal || 0,
      onFacebookLeads: dailyAgg.totals.onFacebookLeads || 0,
      websiteLeads: dailyAgg.totals.websiteLeads || 0,
      offlineLeads: dailyAgg.totals.offlineLeads || 0,
      mensagens: messagingTotal || 0,
      atualizadoEm: data?.lastUpdated || null,
    },
    comparativo: {
      atual: kpisCurrent,
      anterior: kpisPrevious,
      variacaoPercentual: changePercent,
    },
    objetivos: {
      metaObjectives: Array.isArray(data?.metaObjectives) ? data.metaObjectives : [],
      metaPrimaryObjective: data?.metaPrimaryObjective || null,
      metaValidationStatus: data?.metaValidationStatus || "not_configured",
      metaValidationNotes: data?.metaValidationNotes || {},
    },
    funil: {
      impressões: kpisCurrent.impressoes,
      alcance: kpisCurrent.alcance,
      cliques: kpisCurrent.cliques,
      conversoes: kpisCurrent.conversoes,
      engajamentos: kpisCurrent.engajamentos,
      leads: leadsTotal || 0,
      mensagens: messagingTotal || 0,
      ctr: kpisCurrent.ctr,
      cpc: kpisCurrent.cpc,
      cpm: kpisCurrent.cpm,
      cpa: kpisCurrent.cpa,
      roas: kpisCurrent.roas,
    },
    totaisNumericos: {
      dailyPerformance: dailyAgg.totals,
      campaigns: campaignAgg.totals,
      adGroups: adGroupAgg.totals,
      keywords: keywordAgg.totals,
      searchTerms: searchTermAgg.totals,
      adsAndAssets: adAssetAgg.totals,
    },
    mediasNumericas: {
      dailyPerformance: dailyAgg.averages,
      campaigns: campaignAgg.averages,
      adGroups: adGroupAgg.averages,
      keywords: keywordAgg.averages,
      searchTerms: searchTermAgg.averages,
      adsAndAssets: adAssetAgg.averages,
    },
    series: {
      dailyPerformance: dailyRows.slice(-MAX_SERIES_POINTS).map((row: any) => ({
        data: row?.date || null,
        campanha: row?.campaignName || row?.campaign_name || null,
        conjunto: row?.adSetName || row?.adset_name || row?.adGroupName || null,
        anuncio: row?.adName || row?.ad_name || null,
        investimento: toFiniteNumber(row?.cost ?? row?.total_spend),
        impressoes: toFiniteNumber(row?.impressions),
        alcance: toFiniteNumber(row?.reach),
        frequencia: toFiniteNumber(row?.frequency),
        cliques: toFiniteNumber(row?.clicks),
        ctr: toFiniteNumber(row?.ctr),
        cpc: toFiniteNumber(row?.cpc ?? row?.avgCpc),
        cpm: toFiniteNumber(row?.cpm ?? row?.avgCpm),
        conversoes: toFiniteNumber(row?.conversions),
        engajamentos: toFiniteNumber(row?.postEngagement),
        leads:
          toFiniteNumber(row?.leads) ||
          toFiniteNumber(row?.onFacebookLeads) + toFiniteNumber(row?.websiteLeads) + toFiniteNumber(row?.offlineLeads),
        mensagens: toFiniteNumber(row?.messagingConversationsStarted ?? row?.conversions),
      })),
    },
    topItems: {
      campanhas: {
        porInvestimento: toTopItems(topSourceRows, { metricKey: "cost", extraFields: ["campaignName"] }),
        porConversoes: toTopItems(topSourceRows, { metricKey: "conversions", extraFields: ["campaignName"] }),
        porCliques: toTopItems(topSourceRows, { metricKey: "clicks", extraFields: ["campaignName"] }),
        porImpressoes: toTopItems(topSourceRows, { metricKey: "impressions", extraFields: ["campaignName"] }),
        porEngajamento: toTopItems(topSourceRows, { metricKey: "postEngagement", extraFields: ["campaignName"] }),
        porLeads: toTopItems(topSourceRows, { metricKey: "onFacebookLeads", extraFields: ["campaignName"] }),
        porMensagens: toTopItems(topSourceRows, { metricKey: "messagingConversationsStarted", extraFields: ["campaignName"] }),
      },
      conjuntos: {
        porInvestimento: toTopItems(topAdSetSourceRows, { metricKey: "cost", extraFields: ["campaignName", "adSetName"] }),
        porConversoes: toTopItems(topAdSetSourceRows, { metricKey: "conversions", extraFields: ["campaignName", "adSetName"] }),
        porEngajamento: toTopItems(topAdSetSourceRows, { metricKey: "postEngagement", extraFields: ["campaignName", "adSetName"] }),
      },
      anuncios: {
        porInvestimento: toTopItems(topAdSourceRows, { metricKey: "cost", extraFields: ["campaignName", "adSetName", "adName"] }),
        porConversoes: toTopItems(topAdSourceRows, { metricKey: "conversions", extraFields: ["campaignName", "adSetName", "adName"] }),
        porCliques: toTopItems(topAdSourceRows, { metricKey: "clicks", extraFields: ["campaignName", "adSetName", "adName"] }),
      },
      palavrasChave: {
        porInvestimento: toTopItems(keywordRows, { metricKey: "cost", extraFields: ["campaignName", "adGroupName", "keyword"] }),
        porConversoes: toTopItems(keywordRows, { metricKey: "conversions", extraFields: ["campaignName", "adGroupName", "keyword"] }),
      },
      termosPesquisa: {
        porInvestimento: toTopItems(searchTermRows, { metricKey: "cost", extraFields: ["campaignName", "adGroupName", "searchTerm"] }),
        porConversoes: toTopItems(searchTermRows, { metricKey: "conversions", extraFields: ["campaignName", "adGroupName", "searchTerm"] }),
      },
    },
    datasets: {
      counts: {
        dailyPerformance: dailyRows.length,
        campaigns: campaignRows.length,
        adGroups: adGroupRows.length,
        keywords: keywordRows.length,
        searchTerms: searchTermRows.length,
        adsAndAssets: adAssetRows.length,
        insights: insightRows.length,
      },
      compression: {
        samplesIncluded: false,
        seriesLimit: MAX_SERIES_POINTS,
        topItemsLimit: MAX_TOP_ITEMS,
        insightsLimit: MAX_INSIGHTS,
      },
    },
    insights: insightRows.slice(0, MAX_INSIGHTS),
  };
}

function sanitizeShareNamePart(value: string | null | undefined) {
  const str = String(value || "").trim();
  return str || "Sem nome";
}

async function ensureShareUrl(params: {
  dashboardId: string;
  clientId: string;
  clientName?: string | null;
  dashboardName?: string | null;
  origin: string;
  shareLinkId?: string;
}) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "ensure_share_url" });

  let query = supabase
    .from("dashboard_share_links")
    .select("id, status, expires_at, created_at")
    .eq("dashboard_id", params.dashboardId)
    .eq("status", "active");

  if (params.shareLinkId) {
    query = query.eq("id", params.shareLinkId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1);
  if (!error && data && data.length > 0) {
    const link = data[0];
    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
    if (!isExpired) {
      return `${params.origin}/share/${link.id}`;
    }
  }

  const fallback = await supabase
    .from("dashboard_share_links")
    .select("id, status, expires_at, created_at")
    .eq("dashboard_id", params.dashboardId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!fallback.error && fallback.data && fallback.data.length > 0) {
    const link = fallback.data[0];
    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
    if (!isExpired) {
      return `${params.origin}/share/${link.id}`;
    }
  }

  const clientName = sanitizeShareNamePart(params.clientName);
  const dashboardName = sanitizeShareNamePart(params.dashboardName);
  const autoName = `Auto | ${clientName} | ${dashboardName}`;

  const { data: createdLink, error: createError } = await supabase
    .from("dashboard_share_links")
    .insert([
      {
        dashboard_id: params.dashboardId,
        client_id: params.clientId,
        name: autoName,
        status: "active",
        expires_at: null,
      },
    ])
    .select("id")
    .single();

  if (createError || !createdLink?.id) {
    return null;
  }

  return `${params.origin}/share/${createdLink.id}`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const isCronAuthorized =
      Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCronAuthorized) {
      const authError = await requireAdmin();
      if (authError) return authError;
      const csrfError = enforceSameOrigin(request);
      if (csrfError) return csrfError;
      const rateLimitError = enforceRateLimit(request, { key: "admin:automations:dispatch", limit: 15, windowMs: 60_000 });
      if (rateLimitError) return rateLimitError;
    }

    const parsedBody = await parseJsonObject(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body as DispatchBody;
    const dashboardId = requireString(parsedBody.body, "dashboardId") || "";

    if (!dashboardId) {
      return NextResponse.json({ success: false, error: "dashboardId é obrigatório." }, { status: 400 });
    }

    const dashboard = await DashboardService.getDashboardById(dashboardId, { bypassRls: true });
    if (!dashboard) {
      return NextResponse.json({ success: false, error: "Dashboard não encontrado." }, { status: 404 });
    }

    const data = await getDashboardData(dashboardId, {
      from: body.from || undefined,
      to: body.to || undefined,
      bypassRls: true,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Sem snapshot disponível para esse dashboard." },
        { status: 404 }
      );
    }

    const origin = new URL(request.url).origin;
    const shareUrl = await ensureShareUrl({
      dashboardId,
      clientId: dashboard.client_id,
      clientName: dashboard.clients?.name || null,
      dashboardName: dashboard.name || null,
      origin,
      shareLinkId: body.shareLinkId,
    });
    const shareToken = shareUrl ? shareUrl.split("/").pop() || null : null;
    const shareUrlWithRange = appendDashboardRangeToUrl(shareUrl, body.from || null, body.to || null);

    const channels = normalizeChannels(body.channels);

    const reportMode = normalizeReportMode(body.reportMode || dashboard.automation_report_mode);
    const includePdf = reportMode === "pdf_only" || reportMode === "analysis_pdf" || reportMode === "both_pdf";
    const report = getReportMetrics(data);
    const aiInterpretation = reportMode !== "metrics_only" || includePdf
      ? await generateAiInterpretation({
          report,
          dashboardName: dashboard.name,
          clientName: dashboard.clients?.name || null,
          periodFrom: body.from || null,
          periodTo: body.to || null,
        })
      : {
          enabled: false,
          provider: null,
          model: null,
          generated: false,
          text: null,
          error: "Interpretação desativada pelo modo metrics_only.",
          fallbackUsed: false,
        };

    const reportPayload =
      reportMode === "pdf_only"
        ? {}
        : reportMode === "analysis_only" || reportMode === "analysis_pdf"
        ? { aiInterpretation }
        : reportMode === "metrics_only"
          ? report
          : { ...report, aiInterpretation };

    const pdfReport =
      aiInterpretation?.generated && aiInterpretation?.text
        ? { ...report, aiInterpretation }
        : report;

    const periodFrom = normalizePdfPeriodPart(body.from);
    const periodTo = normalizePdfPeriodPart(body.to);
    const periodFromDisplay = formatPdfDisplayDate(periodFrom);
    const periodToDisplay = formatPdfDisplayDate(periodTo);
    const periodPart = buildPdfPeriodPart(periodFrom, periodTo);
    const dashboardPart = sanitizePdfFilePart(dashboard.name || "dashboard");
    const clientPart = sanitizePdfFilePart(dashboard.clients?.name || "cliente");
    const pdfFilename = buildSharePdfFilename({
      dashboardName: `${dashboardPart}`,
      clientName: `${clientPart}`,
      periodPart,
    });
    const storagePath =
      includePdf && shareToken
        ? buildSharePdfStoragePath({
            shareToken: String(shareToken),
            periodPart,
            filename: pdfFilename,
          })
        : null;
    let pdfUrl =
      includePdf && shareToken
        ? `${origin}/api/share/${shareToken}/${encodeURIComponent(pdfFilename)}${
            periodFrom || periodTo
              ? `?${new URLSearchParams(
                  Object.fromEntries(
                    Object.entries({
                      ...(periodFrom ? { from: periodFrom } : {}),
                      ...(periodTo ? { to: periodTo } : {}),
                    })
                  )
                ).toString()}`
              : ""
          }`
        : null;

    if (includePdf && !body.dryRun && storagePath) {
      try {
        await renderAndStoreSharePdf({
          dashboardName: dashboard.name,
          clientName: dashboard.clients?.name || null,
          clientLogoUrl: dashboard.clients?.logo_url || null,
          studioLogoUrl:
            String(process.env.S4X_STUDIO_LOGO_URL || "").trim() ||
            `${origin}/logotipo-s4x.svg`,
          periodLabel:
            periodFromDisplay && periodToDisplay
              ? `${periodFromDisplay} a ${periodToDisplay}`
              : periodFromDisplay || periodToDisplay || "Periodo nao informado",
          report: pdfReport as any,
          storagePath,
        });
        pdfUrl = await createSharePdfSignedUrl(storagePath);
      } catch (pdfWarmupError) {
        return NextResponse.json(
          {
            success: false,
            error: "Falha ao pré-gerar PDF antes do envio do webhook.",
            details: getErrorDetails(pdfWarmupError),
            pdfUrl,
          },
          { status: 500 }
        );
      }
    }

    const payload = {
      event: "dashboard_report_dispatch",
      dispatchedAt: new Date().toISOString(),
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        templateId: dashboard.dashboard_type,
        clientId: dashboard.client_id,
        clientName: dashboard.clients?.name || null,
      },
      period: {
        from: body.from || null,
        to: body.to || null,
      },
      channels: channels.length > 0 ? channels : ["email", "whatsapp"],
      recipients: resolveRecipients({
        client: dashboard.clients,
        manual: body.recipients,
      }),
      share: {
        url: shareUrlWithRange,
      },
      reportMode,
      report: reportPayload,
      pdf: {
        mode: includePdf ? "storage_signed_pdf_url" : "client_side_export",
        available: includePdf && Boolean(shareToken),
        url: pdfUrl,
        filename: includePdf ? pdfFilename : null,
        note: includePdf
          ? "URL assinada do arquivo PDF salvo no storage. Use esta URL para baixar/anexar no workflow do n8n."
          : "Nesta fase, o PDF é gerado no frontend. Recomenda-se envio de análise + link compartilhado via n8n.",
      },
    };

    if (body.dryRun) {
      return NextResponse.json({ success: true, dryRun: true, payload });
    }

    const webhookEnvironment = body.webhookEnvironment === "test" ? "test" : "production";
    const resolvedWebhook = await resolveWebhookUrl(webhookEnvironment);
    const webhookUrl = resolvedWebhook.url;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            `${WEBHOOK_ENV_KEYS[webhookEnvironment]} não configurado. Defina a variável de ambiente para habilitar o disparo.`,
          diagnostic: {
            resolutionSource: resolvedWebhook.source,
            runtimeValueConfigured: !isPlaceholderWebhook(
              String(
                webhookEnvironment === "test"
                  ? process.env.N8N_REPORT_DISPATCH_WEBHOOK_TEST_URL || ""
                  : process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || ""
              ).trim()
            ),
          },
          payloadPreview: payload,
        },
        { status: 400 }
      );
    }
    if (webhookEnvironment !== "test" && isTestWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook de teste detectado (/webhook-test). Para disparo real use a URL de produção do n8n (/webhook/...).",
          webhookUrl: maskUrl(webhookUrl),
          resolutionSource: resolvedWebhook.source,
        },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-S4X-Event": "dashboard_report_dispatch",
      "X-S4X-Dashboard-Id": dashboardId,
    };

    const webhookToken = await resolveWebhookToken();
    if (webhookToken) {
      headers.Authorization = `Bearer ${webhookToken}`;
    }

    const payloadJson = JSON.stringify(payload);
    const hmacSecret = await resolveWebhookHmacSecret();
    if (hmacSecret) {
      const signature = createHmac("sha256", hmacSecret).update(payloadJson).digest("hex");
      headers["X-S4X-Signature"] = `sha256=${signature}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: payloadJson,
        signal: controller.signal,
      });
    } catch (networkError) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha de rede ao enviar para o webhook n8n.",
          webhookUrl: maskUrl(webhookUrl),
          resolutionSource: resolvedWebhook.source,
          details: getErrorDetails(networkError),
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const raw = await webhookResponse.text();
    let parsed: unknown = raw;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // ignora parse e mantém texto cru
    }

    if (!webhookResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao enviar evento para o n8n.",
          statusCode: webhookResponse.status,
          n8nResponse: parsed,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Disparo enviado ao n8n com sucesso.",
      webhookUrl: maskUrl(webhookUrl),
      resolutionSource: resolvedWebhook.source,
      webhookEnvironment,
      n8nResponse: parsed,
      security: {
        bearerTokenSent: Boolean(webhookToken),
        hmacSignatureSent: Boolean(hmacSecret),
      },
      dispatchedAt: payload.dispatchedAt,
      dashboardId,
      shareUrl: shareUrlWithRange,
      shareUrlWithRange,
      pdf: payload.pdf,
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro interno no disparo de automação.");
  }
}
