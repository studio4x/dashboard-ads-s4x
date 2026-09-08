import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
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
import { createAdminClient } from "@/lib/supabase/server";

const SOURCE_PAGE_SIZE = 1000;

type JsonObject = Record<string, unknown>;
type AnalyticsRow = {
  observed_date: string;
  dimensions: JsonObject | null;
  metrics: JsonObject | null;
  derived_metrics: JsonObject | null;
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

type Props = {
  sourceId: string;
  from?: string | null;
  to?: string | null;
  embedded?: boolean;
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
function firstDimension(row: AnalyticsRow, keys: string[]): string {
  for (const key of keys) {
    const value = dimension(row, key);
    if (value) return value;
  }
  return "";
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
function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00Z`).getTime();
  const b = new Date(`${end}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}
function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00Z`).getTime());
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
function ratioPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return percent(value * 100, fractionDigits);
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
  parsed.setUTCDate(parsed.getUTCDate() + (day === 0 ? -6 : 1 - day));
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
      const raw = metrics[field];
      if (raw == null) continue;
      const value = Number(raw);
      if (Number.isFinite(value) && impressions > 0) {
        current[target] += value * impressions;
        current[weight] += impressions;
      }
    }
    grouped.set(key, current);
  }
  return Array.from(grouped.entries()).map(([week, value]) => ({
    start: week < start ? start : week,
    end: addDays(week, 6) > end ? end : addDays(week, 6),
    impressions: value.impressions,
    sis: value.sisWeight ? value.sis / value.sisWeight : null,
    budgetLost: value.budgetWeight ? value.budget / value.budgetWeight : null,
    rankLost: value.rankWeight ? value.rank / value.rankWeight : null,
  })).sort((a, b) => a.start.localeCompare(b.start));
}
async function fetchRows(
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
      .select("observed_date,dimensions,metrics,derived_metrics")
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

export async function GoogleAdsPerformanceAnalysis({ sourceId, from, to, embedded = false }: Props) {
  const supabase = await createAdminClient();
  const { data: source } = await supabase
    .from("data_sources")
    .select("id,name,type,status,client_id,dashboard_id")
    .eq("id", sourceId)
    .eq("type", "google_ads")
    .maybeSingle();

  if (!source) {
    return <div className="card" style={{ padding: 24 }}><strong>Fonte Google Ads não encontrada.</strong></div>;
  }

  const [{ data: googleSource }, { data: client }, { data: dashboard }, { data: latest }, { data: earliest }] = await Promise.all([
    supabase.from("google_ads_sources").select("customer_id,customer_name,last_import_at,last_import_status,last_error").eq("data_source_id", sourceId).maybeSingle(),
    supabase.from("clients").select("id,name,company_name").eq("id", source.client_id).maybeSingle(),
    supabase.from("dashboards").select("id,name,title,status").eq("id", source.dashboard_id).maybeSingle(),
    supabase.from("google_ads_analytics_rows").select("observed_date").eq("data_source_id", sourceId).eq("dataset", "campaign_daily").order("observed_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("google_ads_analytics_rows").select("observed_date").eq("data_source_id", sourceId).eq("dataset", "campaign_daily").order("observed_date", { ascending: true }).limit(1).maybeSingle(),
  ]);

  if (!latest?.observed_date) {
    return <div className="card" style={{ padding: 24 }}><strong>Análise de Performance</strong><p style={{ marginTop: 6, color: "#64748B" }}>Ainda não há dados analíticos em campaign_daily para esta fonte.</p></div>;
  }

  const latestObserved = String(latest.observed_date);
  const earliestObserved = earliest?.observed_date ? String(earliest.observed_date) : latestObserved;
  const today = localToday();
  const defaultEnd = latestObserved >= today ? addDays(today, -1) : latestObserved;
  const hasExplicitRange = isIsoDate(from) && isIsoDate(to) && from <= to;
  const currentStart = hasExplicitRange ? from : addDays(defaultEnd, -29);
  const currentEnd = hasExplicitRange ? to : defaultEnd;
  const periodDays = daysInclusive(currentStart, currentEnd);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(periodDays - 1));

  const [campaignRows, keywordRows, searchTermRows, deviceRows, adRows, timeRows, landingRows, conversionRows, changeEventsResult, configResult] = await Promise.all([
    fetchRows(supabase, sourceId, "campaign_daily", previousStart, currentEnd),
    fetchRows(supabase, sourceId, "keyword_daily", previousStart, currentEnd),
    fetchRows(supabase, sourceId, "search_terms_daily", currentStart, currentEnd),
    fetchRows(supabase, sourceId, "device_daily", currentStart, currentEnd),
    fetchRows(supabase, sourceId, "ad_daily", previousStart, currentEnd),
    fetchRows(supabase, sourceId, "time_daily", currentStart, currentEnd),
    fetchRows(supabase, sourceId, "landing_page_daily", currentStart, currentEnd),
    fetchRows(supabase, sourceId, "conversion_action_daily", currentStart, currentEnd),
    supabase.from("google_ads_change_events").select("change_date_time,change_resource_type,operation").eq("data_source_id", sourceId).gte("change_date_time", `${currentStart}T00:00:00Z`).lt("change_date_time", `${addDays(currentEnd, 1)}T00:00:00Z`).order("change_date_time", { ascending: true }).limit(1000),
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
    return keyword ? { key: `${criterionId || keyword}:${matchType}`, label: keyword, detail: matchType || "—" } : null;
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
  const hours = aggregateDimension(timeRows, currentStart, currentEnd, (row) => {
    const value = dimension(row, "hour");
    return value ? { key: value, label: `${value.padStart(2, "0")}:00` } : null;
  });
  const landingPages = aggregateDimension(landingRows, currentStart, currentEnd, (row) => {
    const value = firstDimension(row, ["landingPageUrl", "unexpandedFinalUrl"]);
    return value ? { key: value, label: value } : null;
  });
  const conversionsByAction = aggregateDimension(conversionRows, currentStart, currentEnd, (row) => {
    const value = firstDimension(row, ["conversionActionName", "actionName", "conversionAction"]);
    return value ? { key: value, label: value } : null;
  });

  const changeEvents = changeEventsResult.data || [];
  const eventDays = new Map<string, { count: number; types: Map<string, number> }>();
  for (const event of changeEvents) {
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(event.change_date_time));
    const day = eventDays.get(date) || { count: 0, types: new Map<string, number>() };
    day.count += 1;
    const type = String(event.change_resource_type || "OUTRO");
    day.types.set(type, (day.types.get(type) || 0) + 1);
    eventDays.set(date, day);
  }
  const importantEventDays = Array.from(eventDays.entries())
    .map(([date, value]) => ({ date, count: value.count, types: Array.from(value.types.entries()).sort((a, b) => b[1] - a[1]) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const configRows = configResult.data || [];
  const budgetConfig = configRows.find((row) => row.config_type === "campaign_budget");
  const biddingConfig = configRows.find((row) => row.config_type === "campaign_bidding");
  const budgetPayload = asObject(budgetConfig?.payload);
  const currentDailyBudget = numeric(asObject(budgetPayload.campaignBudget).amountMicros) / 1_000_000 || null;
  const biddingPayload = asObject(biddingConfig?.payload);
  const biddingStrategy = String(asObject(biddingPayload.campaign).biddingStrategyType || "—");

  const latestQualityByResource = new Map<string, { keyword: string; matchType: string; status: string; score: number | null; predictedCtr: string; creative: string; postClick: string }>();
  for (const row of configRows.filter((item) => item.config_type === "keyword_quality")) {
    if (latestQualityByResource.has(row.resource_name)) continue;
    const criterion = asObject(asObject(row.payload).adGroupCriterion);
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
  const lowQuality = Array.from(latestQualityByResource.values())
    .filter((item) => item.status === "ENABLED" && item.score != null && item.score <= 4)
    .sort((a, b) => (a.score || 99) - (b.score || 99));

  const benchmarkCpa = previous.cpa || current.cpa || null;
  const noConversionKeywords = keywords.filter((item) => item.conversions === 0 && item.cost > 0);
  const pauseThreshold = benchmarkCpa ? Math.max(benchmarkCpa * 1.5, current.cost * 0.1) : Math.max(current.cost * 0.15, 20);
  const highWasteKeywords = noConversionKeywords.filter((item) => item.cost >= pauseThreshold || item.clicks >= 8).slice(0, 6);
  const mediumWasteKeywords = noConversionKeywords.filter((item) => !highWasteKeywords.includes(item) && (item.cost >= Math.max(current.cost * 0.05, 10) || item.clicks >= 3)).slice(0, 8);
  const expensiveNoConversionTerms = terms.filter((item) => item.conversions === 0 && item.cost > 0).slice(0, 15);

  const windowDays = Math.min(7, periodDays);
  const lastWindowStart = addDays(currentEnd, -(windowDays - 1));
  const lastWindow = aggregateTotals(campaignRows, lastWindowStart, currentEnd);
  const lastWindowBudgetCapacity = currentDailyBudget ? currentDailyBudget * windowDays : null;
  const heavyZeroConvHours = hours.filter((item) => item.conversions === 0 && item.cost >= Math.max(current.cost * 0.07, 15)).slice(0, 5);
  const deviceZeroConv = devices.filter((item) => item.conversions === 0 && current.cost > 0 && item.cost / current.cost >= 0.2);

  const actions: ActionItem[] = [];
  if (previous.conversions > 0 && current.conversions < previous.conversions * 0.5) {
    actions.push({ priority: "ALTA", title: "Recuperar eficiência antes de escalar verba", reason: `As conversões caíram de ${integer(previous.conversions)} para ${integer(current.conversions)} em períodos equivalentes de ${periodDays} dia(s), enquanto o CPA passou de ${brl(previous.cpa)} para ${brl(current.cpa)}.`, impact: "Evitar ampliar investimento sobre uma estrutura que ainda converte abaixo do período anterior.", validation: "Comparar CPA, CVR e volume de conversões no mesmo recorte após os ajustes.", confidence: "ALTO" });
  }
  if (latestAuction?.rankLost != null && latestAuction.rankLost > (latestAuction.budgetLost || 0)) {
    actions.push({ priority: "ALTA", title: "Atacar Ad Rank e relevância", reason: `No trecho mais recente do período, a perda por ranking está em ${ratioPercent(latestAuction.rankLost)}, contra ${ratioPercent(latestAuction.budgetLost)} por orçamento.`, impact: "Recuperar presença no leilão sem depender primeiro de aumento de orçamento.", validation: "Acompanhar Lost IS Rank, Search IS, CTR e CPC no próximo recorte equivalente.", confidence: "ALTO" });
  }
  if (highWasteKeywords.length) {
    actions.push({ priority: "ALTA", title: "Revisar keywords com gasto sem conversão", reason: `${highWasteKeywords.map((item) => `${item.label} (${brl(item.cost)})`).join(", ")} concentraram gasto sem conversão registrada no período selecionado.`, impact: "Redirecionar verba para intenções com melhor evidência.", validation: "Confirmar CRM/planilha antes de pausas; depois comparar gasto sem conversão e volume de leads.", confidence: "MÉDIO" });
  }
  if (expensiveNoConversionTerms.length) {
    actions.push({ priority: "ALTA", title: "Revisar negativas e correspondências", reason: `Os termos sem conversão de maior custo incluem ${expensiveNoConversionTerms.slice(0, 5).map((item) => `“${item.label}”`).join(", ")}.`, impact: "Reduzir buscas desalinhadas sem cortar intenção válida.", validation: "Negativar apenas buscas claramente inadequadas e comparar o mix de termos no próximo período.", confidence: "ALTO" });
  }
  if (lowQuality.length) {
    actions.push({ priority: "ALTA", title: "Melhorar relevância keyword → anúncio → landing page", reason: `${lowQuality.length} keyword(s) habilitada(s) têm Quality Score ≤ 4 no snapshot atual.`, impact: "Melhorar Ad Rank e reduzir pressão sobre CPC.", validation: "Comparar snapshots futuros de QS com Lost IS Rank, CTR e CPC.", confidence: "ALTO" });
  }
  if (currentDailyBudget && lastWindowBudgetCapacity && lastWindow.cost < lastWindowBudgetCapacity * 0.65 && latestAuction?.rankLost != null && latestAuction.rankLost > 0.4) {
    actions.push({ priority: "MÉDIA", title: "Não aumentar orçamento antes de recuperar ranking", reason: `Nos últimos ${windowDays} dia(s) do recorte foram gastos ${brl(lastWindow.cost)} de uma capacidade teórica de ${brl(lastWindowBudgetCapacity)}, enquanto a perda por ranking segue elevada.`, impact: "Evitar escalar uma estrutura limitada por competitividade/relevância.", validation: "Reconsiderar escala quando Lost IS Rank cair e CPA/CVR melhorarem.", confidence: "ALTO" });
  }
  if (heavyZeroConvHours.length) {
    actions.push({ priority: "MÉDIA", title: "Revisar horários com cautela", reason: `${heavyZeroConvHours.map((item) => item.label).join(", ")} concentram gasto sem conversão no período selecionado.`, impact: "Identificar desperdício marginal sem reagir a amostras pequenas.", validation: "Comparar pelo menos mais um período equivalente antes de cortes fortes.", confidence: "MÉDIO" });
  }
  if (deviceZeroConv.length) {
    actions.push({ priority: "TESTE", title: "Investigar diferenças por dispositivo", reason: `${deviceZeroConv.map((item) => item.label).join(", ")} consumiu parcela relevante da verba sem conversão registrada.`, impact: "Separar problema de intenção, custo e experiência pós-clique.", validation: "Comparar CPC, CVR e landing page por dispositivo antes de aplicar exclusões.", confidence: "MÉDIO" });
  }
  if (!actions.length) {
    actions.push({ priority: "TESTE", title: "Preservar estrutura e acumular evidência", reason: "O período selecionado não apresenta sinal forte suficiente para uma intervenção estrutural automática.", impact: "Evitar mudanças precipitadas com baixo volume.", validation: "Reavaliar quando houver mais cliques/conversões ou selecionar um intervalo maior.", confidence: "BAIXO" });
  }

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

  const summary: string[] = [];
  if (current.impressions === 0 && current.clicks === 0) summary.push("Não há entrega registrada no período selecionado.");
  if (previous.conversions > 0 && conversionsDelta != null && conversionsDelta <= -30) summary.push(`Conversões caíram ${Math.abs(conversionsDelta).toFixed(1).replace(".", ",")}% frente ao período anterior equivalente.`);
  if (cpcDelta != null && cpcDelta >= 20) summary.push(`O CPC subiu ${cpcDelta.toFixed(1).replace(".", ",")}% e aumentou a pressão de custo.`);
  if (cvrDelta != null && cvrDelta <= -25) summary.push(`A taxa de conversão caiu ${Math.abs(cvrDelta).toFixed(1).replace(".", ",")}% e indica perda de eficiência pós-clique ou de qualidade do tráfego.`);
  if (latestAuction?.rankLost != null && latestAuction.rankLost > (latestAuction.budgetLost || 0)) summary.push(`No leilão mais recente do recorte, a perda por ranking (${ratioPercent(latestAuction.rankLost)}) supera a perda por orçamento (${ratioPercent(latestAuction.budgetLost)}).`);
  if (importantEventDays[0]?.count && importantEventDays[0].count >= 10) summary.push(`${formatDate(importantEventDays[0].date)} concentrou ${importantEventDays[0].count} alterações na conta e merece correlação com a curva de performance.`);
  if (!summary.length) summary.push("O recorte não apresenta uma ruptura forte isolada; as decisões devem considerar volume, tendência e qualidade das conversões.");

  const outsideAvailableRange = currentStart < earliestObserved || currentEnd > latestObserved;

  return (
    <div className={embedded ? "dashboard-page" : "admin-page"} style={{ padding: embedded ? "24px" : "clamp(14px, 3vw, 32px)", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        {!embedded ? <Link href="/admin/google-ads-api/analysis" style={{ width: 40, height: 40, borderRadius: 9, background: "#F1F5F9", color: "#475569", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={19} /></Link> : null}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}><h1 style={{ fontSize: 24, fontWeight: 760, color: "#0F172A" }}>Análise de Performance · Google Ads</h1><span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 9px", background: "#EEF2FF", color: "#4338CA" }}>ADMIN</span></div>
          <p style={{ marginTop: 5, color: "#64748B", fontSize: 14 }}>{client?.name || source.name} · {googleSource?.customer_name || "Conta Google Ads"} ({googleSource?.customer_id || "ID n/d"})</p>
          <p style={{ marginTop: 4, color: "#64748B", fontSize: 12 }}><strong>Período selecionado:</strong> {formatDate(currentStart)}–{formatDate(currentEnd)} · <strong>comparação:</strong> {formatDate(previousStart)}–{formatDate(previousEnd)} ({periodDays} dia(s) em cada período)</p>
          <p style={{ marginTop: 3, color: "#94A3B8", fontSize: 11 }}>Dados disponíveis: {formatDate(earliestObserved)}–{formatDate(latestObserved)} · última sincronização: {formatDateTime(googleSource?.last_import_at)}</p>
          {outsideAvailableRange ? <p style={{ marginTop: 5, color: "#B45309", fontSize: 11, fontWeight: 650 }}>Parte do filtro selecionado está fora da janela histórica disponível na API; os cálculos usam somente os fatos existentes dentro do intervalo.</p> : null}
        </div>
        {!embedded && dashboard?.id ? <Link href={`/app/dashboards/${dashboard.id}/performance-analysis?from=${currentStart}&to=${currentEnd}`} style={{ padding: "9px 12px", borderRadius: 8, background: "#EFF6FF", color: "#1D4ED8", textDecoration: "none", fontWeight: 700, fontSize: 12 }}>Abrir no dashboard</Link> : null}
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 18, borderLeft: "4px solid #DC2626" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><ShieldAlert size={22} color="#DC2626" style={{ flex: "0 0 auto", marginTop: 1 }} /><div><h2 style={{ fontSize: 17, fontWeight: 760 }}>Resumo executivo</h2><p style={{ marginTop: 7, fontSize: 14, lineHeight: 1.65, color: "#475569" }}>{summary.join(" ")}</p></div></div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
        {metricCards.map((item) => <div className="card" key={item.label} style={{ padding: 16 }}><p style={{ fontSize: 11, color: "#64748B", fontWeight: 650 }}>{item.label}</p><p style={{ marginTop: 5, fontSize: 21, fontWeight: 760 }}>{item.value}</p><div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: deltaColor(item.delta, item.inverse) }}>{(item.delta || 0) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{item.delta == null ? "sem base" : `${item.delta >= 0 ? "+" : ""}${item.delta.toFixed(1).replace(".", ",")}%`} <span style={{ fontWeight: 500, color: "#94A3B8" }}>vs. período anterior</span></div></div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(280px,.8fr)", gap: 18, marginBottom: 18 }} className="admin-two-col">
        <section className="card" style={{ padding: 22, overflow: "hidden" }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Gauge size={19} color="#7C3AED" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Leilão e participação de impressões</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Médias ponderadas por impressões dentro do período selecionado.</p></div></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Trecho</th><th>Impr.</th><th>Search IS</th><th>Perda orçamento</th><th>Perda ranking</th></tr></thead><tbody>{auction.map((row) => <tr key={`${row.start}:${row.end}`} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{formatDate(row.start)}–{formatDate(row.end)}</td><td>{integer(row.impressions)}</td><td>{ratioPercent(row.sis)}</td><td>{ratioPercent(row.budgetLost)}</td><td style={{ color: row.rankLost != null && row.budgetLost != null && row.rankLost > row.budgetLost ? "#B91C1C" : "#475569", fontWeight: row.rankLost != null && row.budgetLost != null && row.rankLost > row.budgetLost ? 700 : 400 }}>{ratioPercent(row.rankLost)}</td></tr>)}</tbody></table></div></section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><BadgeDollarSign size={19} color="#059669" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Configuração observada</h2></div><p style={{ fontSize: 11, color: "#64748B" }}>Orçamento diário atual</p><p style={{ marginTop: 3, fontSize: 20, fontWeight: 750 }}>{brl(currentDailyBudget)}</p><p style={{ marginTop: 13, fontSize: 11, color: "#64748B" }}>Estratégia de lances atual</p><p style={{ marginTop: 3, fontSize: 14, fontWeight: 700 }}>{biddingStrategy}</p><p style={{ marginTop: 13, fontSize: 11, color: "#94A3B8" }}>Configurações são snapshots atuais e não são retrodatadas para o período selecionado.</p></section>
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Target size={19} color="#DC2626" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Keywords · decisão operacional</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Somente o período selecionado. Validar CRM/planilha antes de pausas definitivas.</p></div></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Keyword</th><th>Tipo</th><th>Cliques</th><th>Custo</th><th>Conv.</th><th>CPC</th><th>CPA</th><th>Leitura</th></tr></thead><tbody>{keywords.filter((item) => item.cost > 0).slice(0, 20).map((item) => { const high = highWasteKeywords.includes(item); const medium = mediumWasteKeywords.includes(item); const reading = item.conversions > 0 ? "Manter e otimizar" : high ? "Revisar / reduzir" : medium ? "Monitorar de perto" : "Monitorar"; return <tr key={item.key} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{item.label}</td><td>{item.detail}</td><td>{integer(item.clicks)}</td><td>{brl(item.cost)}</td><td>{integer(item.conversions)}</td><td>{brl(item.cpc)}</td><td>{brl(item.cpa)}</td><td style={{ fontWeight: 700, color: item.conversions > 0 ? "#047857" : high ? "#B91C1C" : medium ? "#92400E" : "#475569" }}>{reading}</td></tr>; })}</tbody></table></div></section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Search size={19} color="#EA580C" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Termos de pesquisa → keyword responsável</h2><p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Ordenados por custo no período selecionado.</p></div></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Termo pesquisado</th><th>Keyword acionadora</th><th>Cliques</th><th>Custo</th><th>Conv.</th></tr></thead><tbody>{terms.filter((item) => item.cost > 0).slice(0, 25).map((item) => <tr key={item.key} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{item.label}</td><td style={{ color: "#64748B" }}>{item.detail}</td><td>{integer(item.clicks)}</td><td>{brl(item.cost)}</td><td>{integer(item.conversions)}</td></tr>)}</tbody></table></div></section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, marginBottom: 18 }}>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Smartphone size={19} color="#2563EB" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Dispositivos</h2></div>{devices.map((item) => <div key={item.key} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 5, padding: "9px 0", borderTop: "1px solid #E2E8F0" }}><div><strong style={{ fontSize: 12 }}>{item.label}</strong><p style={{ fontSize: 11, color: "#64748B" }}>{integer(item.clicks)} cliques · {integer(item.conversions)} conv.</p></div><div style={{ textAlign: "right" }}><strong style={{ fontSize: 12 }}>{brl(item.cost)}</strong><p style={{ fontSize: 11, color: "#64748B" }}>CPC {brl(item.cpc)}</p></div></div>)}</section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Clock3 size={19} color="#7C3AED" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Horários</h2></div>{hours.slice(0, 10).map((item) => <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid #E2E8F0", fontSize: 12 }}><span><strong>{item.label}</strong> · {integer(item.conversions)} conv.</span><strong>{brl(item.cost)}</strong></div>)}</section>
        <section className="card" style={{ padding: 22 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><MousePointerClick size={19} color="#059669" /><h2 style={{ fontSize: 16, fontWeight: 720 }}>Anúncios</h2></div>{ads.slice(0, 8).map((item) => <div key={item.key} style={{ padding: "9px 0", borderTop: "1px solid #E2E8F0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 12 }}>AD {item.label}</strong><span style={{ fontSize: 12, fontWeight: 650 }}>{brl(item.cost)}</span></div><p style={{ fontSize: 11, color: "#64748B" }}>{item.detail} · {integer(item.clicks)} cliques · {integer(item.conversions)} conv.</p></div>)}</section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18, marginBottom: 18 }}>
        <section className="card" style={{ padding: 22 }}><h2 style={{ fontSize: 16, fontWeight: 720, marginBottom: 12 }}>Landing pages</h2>{landingPages.slice(0, 8).map((item) => <div key={item.key} style={{ padding: "8px 0", borderTop: "1px solid #E2E8F0" }}><p style={{ fontSize: 11, fontWeight: 650, overflowWrap: "anywhere" }}>{item.label}</p><p style={{ fontSize: 11, color: "#64748B" }}>{integer(item.clicks)} cliques · {brl(item.cost)} · {integer(item.conversions)} conv.</p></div>)}</section>
        <section className="card" style={{ padding: 22 }}><h2 style={{ fontSize: 16, fontWeight: 720, marginBottom: 12 }}>Ações de conversão</h2>{conversionsByAction.length ? conversionsByAction.map((item) => <div key={item.key} style={{ padding: "8px 0", borderTop: "1px solid #E2E8F0" }}><p style={{ fontSize: 12, fontWeight: 650 }}>{item.label}</p><p style={{ fontSize: 11, color: "#64748B" }}>{integer(item.conversions)} conversões · {brl(item.cost)} de custo atribuído</p></div>) : <p style={{ fontSize: 12, color: "#64748B" }}>Sem detalhamento de ações de conversão neste recorte.</p>}</section>
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><Crosshair size={19} color="#B45309" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Quality Score e relevância</h2><p style={{ fontSize: 11, color: "#64748B" }}>Snapshot atual; não representa necessariamente o estado histórico do período filtrado.</p></div></div>{lowQuality.length === 0 ? <p style={{ fontSize: 13, color: "#64748B" }}>Nenhuma keyword habilitada com Quality Score ≤ 4 no snapshot atual.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ color: "#64748B", textAlign: "left" }}><th style={{ padding: "8px 7px" }}>Keyword</th><th>QS</th><th>CTR previsto</th><th>Criativo</th><th>Pós-clique</th></tr></thead><tbody>{lowQuality.slice(0, 15).map((item, index) => <tr key={`${item.keyword}:${index}`} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: "9px 7px", fontWeight: 650 }}>{item.keyword} · {item.matchType}</td><td style={{ fontWeight: 750, color: (item.score || 10) <= 3 ? "#B91C1C" : "#B45309" }}>{item.score ?? "—"}</td><td>{item.predictedCtr}</td><td>{item.creative}</td><td>{item.postClick}</td></tr>)}</tbody></table></div>}</section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}><History size={19} color="#475569" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Alterações na conta dentro do período</h2><p style={{ fontSize: 11, color: "#64748B" }}>Change Events têm retenção limitada pela Google Ads API.</p></div></div>{importantEventDays.length === 0 ? <p style={{ fontSize: 13, color: "#64748B" }}>Nenhuma alteração disponível para este intervalo. Em períodos antigos isso pode refletir a janela de retenção da API, e não ausência de mudanças.</p> : <div style={{ display: "grid", gap: 10 }}>{importantEventDays.map((day) => <div key={day.date} style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: 13 }}>{formatDate(day.date)}</strong><span style={{ fontSize: 12, fontWeight: 750, color: day.count >= 20 ? "#B91C1C" : "#475569" }}>{day.count} alteração(ões)</span></div><p style={{ marginTop: 5, fontSize: 11, color: "#64748B" }}>{day.types.slice(0, 6).map(([type, count]) => `${type}: ${count}`).join(" · ")}</p></div>)}</div>}</section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><AlertTriangle size={19} color="#DC2626" /><div><h2 style={{ fontSize: 16, fontWeight: 720 }}>Plano de ação priorizado</h2><p style={{ fontSize: 11, color: "#64748B" }}>Recalculado automaticamente a partir do período selecionado e do período anterior equivalente.</p></div></div><div style={{ display: "grid", gap: 11 }}>{actions.map((item, index) => { const style = priorityStyle(item.priority); return <div key={`${item.title}:${index}`} style={{ border: `1px solid ${style.border}`, borderRadius: 10, padding: 14, background: style.background }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 10, fontWeight: 800, color: style.color }}>{item.priority}</span><strong style={{ fontSize: 13 }}>{item.title}</strong><span style={{ marginLeft: "auto", fontSize: 10, color: "#64748B" }}>Confiança {item.confidence}</span></div><p style={{ marginTop: 6, fontSize: 12, lineHeight: 1.55, color: "#475569" }}><strong>Motivo:</strong> {item.reason}</p><p style={{ marginTop: 3, fontSize: 12, lineHeight: 1.55, color: "#475569" }}><strong>Impacto:</strong> {item.impact}</p><p style={{ marginTop: 3, fontSize: 12, lineHeight: 1.55, color: "#475569" }}><strong>Validação:</strong> {item.validation}</p></div>; })}</div></section>
    </div>
  );
}
