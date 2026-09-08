import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Clock3,
  Crosshair,
  Gauge,
  History,
  MousePointerClick,
  Search,
  ShieldAlert,
  Smartphone,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Análise Google Ads" };

const SOURCE_PAGE_SIZE = 1000;

type JsonObject = Record<string, unknown>;
type AnalyticsRow = {
  observed_date: string;
  dimensions: JsonObject | null;
  metrics: JsonObject | null;
  derived_metrics: JsonObject | null;
  raw_row?: JsonObject | null;
};
type Totals = {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  allConversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cvr: number;
  cpa: number | null;
};
type AggregateRow = {
  key: string;
  label: string;
  detail?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  cpc: number | null;
  cvr: number | null;
  cpa: number | null;
};
type ActionItem = {
  priority: "ALTA" | "MÉDIA" | "TESTE";
  title: string;
  reason: string;
  impact: string;
  validation: string;
  confidence: "ALTO" | "MÉDIO" | "BAIXO";
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dimension(row: AnalyticsRow, key: string): string {
  const value = asObject(row.dimensions)[key];
  return value == null ? "" : String(value);
}

function metric(row: AnalyticsRow, key: string): number {
  return numeric(asObject(row.metrics)[key]);
}

function cost(row: AnalyticsRow): number {
  return metric(row, "costMicros") / 1_000_000;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function dateInRange(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function localToday(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(date: string): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function brl(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function integer(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(fractionDigits).replace(".", ",")}%`;
}

function ratioPercent(value: unknown, fractionDigits = 1): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return percent(parsed * 100, fractionDigits);
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function aggregateTotals(rows: AnalyticsRow[], start: string, end: string): Totals {
  const selected = rows.filter((row) => dateInRange(row.observed_date, start, end));
  const impressions = selected.reduce((sum, row) => sum + metric(row, "impressions"), 0);
  const clicks = selected.reduce((sum, row) => sum + metric(row, "clicks"), 0);
  const spend = selected.reduce((sum, row) => sum + cost(row), 0);
  const conversions = selected.reduce((sum, row) => sum + metric(row, "conversions"), 0);
  const allConversions = selected.reduce((sum, row) => sum + metric(row, "allConversions"), 0);
  const conversionValue = selected.reduce((sum, row) => sum + metric(row, "conversionsValue"), 0);
  return {
    impressions,
    clicks,
    cost: spend,
    conversions,
    allConversions,
    conversionValue,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    cvr: clicks ? conversions / clicks * 100 : 0,
    cpa: conversions ? spend / conversions : null,
  };
}

function aggregateDimension(
  rows: AnalyticsRow[],
  start: string,
  end: string,
  keyFn: (row: AnalyticsRow) => { key: string; label: string; detail?: string } | null,
): AggregateRow[] {
  const grouped = new Map<string, AggregateRow>();
  for (const row of rows) {
    if (!dateInRange(row.observed_date, start, end)) continue;
    const descriptor = keyFn(row);
    if (!descriptor?.key) continue;
    const current = grouped.get(descriptor.key) || {
      key: descriptor.key,
      label: descriptor.label,
      detail: descriptor.detail,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      cpc: null,
      cvr: null,
      cpa: null,
    };
    current.impressions += metric(row, "impressions");
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    grouped.set(descriptor.key, current);
  }
  return Array.from(grouped.values()).map((item) => ({
    ...item,
    cpc: item.clicks ? item.cost / item.clicks : null,
    cvr: item.clicks ? item.conversions / item.clicks * 100 : null,
    cpa: item.conversions ? item.cost / item.conversions : null,
  })).sort((a, b) => b.cost - a.cost);
}

function weekStart(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  const day = parsed.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  parsed.setUTCDate(parsed.getUTCDate() + delta);
  return parsed.toISOString().slice(0, 10);
}

function auctionTrend(rows: AnalyticsRow[], start: string, end: string) {
  const grouped = new Map<string, { impressions: number; sis: number; budget: number; rank: number; sisWeight: number; budgetWeight: number; rankWeight: number }>();
  for (const row of rows) {
    if (!dateInRange(row.observed_date, start, end)) continue;
    const metrics = asObject(row.metrics);
    const impressions = metric(row, "impressions");
    const key = weekStart(row.observed_date);
    const current = grouped.get(key) || { impressions: 0, sis: 0, budget: 0, rank: 0, sisWeight: 0, budgetWeight: 0, rankWeight: 0 };
    current.impressions += impressions;
    for (const [field, target, weight] of [
      ["searchImpressionShare", "sis", "sisWeight"],
      ["searchBudgetLostImpressionShare", "budget", "budgetWeight"],
      ["searchRankLostImpressionShare", "rank", "rankWeight"],
    ] as const) {
      const value = Number(metrics[field]);
      if (Number.isFinite(value) && impressions > 0) {
        current[target] += value * impressions;
        current[weight] += impressions;
      }
    }
    grouped.set(key, current);
  }
  return Array.from(grouped.entries()).map(([startDate, value]) => ({
    start: startDate,
    end: addDays(startDate, 6),
    impressions: value.impressions,
    sis: value.sisWeight ? value.sis / value.sisWeight : null,
    budgetLost: value.budgetWeight ? value.budget / value.budgetWeight : null,
    rankLost: value.rankWeight ? value.rank / value.rankWeight : null,
  })).sort((a, b) => a.start.localeCompare(b.start));
}

async function fetchAllAnalyticsRows(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sourceId: string,
  dataset: string,
  start: string,
  end: string,
): Promise<AnalyticsRow[]> {
  const rows: AnalyticsRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("google_ads_analytics_rows")
      .select("observed_date,dimensions,metrics,derived_metrics,raw_row")
      .eq("data_source_id", sourceId)
      .eq("dataset", dataset)
      .gte("observed_date", start)
      .lte("observed_date", end)
      .order("observed_date", { ascending: true })
      .range(from, from + SOURCE_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as AnalyticsRow[];
    rows.push(...page);
    if (page.length < SOURCE_PAGE_SIZE) break;
    from += SOURCE_PAGE_SIZE;
  }
  return rows;
}

function deltaColor(value: number | null, inverse = false): string {
  if (value == null || Math.abs(value) < 0.1) return "#64748B";
  const good = inverse ? value < 0 : value > 0;
  return good ? "#047857" : "#B91C1C";
}

function priorityStyle(priority: ActionItem["priority"]) {
  if (priority === "ALTA") return { background: "#FEF2F2", border: "#FECACA", color: "#B91C1C" };
  if (priority === "MÉDIA") return { background: "#FFFBEB", border: "#FDE68A", color: "#92400E" };
  return { background: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" };
}

export default async function GoogleAdsAnalysisPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: source } = await supabase
    .from("data_sources")
    .select("id,name,type,status,client_id,dashboard_id")
    .eq("id", sourceId)
    .eq("type", "google_ads")
    .maybeSingle();
  if (!source) notFound();

  const [{ data: googleSource }, { data: client }, { data: dashboard }, { data: latestCampaignRow }] = await Promise.all([
    supabase.from("google_ads_sources").select("customer_id,customer_name,manager_customer_id,last_import_at,last_import_status,last_error,history_days,lookback_days").eq("data_source_id", sourceId).maybeSingle(),
    supabase.from("clients").select("id,name,company_name").eq("id", source.client_id).maybeSingle(),
    supabase.from("dashboards").select("id,name,title,status").eq("id", source.dashboard_id).maybeSingle(),
    supabase.from("google_ads_analytics_rows").select("observed_date").eq("data_source_id", sourceId).eq("dataset", "campaign_daily").order("observed_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!latestCampaignRow?.observed_date) {
    return <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1180 }}>
      <Link href="/admin/google-ads-api/analysis" style={{ color: "#2563EB", textDecoration: "none" }}>← Voltar</Link>
      <div className="card" style={{ padding: 28, marginTop: 20 }}><h1 style={{ fontSize: 22 }}>Análise Google Ads</h1><p style={{ color: "#64748B", marginTop: 8 }}>Esta fonte ainda não possui dados em campaign_daily.</p></div>
    </div>;
  }

  const today = localToday();
  const yesterday = addDays(today, -1);
  const latestObserved = String(latestCampaignRow.observed_date);
  const currentEnd = latestObserved >= today ? yesterday : latestObserved;
  const currentStart = addDays(currentEnd, -29);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -29);

  const [campaignRows, keywordRows, searchTermRows, deviceRows, adRows, timeRows, landingRows, changeEventsResult, configResult] = await Promise.all([
    fetchAllAnalyticsRows(supabase, sourceId, "campaign_daily", previousStart, currentEnd),
    fetchAllAnalyticsRows(supabase, sourceId, "keyword_daily", previousStart, currentEnd),
    fetchAllAnalyticsRows(supabase, sourceId, "search_terms_daily", currentStart, currentEnd),
    fetchAllAnalyticsRows(supabase, sourceId, "device_daily", currentStart, currentEnd),
    fetchAllAnalyticsRows(supabase, sourceId, "ad_daily", previousStart, currentEnd),
    fetchAllAnalyticsRows(supabase, sourceId, "time_daily", currentStart, currentEnd),
    fetchAllAnalyticsRows(supabase, sourceId, "landing_page_daily", currentStart, currentEnd),
    supabase.from("google_ads_change_events").select("change_date_time,change_resource_type,operation,changed_fields,change_resource_name,campaign_id,ad_group_id,criterion_id,ad_id,asset_id,campaign_budget_id,client_type").eq("data_source_id", sourceId).gte("change_date_time", `${currentStart}T00:00:00Z`).lte("change_date_time", `${addDays(currentEnd, 1)}T00:00:00Z`).order("change_date_time", { ascending: true }).limit(1000),
    supabase.from("google_ads_config_history").select("config_type,resource_name,observed_on,observed_at,campaign_id,payload").eq("data_source_id", sourceId).order("observed_at", { ascending: false }).limit(500),
  ]);

  const current = aggregateTotals(campaignRows, currentStart, currentEnd);
  const previous = aggregateTotals(campaignRows, previousStart, previousEnd);
  const auction = auctionTrend(campaignRows, currentStart, currentEnd);
  const latestAuction = auction[auction.length - 1] || null;

  const keywords = aggregateDimension(keywordRows, currentStart, currentEnd, (row) => {
    const keyword = dimension(row, "keywordText");
    const matchType = dimension(row, "keywordMatchType");
    const criterionId = dimension(row, "criterionId");
    if (!keyword) return null;
    return { key: `${criterionId || keyword}:${matchType}`, label: keyword, detail: matchType };
  });
  const terms = aggregateDimension(searchTermRows, currentStart, currentEnd, (row) => {
    const term = dimension(row, "searchTerm");
    if (!term) return null;
    const matched = dimension(row, "matchedKeywordText");
    const matchType = dimension(row, "matchedKeywordMatchType");
    return { key: `${term}:${matched}:${matchType}`, label: term, detail: matched ? `${matched} · ${matchType}` : "Keyword não identificada" };
  });
  const devices = aggregateDimension(deviceRows, currentStart, currentEnd, (row) => {
    const value = dimension(row, "device");
    return value ? { key: value, label: value } : null;
  });
  const ads = aggregateDimension(adRows, currentStart, currentEnd, (row) => {
    const adId = dimension(row, "adId");
    return adId ? { key: adId, label: adId, detail: `${dimension(row, "adType") || "Anúncio"} · ${dimension(row, "adStatus") || "status n/d"}` } : null;
  });
  const previousAds = aggregateDimension(adRows, previousStart, previousEnd, (row) => {
    const adId = dimension(row, "adId");
    return adId ? { key: adId, label: adId, detail: `${dimension(row, "adType") || "Anúncio"} · ${dimension(row, "adStatus") || "status n/d"}` } : null;
  });
  const hours = aggregateDimension(timeRows, currentStart, currentEnd, (row) => {
    const value = dimension(row, "hour");
    return value ? { key: value, label: `${String(value).padStart(2, "0")}:00` } : null;
  });
  const landingPages = aggregateDimension(landingRows, currentStart, currentEnd, (row) => {
    const value = dimension(row, "landingPageUrl");
    return value ? { key: value, label: value } : null;
  });

  const changeEvents = changeEventsResult.data || [];
  const eventDays = new Map<string, { count: number; types: Map<string, number> }>();
  for (const event of changeEvents) {
    const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(event.change_date_time));
    const currentDay = eventDays.get(localDate) || { count: 0, types: new Map<string, number>() };
    currentDay.count += 1;
    const type = String(event.change_resource_type || "OUTRO");
    currentDay.types.set(type, (currentDay.types.get(type) || 0) + 1);
    eventDays.set(localDate, currentDay);
  }
  const importantEventDays = Array.from(eventDays.entries())
    .map(([date, value]) => ({ date, count: value.count, types: Array.from(value.types.entries()).sort((a, b) => b[1] - a[1]) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const configRows = configResult.data || [];
  const budgetConfig = configRows.find((row) => row.config_type === "campaign_budget");
  const biddingConfig = configRows.find((row) => row.config_type === "campaign_bidding");
  const budgetPayload = asObject(budgetConfig?.payload);
  const budgetObject = asObject(budgetPayload.campaignBudget);
  const currentDailyBudget = numeric(budgetObject.amountMicros) / 1_000_000 || null;
  const biddingPayload = asObject(biddingConfig?.payload);
  const biddingCampaign = asObject(biddingPayload.campaign);
  const biddingStrategy = String(biddingCampaign.biddingStrategyType || "—");

  const latestQualityByResource = new Map<string, { keyword: string; matchType: string; status: string; score: number | null; predictedCtr: string; creative: string; postClick: string }>();
  for (const row of configRows.filter((item) => item.config_type === "keyword_quality")) {
    if (latestQualityByResource.has(row.resource_name)) continue;
    const payload = asObject(row.payload);
    const criterion = asObject(payload.adGroupCriterion);
    const keyword = asObject(criterion.keyword);
    const quality = asObject(criterion.qualityInfo);
    latestQualityByResource.set(row.resource_name, {
      keyword: String(keyword.text || "—"),
      matchType: String(keyword.matchType || "—"),
      status: String(criterion.status || "—"),
      score: quality.qualityScore == null ? null : numeric(quality.qualityScore),
      predictedCtr: String(quality.searchPredictedCtr || "—"),
      creative: String(quality.creativeQualityScore || "—"),
      postClick: String(quality.postClickQualityScore || "—"),
    });
  }
  const lowQuality = Array.from(latestQualityByResource.values()).filter((item) => item.status === "ENABLED" && item.score != null && item.score <= 4).sort((a, b) => (a.score || 99) - (b.score || 99));

  const noConversionKeywords = keywords.filter((item) => item.conversions === 0 && item.cost > 0);
  const convertedKeywords = keywords.filter((item) => item.conversions > 0);
  const expensiveNoConversionTerms = terms.filter((item) => item.conversions === 0 && item.cost >= 5).slice(0, 12);
  const previousCpa = previous.cpa || 40;
  const pauseThreshold = Math.max(previousCpa * 1.75, 60);
  const highWasteKeywords = noConversionKeywords.filter((item) => item.cost >= pauseThreshold || item.clicks >= 8).slice(0, 6);
  const mediumWasteKeywords = noConversionKeywords.filter((item) => !highWasteKeywords.includes(item) && (item.cost >= 20 || item.clicks >= 3)).slice(0, 8);
  const efficientConvertedKeywords = convertedKeywords.filter((item) => item.cpa != null && item.cpa <= previousCpa * 1.35);

  const last7Start = addDays(currentEnd, -6);
  const last7 = aggregateTotals(campaignRows, last7Start, currentEnd);
  const last7BudgetCapacity = currentDailyBudget ? currentDailyBudget * 7 : null;
  const heavyZeroConvHours = hours.filter((item) => item.conversions === 0 && item.cost >= Math.max(current.cost * 0.07, 20)).slice(0, 5);
  const deviceZeroConv = devices.filter((item) => item.conversions === 0 && current.cost > 0 && item.cost / current.cost >= 0.2);

  const actions: ActionItem[] = [];
  if (current.conversions < previous.conversions * 0.5) {
    actions.push({ priority: "ALTA", title: "Recuperar eficiência antes de escalar verba", reason: `As conversões caíram de ${integer(previous.conversions)} para ${integer(current.conversions)} no comparativo de 30 dias, enquanto o CPA saiu de ${brl(previous.cpa)} para ${brl(current.cpa)}.`, impact: "Evitar ampliar investimento sobre uma estrutura que ainda está convertendo abaixo do histórico.", validation: "Comparar CPA, CVR e volume de conversões por 7–14 dias após os ajustes.", confidence: "ALTO" });
  }
  if (latestAuction?.rankLost != null && latestAuction.rankLost > (latestAuction.budgetLost || 0)) {
    actions.push({ priority: "ALTA", title: "Atacar Ad Rank e relevância", reason: `Na semana mais recente, a perda de impressões por ranking está em ${ratioPercent(latestAuction.rankLost)}, contra ${ratioPercent(latestAuction.budgetLost)} por orçamento.`, impact: "Recuperar elegibilidade e presença no leilão sem depender de aumento de orçamento.", validation: "Acompanhar semanalmente Lost IS Rank, Search IS, CTR e CPC; buscar queda consistente de Lost IS Rank.", confidence: "ALTO" });
  }
  if (highWasteKeywords.length) {
    actions.push({ priority: "ALTA", title: "Reduzir ou pausar keywords sem retorno comprovado", reason: `${highWasteKeywords.map((item) => `${item.label} (${brl(item.cost)})`).join(", ")} consumiram verba sem conversão registrada no período.`, impact: "Concentrar verba em intenções com maior evidência de geração de lead.", validation: "Revisar também CRM/planilha de leads antes de pausar; depois medir redução de gasto sem conversão e redistribuição de cliques.", confidence: "MÉDIO" });
  }
  if (expensiveNoConversionTerms.length) {
    actions.push({ priority: "ALTA", title: "Criar negativas a partir dos termos de pesquisa", reason: `Há termos sem conversão como ${expensiveNoConversionTerms.slice(0, 5).map((item) => `“${item.label}”`).join(", ")}, agora ligados à keyword que os acionou.`, impact: "Reduzir buscas de baixa intenção, marcas/concorrentes, preço baixo e localidades fora da estratégia.", validation: "Após negativar apenas os termos claramente desalinhados, acompanhar gasto evitado e manutenção do volume de buscas qualificadas.", confidence: "ALTO" });
  }
  if (lowQuality.length) {
    actions.push({ priority: "ALTA", title: "Melhorar relevância anúncio → keyword → landing page", reason: `${lowQuality.length} keywords habilitadas têm Quality Score ≤ 4 no snapshot atual; há sinais de CTR previsto, criativo ou experiência pós-clique abaixo da média.`, impact: "Melhorar Ad Rank, reduzir CPC e aumentar a capacidade de entrar em leilões relevantes.", validation: "Acompanhar snapshots futuros de Quality Score e componentes, junto com Lost IS Rank e CPC.", confidence: "ALTO" });
  }
  if (currentDailyBudget && last7BudgetCapacity && last7.cost < last7BudgetCapacity * 0.65 && latestAuction?.rankLost != null && latestAuction.rankLost > 0.4) {
    actions.push({ priority: "MÉDIA", title: "Não aumentar orçamento agora", reason: `O orçamento atual observado é ${brl(currentDailyBudget)}/dia. Nos últimos 7 dias foram gastos ${brl(last7.cost)} de uma capacidade teórica de ${brl(last7BudgetCapacity)}, enquanto a perda por ranking segue elevada.`, impact: "Evitar colocar mais verba em uma campanha limitada principalmente por competitividade/relevância.", validation: "Só reconsiderar escala quando Lost IS Rank cair e CPA/CVR mostrarem recuperação.", confidence: "ALTO" });
  }
  if (heavyZeroConvHours.length) {
    actions.push({ priority: "MÉDIA", title: "Testar ajuste de horários, sem corte agressivo", reason: `Faixas como ${heavyZeroConvHours.map((item) => item.label).join(", ")} concentram gasto sem conversão no período, mas a amostra total ainda é pequena.`, impact: "Reduzir exposição marginal em horários menos eficientes e proteger verba para faixas com maior sinal.", validation: "Aplicar ajuste moderado ou experimento por 2 semanas e comparar CPA/CVR por hora.", confidence: "MÉDIO" });
  }
  if (deviceZeroConv.length) {
    actions.push({ priority: "TESTE", title: "Revisar mix por dispositivo", reason: `${deviceZeroConv.map((item) => item.label).join(", ")} consumiu parcela relevante da verba sem conversão registrada no período.`, impact: "Identificar se há diferença de intenção, experiência da landing page ou custo entre dispositivos.", validation: "Comparar CPC, CVR e comportamento da landing page por dispositivo antes de aplicar exclusões.", confidence: "MÉDIO" });
  }
  if (!actions.length) {
    actions.push({ priority: "TESTE", title: "Manter estrutura e observar tendência", reason: "Não há sinal forte suficiente para uma intervenção estrutural automática neste recorte.", impact: "Evitar mudanças precipitadas com pouco volume.", validation: "Reavaliar após acumular mais cliques e conversões.", confidence: "BAIXO" });
  }

  const biggestEventDay = importantEventDays[0] || null;
  const conversionsDelta = pctChange(current.conversions, previous.conversions);
  const cpcDelta = pctChange(current.cpc, previous.cpc);
  const ctrDelta = pctChange(current.ctr, previous.ctr);
  const cvrDelta = pctChange(current.cvr, previous.cvr);
  const costDelta = pctChange(current.cost, previous.cost);
  const impressionsDelta = pctChange(current.impressions, previous.impressions);
  const clicksDelta = pctChange(current.clicks, previous.clicks);
  const cpaDelta = current.cpa != null && previous.cpa != null ? pctChange(current.cpa, previous.cpa) : null;

  const metricCards = [
    { label: "Investimento", value: brl(current.cost), delta: costDelta, inverse: false },
    { label: "Impressões", value: integer(current.impressions), delta: impressionsDelta, inverse: false },
    { label: "Cliques", value: integer(current.clicks), delta: clicksDelta, inverse: false },
    { label: "CTR", value: percent(current.ctr, 2), delta: ctrDelta, inverse: false },
    { label: "CPC", value: brl(current.cpc), delta: cpcDelta, inverse: true },
    { label: "Conversões", value: integer(current.conversions), delta: conversionsDelta, inverse: false },
    { label: "CVR", value: percent(current.cvr, 2), delta: cvrDelta, inverse: false },
    { label: "CPA", value: brl(current.cpa), delta: cpaDelta, inverse: true },
  ];

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1280 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <Link href="/admin/google-ads-api/analysis" style={{ width: 40, height: 40, borderRadius: 9, background: "#F1F5F9", color: "#475569", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={19} /></Link>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}><h1 style={{ fontSize: 24, fontWeight: 760, color: "#0F172A" }}>Análise de Performance · Google Ads</h1><span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 9px", background: "#EEF2FF", color: "#4338CA" }}>ADMIN</span></div>
          <p style={{ marginTop: 5, color: "#64748B", fontSize: 14 }}>{client?.name || source.name} · {googleSource?.customer_name || "Conta Google Ads"} ({googleSource?.customer_id || "ID n/d"})</p>
          <p style={{ marginTop: 4, color: "#94A3B8", fontSize: 12 }}>Período analisado: {formatDate(currentStart)}–{formatDate(currentEnd)} · comparação: {formatDate(previousStart)}–{formatDate(previousEnd)} · última sincronização: {formatDateTime(googleSource?.last_import_at)}</p>
        </div>
        {dashboard?.id ? <Link href={`/app/dashboards/${dashboard.id}/executive-summary`} target="_blank" style={{ padding: "9px 12px", borderRadius: 8, background: "#EFF6FF", color: "#1D4ED8", textDecoration: "none", fontWeight: 700, fontSize: 12 }}>Abrir dashboard</Link> : null}
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 18, borderLeft: "4px solid #DC2626" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><ShieldAlert size={22} color="#DC2626" style={{ flex: "0 0 auto", marginTop: 1 }} /><div><h2 style={{ fontSize: 17, fontWeight: 760, color: "#0F172A" }}>Resumo executivo</h2><p style={{ marginTop: 7, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>A campanha perdeu eficiência de forma relevante no comparativo. O maior dano está na combinação entre menor volume de cliques, CPC mais alto e queda da taxa de conversão. {latestAuction?.rankLost != null && latestAuction.rankLost > (latestAuction.budgetLost || 0) ? `No leilão mais recente, o principal limitador é Ad Rank: ${ratioPercent(latestAuction.rankLost)} das impressões elegíveis são perdidas por ranking, contra ${ratioPercent(latestAuction.budgetLost)} por orçamento.` : "O equilíbrio entre orçamento e ranking deve ser acompanhado antes de escalar verba."} {biggestEventDay?.count && biggestEventDay.count >= 10 ? `Há ainda uma ruptura operacional importante em ${formatDate(biggestEventDay.date)}, com ${biggestEventDay.count} alterações registradas na conta.` : ""}</p></div></div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
        {metricCards.map((item) => <div className="card" key={item.label} style={{ padding: 16 }}><p style={{ fontSize: 11, color: "#64748B", fontWeight: 650 }}>{item.label}</p><p style={{ marginTop: 5, fontSize: 21, fontWeight: 760, color: "#0F172A" }}>{item.value}</p><div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: deltaColor(item.delta, item.inverse) }}>{(item.delta || 0) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{item.delta == null ? "sem base" : `${item.delta >= 0 ? "+" : ""}${item.delta.toFixed(1).replace(".", ",")}%`} <span style={{ fontWeight: 500, color: "#94A3B8" }}>vs. anterior</span></div></div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(300px,.8fr)", gap: 18, marginBottom: 18 }} className="admin-two-col">
        <section className="card" style={{ padding: 22, overflow: "hidden" }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Gauge size={19} color="#7C3AED" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Leilão e participação de impressões</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Médias semanais ponderadas por impressões.</p></div></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Semana</th><th>Impr.</th><th>Search IS</th><th>Perda orçamento</th><th>Perda ranking</th></tr></thead><tbody>{auction.map((row) => <tr key={row.start} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{formatDate(row.start)}–{formatDate(row.end)}</td><td>{integer(row.impressions)}</td><td>{row.sis == null ? "—" : ratioPercent(row.sis)}</td><td style={{ color: row.budgetLost != null && row.rankLost != null && row.budgetLost > row.rankLost ? "#B45309" : "#475569" }}>{row.budgetLost == null ? "—" : ratioPercent(row.budgetLost)}</td><td style={{ color: row.rankLost != null && row.budgetLost != null && row.rankLost > row.budgetLost ? "#B91C1C" : "#475569", fontWeight: row.rankLost != null && row.budgetLost != null && row.rankLost > row.budgetLost ? 700 : 400 }}>{row.rankLost == null ? "—" : ratioPercent(row.rankLost)}</td></tr>)}</tbody></table></div></section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><BadgeDollarSign size={19} color="#059669" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Configuração atual</h2></div><div style={{ display: "grid", gap: 12 }}><div><p style={{ fontSize: 11, color: "#64748B" }}>Orçamento diário observado</p><p style={{ marginTop: 3, fontSize: 20, fontWeight: 750 }}>{brl(currentDailyBudget)}</p></div><div><p style={{ fontSize: 11, color: "#64748B" }}>Estratégia de lances</p><p style={{ marginTop: 3, fontSize: 14, fontWeight: 700 }}>{biddingStrategy}</p></div><div><p style={{ fontSize: 11, color: "#64748B" }}>Últimos 7 dias</p><p style={{ marginTop: 3, fontSize: 14, fontWeight: 700 }}>{brl(last7.cost)} · {integer(last7.clicks)} cliques · {integer(last7.conversions)} conv.</p>{last7BudgetCapacity ? <p style={{ marginTop: 3, fontSize: 11, color: "#64748B" }}>Capacidade teórica no orçamento atual: {brl(last7BudgetCapacity)}</p> : null}</div></div></section>
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Target size={19} color="#DC2626" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Keywords · decisão operacional</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Conversões abaixo são as registradas no Google Ads; confirme CRM/planilha antes de pausar uma keyword.</p></div></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Keyword</th><th>Tipo</th><th>Cliques</th><th>Custo</th><th>Conv.</th><th>CPC</th><th>CPA</th><th>Leitura</th></tr></thead><tbody>{keywords.filter((item) => item.cost > 0).slice(0, 18).map((item) => { const highWaste = highWasteKeywords.includes(item); const mediumWaste = mediumWasteKeywords.includes(item); const efficient = efficientConvertedKeywords.includes(item); const reading = efficient ? "Manter / testar escala" : highWaste ? "Reduzir / pausar após validar leads" : mediumWaste ? "Revisar / limitar" : item.conversions > 0 ? "Manter e otimizar" : "Monitorar"; const color = efficient ? "#047857" : highWaste ? "#B91C1C" : mediumWaste ? "#92400E" : "#475569"; return <tr key={item.key} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{item.label}</td><td>{item.detail}</td><td>{integer(item.clicks)}</td><td>{brl(item.cost)}</td><td>{integer(item.conversions)}</td><td>{brl(item.cpc)}</td><td>{brl(item.cpa)}</td><td style={{ color, fontWeight: 700 }}>{reading}</td></tr>; })}</tbody></table></div></section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Search size={19} color="#EA580C" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Termos de pesquisa e keyword responsável</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Principais termos sem conversão, ordenados por custo. Use como fila de negativas e revisão de correspondência.</p></div></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Termo pesquisado</th><th>Keyword acionadora</th><th>Cliques</th><th>Custo</th><th>Conv.</th></tr></thead><tbody>{terms.filter((item) => item.cost > 0).slice(0, 20).map((item) => <tr key={item.key} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{item.label}</td><td style={{ color: "#64748B" }}>{item.detail}</td><td>{integer(item.clicks)}</td><td>{brl(item.cost)}</td><td>{integer(item.conversions)}</td></tr>)}</tbody></table></div></section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 18, marginBottom: 18 }}>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Smartphone size={19} color="#2563EB" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Dispositivos</h2></div>{devices.map((item) => <div key={item.key} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 5, padding: "9px 0", borderTop: "1px solid #E2E8F0" }}><div><strong style={{ fontSize: 12 }}>{item.label}</strong><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{integer(item.clicks)} cliques · {integer(item.conversions)} conv.</p></div><div style={{ textAlign: "right" }}><strong style={{ fontSize: 12 }}>{brl(item.cost)}</strong><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>CPC {brl(item.cpc)}</p></div></div>)}</section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Clock3 size={19} color="#7C3AED" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Horários com maior investimento</h2></div>{hours.slice(0, 10).map((item) => <div key={item.key} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 5, padding: "8px 0", borderTop: "1px solid #E2E8F0" }}><div><strong style={{ fontSize: 12 }}>{item.label}</strong><span style={{ marginLeft: 7, fontSize: 11, color: item.conversions ? "#047857" : "#94A3B8" }}>{integer(item.conversions)} conv.</span></div><div style={{ fontSize: 12, fontWeight: 650 }}>{brl(item.cost)}</div></div>)}</section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><MousePointerClick size={19} color="#059669" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Anúncios</h2></div>{ads.slice(0, 8).map((item) => <div key={item.key} style={{ padding: "9px 0", borderTop: "1px solid #E2E8F0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 12 }}>AD {item.label}</strong><span style={{ fontSize: 12, fontWeight: 650 }}>{brl(item.cost)}</span></div><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{item.detail} · {integer(item.clicks)} cliques · {integer(item.conversions)} conv. · CPA {brl(item.cpa)}</p></div>)}{previousAds.length ? <p style={{ marginTop: 10, fontSize: 11, color: "#94A3B8" }}>Comparação histórica disponível no período anterior; anúncios pausados podem aparecer no recorte por terem veiculado antes da pausa.</p> : null}</section>
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Crosshair size={19} color="#B45309" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Quality Score e relevância</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Snapshot atual; não é retrodatado.</p></div></div>{lowQuality.length === 0 ? <p style={{ fontSize: 13, color: "#64748B" }}>Nenhuma keyword habilitada com Quality Score ≤ 4 no snapshot disponível.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Keyword</th><th>QS</th><th>CTR previsto</th><th>Criativo</th><th>Pós-clique</th></tr></thead><tbody>{lowQuality.slice(0, 15).map((item, index) => <tr key={`${item.keyword}:${item.matchType}:${index}`} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{item.keyword} <span style={{ color: "#94A3B8", fontWeight: 500 }}>· {item.matchType}</span></td><td style={{ color: (item.score || 10) <= 3 ? "#B91C1C" : "#B45309", fontWeight: 750 }}>{item.score ?? "—"}</td><td>{item.predictedCtr}</td><td>{item.creative}</td><td>{item.postClick}</td></tr>)}</tbody></table></div>}</section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><History size={19} color="#475569" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Alterações na conta</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Change Events disponíveis apenas dentro da janela fornecida pelo Google Ads.</p></div></div>{importantEventDays.length === 0 ? <p style={{ fontSize: 13, color: "#64748B" }}>Nenhuma alteração retornada no período disponível.</p> : <div style={{ display: "grid", gap: 10 }}>{importantEventDays.map((day) => <div key={day.date} style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong style={{ fontSize: 13 }}>{formatDate(day.date)}</strong><span style={{ fontSize: 12, fontWeight: 750, color: day.count >= 20 ? "#B91C1C" : "#475569" }}>{day.count} alteração(ões)</span></div><p style={{ marginTop: 5, fontSize: 11, color: "#64748B" }}>{day.types.slice(0, 6).map(([type, count]) => `${type}: ${count}`).join(" · ")}</p></div>)}</div>}</section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><AlertTriangle size={19} color="#DC2626" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Plano de ação priorizado</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Recomendações geradas a partir dos dados do período; validar leads/CRM antes de pausas definitivas.</p></div></div><div style={{ display: "grid", gap: 11 }}>{actions.map((item, index) => { const style = priorityStyle(item.priority); return <div key={`${item.title}:${index}`} style={{ border: `1px solid ${style.border}`, borderRadius: 10, padding: 14, background: style.background }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".04em", color: style.color }}>{item.priority}</span><strong style={{ fontSize: 13, color: "#0F172A" }}>{item.title}</strong><span style={{ marginLeft: "auto", fontSize: 10, color: "#64748B", fontWeight: 700 }}>Confiança {item.confidence}</span></div><p style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: "#475569" }}><strong>Motivo:</strong> {item.reason}</p><p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: "#475569" }}><strong>Impacto esperado:</strong> {item.impact}</p><p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: "#475569" }}><strong>Como validar:</strong> {item.validation}</p></div>; })}</div></section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Activity size={19} color="#2563EB" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Landing pages</h2></div>{landingPages.filter((item) => item.clicks > 0).slice(0, 8).map((item) => <div key={item.key} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, padding: "9px 0", borderTop: "1px solid #E2E8F0" }}><div style={{ minWidth: 0 }}><p style={{ fontSize: 11, overflowWrap: "anywhere", color: "#334155" }}>{item.label}</p><p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{integer(item.clicks)} cliques · {integer(item.conversions)} conv.</p></div><strong style={{ fontSize: 12 }}>{brl(item.cost)}</strong></div>)}</section>

      <section className="card" style={{ padding: 18, background: "#F8FAFC" }}><div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><CheckCircle2 size={18} color="#475569" style={{ marginTop: 1 }} /><div><h2 style={{ fontSize: 13, fontWeight: 720, color: "#334155" }}>Qualidade dos dados</h2><p style={{ marginTop: 5, fontSize: 11, lineHeight: 1.55, color: "#64748B" }}>Esta página usa os fatos históricos persistidos pela Google Ads API. Conversões da plataforma podem divergir do número de leads reais por atribuição, configuração de ações de conversão ou integração com CRM/formulário. Para decisões de pausa, use a relação termo → keyword junto com os leads confirmados fora da plataforma. Search Impression Share é apresentado como média semanal ponderada por impressões. Configurações e Quality Score representam snapshots observados, não histórico retroativo.</p></div></div></section>
    </div>
  );
}
