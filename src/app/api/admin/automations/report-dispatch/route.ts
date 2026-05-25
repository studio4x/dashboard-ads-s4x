import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";

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
};

const WEBHOOK_ENV_KEY = "N8N_REPORT_DISPATCH_WEBHOOK_URL";
const TOKEN_ENV_KEY = "N8N_REPORT_DISPATCH_WEBHOOK_TOKEN";
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

async function resolveWebhookUrl() {
  const fromVercel = String((await getProjectEnvVarFromVercel(WEBHOOK_ENV_KEY)) || "").trim();
  if (!isPlaceholderWebhook(fromVercel) && isValidWebhookUrl(fromVercel)) {
    return { url: fromVercel, source: "vercel_api" as const };
  }

  const fromRuntime = String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || "").trim();
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

async function getShareUrl(dashboardId: string, origin: string, shareLinkId?: string) {
  const supabase = await createAdminClient();

  let query = supabase
    .from("dashboard_share_links")
    .select("id, status, expires_at, created_at")
    .eq("dashboard_id", dashboardId)
    .eq("status", "active");

  if (shareLinkId) {
    query = query.eq("id", shareLinkId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1);
  if (error || !data || data.length === 0) {
    return null;
  }

  const link = data[0];
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null;
  }

  return `${origin}/share/${link.id}`;
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = (await request.json()) as DispatchBody;
    const dashboardId = String(body.dashboardId || "").trim();

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
    const shareUrl = await getShareUrl(dashboardId, origin, body.shareLinkId);

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
      channels: body.channels || ["email", "whatsapp"],
      recipients: body.recipients || {},
      share: {
        url: shareUrl,
      },
      report: getReportMetrics(data),
      pdf: {
        mode: "client_side_export",
        available: false,
        note: "Nesta fase, o PDF é gerado no frontend. Recomenda-se envio de análise + link compartilhado via n8n.",
      },
    };

    if (body.dryRun) {
      return NextResponse.json({ success: true, dryRun: true, payload });
    }

    const resolvedWebhook = await resolveWebhookUrl();
    const webhookUrl = resolvedWebhook.url;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "N8N_REPORT_DISPATCH_WEBHOOK_URL não configurado. Defina a variável de ambiente para habilitar o disparo.",
          diagnostic: {
            resolutionSource: resolvedWebhook.source,
            runtimeValueConfigured: !isPlaceholderWebhook(String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || "").trim()),
          },
          payloadPreview: payload,
        },
        { status: 400 }
      );
    }
    if (isTestWebhookUrl(webhookUrl)) {
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
      n8nResponse: parsed,
      security: {
        bearerTokenSent: Boolean(webhookToken),
        hmacSignatureSent: false,
      },
      dispatchedAt: payload.dispatchedAt,
      dashboardId,
      shareUrl,
    });
  } catch (error: any) {
    console.error("Report Dispatch Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro interno no disparo de automação." },
      { status: 500 }
    );
  }
}
