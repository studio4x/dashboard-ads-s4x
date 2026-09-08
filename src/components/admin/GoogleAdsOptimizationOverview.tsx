import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Crosshair,
  Eye,
  Gauge,
  Lightbulb,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsTrendExplorer, type GoogleAdsTrendPoint } from "./GoogleAdsTrendExplorer";

type Props = {
  sourceId: string;
  from?: string | null;
  to?: string | null;
  embedded?: boolean;
};

type JsonObject = Record<string, unknown>;
type Row = {
  observed_date: string;
  dimensions: JsonObject | null;
  metrics: JsonObject | null;
};

type Totals = {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cvr: number;
  cpa: number | null;
};

type Auction = {
  searchImpressionShare: number | null;
  budgetLost: number | null;
  rankLost: number | null;
};

type HealthLevel = "critical" | "attention" | "healthy" | "unknown";

type HealthItem = {
  label: string;
  level: HealthLevel;
  detail: string;
};

const PAGE_SIZE = 1000;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function numeric(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function metric(row: Row, key: string): number {
  return numeric(object(row.metrics)[key]);
}

function dimension(row: Row, key: string): string {
  const value = object(row.dimensions)[key];
  return value == null ? "" : String(value);
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function daysInclusive(start: string, end: string) {
  const a = new Date(`${start}T12:00:00Z`).getTime();
  const b = new Date(`${end}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00Z`).getTime());
}

function localToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00Z`));
}

function brl(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function integer(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

function ratioPercent(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return percent(value * 100, digits);
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sourceId: string,
  dataset: string,
  start: string,
  end: string,
) {
  const rows: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("google_ads_analytics_rows")
      .select("observed_date,dimensions,metrics")
      .eq("data_source_id", sourceId)
      .eq("dataset", dataset)
      .gte("observed_date", start)
      .lte("observed_date", end)
      .order("observed_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as Row[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

function aggregate(rows: Row[], start: string, end: string): Totals {
  const selected = rows.filter((row) => row.observed_date >= start && row.observed_date <= end);
  const impressions = selected.reduce((sum, row) => sum + metric(row, "impressions"), 0);
  const clicks = selected.reduce((sum, row) => sum + metric(row, "clicks"), 0);
  const cost = selected.reduce((sum, row) => sum + metric(row, "costMicros") / 1_000_000, 0);
  const conversions = selected.reduce((sum, row) => sum + metric(row, "conversions"), 0);
  return {
    cost,
    impressions,
    clicks,
    conversions,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? cost / clicks : 0,
    cvr: clicks ? conversions / clicks * 100 : 0,
    cpa: conversions ? cost / conversions : null,
  };
}

function weightedAuction(rows: Row[], start: string, end: string): Auction {
  const selected = rows.filter((row) => row.observed_date >= start && row.observed_date <= end);
  const keys = [
    ["searchImpressionShare", "searchImpressionShare"],
    ["searchBudgetLostImpressionShare", "budgetLost"],
    ["searchRankLostImpressionShare", "rankLost"],
  ] as const;
  const buckets = new Map<string, { sum: number; weight: number }>();
  for (const [, target] of keys) buckets.set(target, { sum: 0, weight: 0 });

  for (const row of selected) {
    const impressions = metric(row, "impressions");
    if (impressions <= 0) continue;
    for (const [source, target] of keys) {
      const raw = object(row.metrics)[source];
      if (raw == null) continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      const bucket = buckets.get(target)!;
      bucket.sum += value * impressions;
      bucket.weight += impressions;
    }
  }

  const value = (key: string) => {
    const bucket = buckets.get(key)!;
    return bucket.weight ? bucket.sum / bucket.weight : null;
  };

  return {
    searchImpressionShare: value("searchImpressionShare"),
    budgetLost: value("budgetLost"),
    rankLost: value("rankLost"),
  };
}

function monday(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  const day = parsed.getUTCDay();
  parsed.setUTCDate(parsed.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return parsed.toISOString().slice(0, 10);
}

function weeklyTrend(rows: Row[], start: string, end: string): GoogleAdsTrendPoint[] {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    if (row.observed_date < start || row.observed_date > end) continue;
    const key = monday(row.observed_date);
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, weekRows]) => {
      const totals = aggregate(weekRows, week, addDays(week, 6));
      const auction = weightedAuction(weekRows, week, addDays(week, 6));
      return {
        label: formatDate(week),
        impressions: totals.impressions,
        clicks: totals.clicks,
        ctr: totals.ctr,
        cpc: totals.cpc,
        conversions: totals.conversions,
        cvr: totals.cvr,
        cpa: totals.cpa,
        rankLost: auction.rankLost == null ? null : auction.rankLost * 100,
      };
    });
}

function healthStyle(level: HealthLevel) {
  if (level === "critical") return { label: "Crítico", color: "#B91C1C", background: "#FEF2F2", border: "#FECACA" };
  if (level === "attention") return { label: "Atenção", color: "#92400E", background: "#FFFBEB", border: "#FDE68A" };
  if (level === "healthy") return { label: "Saudável", color: "#047857", background: "#ECFDF5", border: "#A7F3D0" };
  return { label: "Sem base", color: "#64748B", background: "#F8FAFC", border: "#E2E8F0" };
}

function buildHealth(current: Totals, previous: Totals, auction: Auction): HealthItem[] {
  const delivery: HealthItem = auction.rankLost == null && auction.searchImpressionShare == null
    ? { label: "Entrega", level: "unknown", detail: "Sem dados de leilão suficientes." }
    : auction.rankLost != null && auction.rankLost >= 0.5
      ? { label: "Entrega", level: "critical", detail: `Perda por classificação em ${ratioPercent(auction.rankLost)}.` }
      : (auction.rankLost || 0) >= 0.3 || (auction.searchImpressionShare != null && auction.searchImpressionShare < 0.35)
        ? { label: "Entrega", level: "attention", detail: "Há espaço relevante sendo perdido nas buscas." }
        : { label: "Entrega", level: "healthy", detail: "Sem limitação forte de exposição no recorte recente." };

  const clickRatio = previous.clicks > 0 ? current.clicks / previous.clicks : null;
  const traffic: HealthItem = clickRatio != null && clickRatio < 0.65
    ? { label: "Tráfego", level: "critical", detail: `${Math.abs(100 - clickRatio * 100).toFixed(0)}% menos cliques que no período anterior.` }
    : clickRatio != null && clickRatio < 0.9
      ? { label: "Tráfego", level: "attention", detail: "Volume de cliques abaixo do período anterior." }
      : current.clicks < 10
        ? { label: "Tráfego", level: "attention", detail: "Volume ainda pequeno para decisões fortes." }
        : { label: "Tráfego", level: "healthy", detail: "Volume de cliques sem queda relevante." };

  const conversion: HealthItem = current.clicks >= 5 && current.conversions === 0
    ? { label: "Conversão", level: "critical", detail: "Houve acessos, mas nenhuma conversão registrada." }
    : previous.cvr > 0 && current.cvr < previous.cvr * 0.6
      ? { label: "Conversão", level: "critical", detail: "A taxa de conversão caiu de forma relevante." }
      : current.conversions < 3
        ? { label: "Conversão", level: "attention", detail: "Poucas conversões para concluir por segmentos." }
        : { label: "Conversão", level: "healthy", detail: "Conversão sem sinal crítico no período." };

  let efficiency: HealthItem;
  if (current.cpa != null && previous.cpa != null && current.cpa > previous.cpa * 1.5) {
    efficiency = { label: "Eficiência", level: "critical", detail: `CPA em ${brl(current.cpa)}, bem acima do período anterior.` };
  } else if (previous.cpc > 0 && current.cpc > previous.cpc * 1.3) {
    efficiency = { label: "Eficiência", level: "attention", detail: "O custo por clique está pressionando a eficiência." };
  } else if (current.conversions === 0 && current.cost > 0) {
    efficiency = { label: "Eficiência", level: "attention", detail: "Ainda não há conversão para calcular CPA." };
  } else {
    efficiency = { label: "Eficiência", level: "healthy", detail: "Sem piora forte de custo no recorte." };
  }

  return [delivery, traffic, conversion, efficiency];
}

function diagnosis(current: Totals, previous: Totals, auction: Auction) {
  const impressionsDelta = pctChange(current.impressions, previous.impressions);
  const clicksDelta = pctChange(current.clicks, previous.clicks);
  const ctrDelta = pctChange(current.ctr, previous.ctr);
  const cvrDelta = pctChange(current.cvr, previous.cvr);

  if (auction.rankLost != null && auction.rankLost >= 0.4 && auction.rankLost > (auction.budgetLost || 0)) {
    return {
      title: "A campanha está perdendo espaço nas buscas",
      text: `A perda por classificação chegou a ${ratioPercent(auction.rankLost)}, enquanto a perda por orçamento ficou em ${ratioPercent(auction.budgetLost)}. O gargalo atual está mais ligado à relevância e à capacidade de disputar os leilões do que à falta de verba.`,
      confidence: "Alta",
    };
  }
  if (auction.budgetLost != null && auction.budgetLost >= 0.35 && auction.budgetLost > (auction.rankLost || 0)) {
    return {
      title: "O orçamento está limitando a entrega",
      text: `A perda por orçamento está em ${ratioPercent(auction.budgetLost)} e supera a perda por classificação. Antes de escalar, ainda é importante confirmar se o tráfego e as conversões mantêm eficiência.`,
      confidence: "Alta",
    };
  }
  if ((impressionsDelta || 0) <= -25 && (clicksDelta || 0) <= -30) {
    return {
      title: "A principal ruptura está no volume de tráfego",
      text: "A campanha passou a gerar menos impressões e cliques. Com menos oportunidades chegando ao site, o potencial de conversão também cai, mesmo antes de avaliar a qualidade pós-clique.",
      confidence: "Alta",
    };
  }
  if (cvrDelta != null && cvrDelta <= -35) {
    return {
      title: "O maior gargalo está depois do clique",
      text: "A campanha ainda consegue gerar acessos, mas a taxa de conversão perdeu força. Isso pede investigação de qualidade do tráfego, oferta, página e rastreamento antes de aumentar investimento.",
      confidence: "Média",
    };
  }
  if (ctrDelta != null && ctrDelta <= -25) {
    return {
      title: "Os anúncios estão atraindo menos cliques",
      text: "A taxa de cliques caiu de forma relevante. O primeiro foco deve ser mensagem, aderência entre busca e anúncio e qualidade das consultas acionadas.",
      confidence: "Média",
    };
  }
  return {
    title: "Não há um único gargalo dominante",
    text: "O período não mostra uma ruptura isolada suficientemente forte. A melhor decisão é atuar nos sinais mais consistentes e validar a resposta antes de mudanças maiores.",
    confidence: "Média",
  };
}

function normalizeTerm(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function classifyTerm(label: string, clicks: number, cost: number, conversions: number, totalCost: number) {
  if (conversions > 0) return { label: "Com resultado", color: "#047857", background: "#ECFDF5" };
  const term = normalizeTerm(label);
  const lowIntent = ["gratis", "gratuito", "vaga", "emprego", "curso", "faculdade", "salario", "pdf", "o que e", "significado", "teste", "modelo", "exemplo", "30 reais", "barato", "barata"];
  if (lowIntent.some((token) => term.includes(token))) {
    return { label: "Baixa intenção", color: "#B91C1C", background: "#FEF2F2" };
  }
  const highIntent = ["orcamento", "agendar", "consulta", "contratar", "comprar", "preco", "perto de mim", "proximo", "telefone", "whatsapp"];
  if (highIntent.some((token) => term.includes(token))) {
    return { label: "Alta intenção provável", color: "#047857", background: "#ECFDF5" };
  }
  if (clicks >= 3 || cost >= Math.max(10, totalCost * 0.05)) {
    return { label: "Revisar", color: "#92400E", background: "#FFFBEB" };
  }
  return { label: "Poucos dados", color: "#64748B", background: "#F8FAFC" };
}

function eventTypeLabel(value: string) {
  const labels: Record<string, string> = {
    AD_GROUP_CRITERION: "palavras-chave/critérios",
    CAMPAIGN_CRITERION: "segmentações",
    AD_GROUP_AD: "anúncios",
    AD_GROUP: "grupos de anúncios",
    CAMPAIGN: "campanha",
    ASSET: "recursos",
    AD_GROUP_ASSET: "recursos do grupo",
    CAMPAIGN_ASSET: "recursos da campanha",
    CAMPAIGN_BUDGET: "orçamento",
  };
  return labels[value] || value.toLowerCase().replaceAll("_", " ");
}

function snapshotTotals(value: unknown): Totals | null {
  const data = object(value);
  if (!Object.keys(data).length) return null;
  return {
    cost: numeric(data.cost),
    impressions: numeric(data.impressions),
    clicks: numeric(data.clicks),
    conversions: numeric(data.conversions),
    ctr: numeric(data.ctr),
    cpc: numeric(data.cpc),
    cvr: numeric(data.cvr),
    cpa: data.cpa == null ? null : numeric(data.cpa),
  };
}

function changeItems(current: Totals, base: Totals, currentAuction: Auction, baseAuction: Auction | null) {
  const definitions = [
    { label: "Cliques", current: current.clicks, previous: base.clicks, inverse: false, format: integer },
    { label: "Taxa de cliques", current: current.ctr, previous: base.ctr, inverse: false, format: (v: number) => percent(v, 2) },
    { label: "Custo por clique", current: current.cpc, previous: base.cpc, inverse: true, format: brl },
    { label: "Conversões", current: current.conversions, previous: base.conversions, inverse: false, format: integer },
    { label: "Taxa de conversão", current: current.cvr, previous: base.cvr, inverse: false, format: (v: number) => percent(v, 2) },
  ];

  const result = definitions
    .map((item) => ({ ...item, delta: pctChange(item.current, item.previous) }))
    .filter((item) => item.delta != null && (item.current !== item.previous || item.current !== 0))
    .sort((a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0))
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      value: item.format(item.current as never),
      delta: item.delta || 0,
      good: item.inverse ? (item.delta || 0) < 0 : (item.delta || 0) > 0,
    }));

  if (currentAuction.rankLost != null && baseAuction?.rankLost != null) {
    const deltaPoints = (currentAuction.rankLost - baseAuction.rankLost) * 100;
    result.push({
      label: "Perda por classificação",
      value: ratioPercent(currentAuction.rankLost),
      delta: deltaPoints,
      good: deltaPoints < 0,
    });
  }

  return result.slice(0, 4);
}

export async function GoogleAdsOptimizationOverview({ sourceId, from, to, embedded = false }: Props) {
  const supabase = await createAdminClient();
  const [{ data: source }, { data: latest }] = await Promise.all([
    supabase.from("data_sources").select("id,client_id,dashboard_id,name").eq("id", sourceId).eq("type", "google_ads").maybeSingle(),
    supabase.from("google_ads_analytics_rows").select("observed_date").eq("data_source_id", sourceId).eq("dataset", "campaign_daily").order("observed_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!source || !latest?.observed_date) return null;

  const latestObserved = String(latest.observed_date);
  const today = localToday();
  const defaultEnd = latestObserved >= today ? addDays(today, -1) : latestObserved;
  const hasExplicitRange = isIsoDate(from) && isIsoDate(to) && from <= to;
  const currentStart = hasExplicitRange ? from : addDays(defaultEnd, -29);
  const currentEnd = hasExplicitRange ? to : defaultEnd;
  const periodDays = daysInclusive(currentStart, currentEnd);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(periodDays - 1));
  const trendStart = addDays(currentEnd, -55);
  const dataStart = previousStart < trendStart ? previousStart : trendStart;
  const recentStart = addDays(currentEnd, -(Math.min(7, periodDays) - 1));
  const eventStart = addDays(currentEnd, -29);

  const [campaignRows, keywordRows, termRows, changeEventsResult, previousSnapshotResult, progressResult] = await Promise.all([
    fetchRows(supabase, sourceId, "campaign_daily", dataStart, currentEnd),
    fetchRows(supabase, sourceId, "keyword_daily", currentStart, currentEnd),
    fetchRows(supabase, sourceId, "search_terms_daily", currentStart, currentEnd),
    supabase.from("google_ads_change_events").select("change_date_time,change_resource_type,operation").eq("data_source_id", sourceId).gte("change_date_time", `${eventStart}T00:00:00Z`).lt("change_date_time", `${addDays(currentEnd, 1)}T00:00:00Z`).order("change_date_time", { ascending: false }).limit(1000),
    supabase.from("google_ads_analysis_snapshots").select("period_start,period_end,metrics,auction,diagnosis,created_at").eq("data_source_id", sourceId).lt("period_end", currentEnd).order("period_end", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("google_ads_action_progress").select("status,completed").eq("data_source_id", sourceId),
  ]);

  const current = aggregate(campaignRows, currentStart, currentEnd);
  const previous = aggregate(campaignRows, previousStart, previousEnd);
  const recentAuction = weightedAuction(campaignRows, recentStart, currentEnd);
  const currentDiagnosis = diagnosis(current, previous, recentAuction);
  const health = buildHealth(current, previous, recentAuction);
  const trend = weeklyTrend(campaignRows, trendStart, currentEnd);

  const previousSnapshot = previousSnapshotResult.data || null;
  const snapshotBase = snapshotTotals(previousSnapshot?.metrics) || previous;
  const snapshotAuction = previousSnapshot?.auction ? {
    searchImpressionShare: object(previousSnapshot.auction).searchImpressionShare == null ? null : numeric(object(previousSnapshot.auction).searchImpressionShare),
    budgetLost: object(previousSnapshot.auction).budgetLost == null ? null : numeric(object(previousSnapshot.auction).budgetLost),
    rankLost: object(previousSnapshot.auction).rankLost == null ? null : numeric(object(previousSnapshot.auction).rankLost),
  } : weightedAuction(campaignRows, previousStart, previousEnd);
  const changes = changeItems(current, snapshotBase, recentAuction, snapshotAuction);

  await supabase.from("google_ads_analysis_snapshots").upsert({
    data_source_id: sourceId,
    period_start: currentStart,
    period_end: currentEnd,
    period_days: periodDays,
    metrics: current,
    auction: recentAuction,
    diagnosis: currentDiagnosis.title,
    health: Object.fromEntries(health.map((item) => [item.label, item.level])),
    updated_at: new Date().toISOString(),
  }, { onConflict: "data_source_id,period_start,period_end" });

  const keywordMap = new Map<string, { label: string; match: string; clicks: number; cost: number; conversions: number }>();
  for (const row of keywordRows) {
    const label = dimension(row, "keywordText");
    if (!label) continue;
    const match = dimension(row, "keywordMatchType");
    const key = `${label}:${match}`;
    const item = keywordMap.get(key) || { label, match, clicks: 0, cost: 0, conversions: 0 };
    item.clicks += metric(row, "clicks");
    item.cost += metric(row, "costMicros") / 1_000_000;
    item.conversions += metric(row, "conversions");
    keywordMap.set(key, item);
  }
  const keywordItems = Array.from(keywordMap.values()).sort((a, b) => b.cost - a.cost);
  const keywordWaste = keywordItems.filter((item) => item.conversions === 0 && item.cost > 0);

  const termMap = new Map<string, { label: string; matched: string; clicks: number; cost: number; conversions: number }>();
  for (const row of termRows) {
    const label = dimension(row, "searchTerm");
    if (!label) continue;
    const matched = dimension(row, "matchedKeywordText");
    const key = `${label}:${matched}`;
    const item = termMap.get(key) || { label, matched, clicks: 0, cost: 0, conversions: 0 };
    item.clicks += metric(row, "clicks");
    item.cost += metric(row, "costMicros") / 1_000_000;
    item.conversions += metric(row, "conversions");
    termMap.set(key, item);
  }
  const termItems = Array.from(termMap.values()).sort((a, b) => b.cost - a.cost);
  const termsWithoutConversion = termItems.filter((item) => item.conversions === 0 && item.cost > 0);
  const identifiedTermSpend = termsWithoutConversion.reduce((sum, item) => sum + item.cost, 0);

  const benchmarkCpa = previous.cpa || current.cpa;
  const bestKeyword = keywordItems
    .filter((item) => item.conversions > 0)
    .map((item) => ({ ...item, cpa: item.cost / item.conversions }))
    .sort((a, b) => a.cpa - b.cpa)[0] || null;

  let scaleText = "Ainda não há evidência suficiente para aumentar orçamento. Primeiro, recupere entrega e eficiência.";
  let scaleLevel: "positive" | "neutral" = "neutral";
  if (current.conversions >= 2 && recentAuction.budgetLost != null && recentAuction.budgetLost > 0.2 && recentAuction.budgetLost > (recentAuction.rankLost || 0) && current.cpa != null && (previous.cpa == null || current.cpa <= previous.cpa * 1.1)) {
    scaleText = "Há sinal de escala: a campanha converte com eficiência e perde mais espaço por orçamento do que por classificação. Considere aumento gradual.";
    scaleLevel = "positive";
  } else if (bestKeyword && benchmarkCpa && bestKeyword.conversions >= 2 && bestKeyword.cpa <= benchmarkCpa * 0.8) {
    scaleText = `A palavra-chave “${bestKeyword.label}” tem sinal de eficiência acima da média. Vale testar maior concentração de verba antes de escalar a campanha inteira.`;
    scaleLevel = "positive";
  }

  const events = changeEventsResult.data || [];
  const eventDays = new Map<string, { count: number; types: Map<string, number> }>();
  for (const event of events) {
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(event.change_date_time));
    const item = eventDays.get(date) || { count: 0, types: new Map<string, number>() };
    item.count += 1;
    const type = String(event.change_resource_type || "OUTRO");
    item.types.set(type, (item.types.get(type) || 0) + 1);
    eventDays.set(date, item);
  }
  const relevantChange = Array.from(eventDays.entries())
    .map(([date, item]) => ({ date, ...item }))
    .filter((item) => item.count >= 3)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;

  const progress = progressResult.data || [];
  const inProgress = progress.filter((item) => item.status === "in_progress").length;
  const completed = progress.filter((item) => item.status === "completed" || (item.completed && item.status !== "validated")).length;
  const validated = progress.filter((item) => item.status === "validated").length;

  const sampleWarning = current.clicks < 20 || current.conversions < 3;
  const path = embedded && source.dashboard_id
    ? `/app/dashboards/${source.dashboard_id}/performance-analysis`
    : `/admin/google-ads-api/analysis/${sourceId}`;
  const periods = [7, 14, 30, 90].map((days) => ({
    days,
    href: `${path}?from=${addDays(currentEnd, -(days - 1))}&to=${currentEnd}`,
  }));

  return (
    <div data-s4x-optimization-overview="true" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 700, marginRight: 2 }}>Período:</span>
          {periods.map((item) => (
            <Link key={item.days} href={item.href} style={{ textDecoration: "none", border: `1px solid ${periodDays === item.days ? "#93C5FD" : "#E2E8F0"}`, background: periodDays === item.days ? "#EFF6FF" : "#FFFFFF", color: periodDays === item.days ? "#1D4ED8" : "#64748B", borderRadius: 999, padding: "5px 9px", fontSize: 10.5, fontWeight: 700 }}>{item.days} dias</Link>
          ))}
          {relevantChange && relevantChange.date < currentEnd ? (
            <Link href={`${path}?from=${relevantChange.date}&to=${currentEnd}`} style={{ textDecoration: "none", border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", borderRadius: 999, padding: "5px 9px", fontSize: 10.5, fontWeight: 700 }}>Desde a última mudança relevante</Link>
          ) : null}
        </div>
        <div style={{ fontSize: 10.5, color: "#64748B" }}>
          {inProgress ? `${inProgress} em andamento · ` : ""}{completed ? `${completed} concluída(s) · ` : ""}{validated} validada(s)
        </div>
      </div>

      <section className="card" style={{ padding: 20, borderLeft: "4px solid #2563EB", marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.45fr) minmax(280px,.8fr)", gap: 18 }} className="admin-two-col">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <Crosshair size={18} color="#2563EB" />
              <span style={{ fontSize: 10, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: ".04em" }}>Diagnóstico principal</span>
            </div>
            <h2 style={{ fontSize: 19, lineHeight: 1.3, fontWeight: 780, color: "#0F172A" }}>{currentDiagnosis.title}</h2>
            <p style={{ marginTop: 7, fontSize: 13, lineHeight: 1.62, color: "#475569" }}>{currentDiagnosis.text}</p>
            <p style={{ marginTop: 8, fontSize: 10.5, color: "#94A3B8" }}>Confiança {currentDiagnosis.confidence} · diagnóstico baseado no recorte selecionado e no leilão recente.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {health.map((item) => {
              const style = healthStyle(item.level);
              return (
                <div key={item.label} style={{ border: `1px solid ${style.border}`, background: style.background, borderRadius: 10, padding: 11 }} title={item.detail}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                    <strong style={{ fontSize: 11, color: "#334155" }}>{item.label}</strong>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: style.color }}>{style.label}</span>
                  </div>
                  <p style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.35, color: "#64748B" }}>{item.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {sampleWarning ? (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px", border: "1px solid #FDE68A", background: "#FFFBEB", borderRadius: 9, marginBottom: 12 }}>
          <AlertTriangle size={15} color="#B45309" style={{ flex: "0 0 auto", marginTop: 1 }} />
          <p style={{ fontSize: 11, lineHeight: 1.45, color: "#78350F" }}><strong>Amostra pequena:</strong> {integer(current.clicks)} clique(s) e {integer(current.conversions)} conversão(ões) no período. Use horário, dispositivo e palavra-chave como sinais de investigação, não como motivo isolado para cortes fortes.</p>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, marginBottom: 12 }} className="admin-two-col">
        <section className="card" style={{ padding: 17 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Eye size={16} color="#7C3AED" /><h3 style={{ fontSize: 13, fontWeight: 760 }}>Funil do período</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr", alignItems: "center", gap: 7 }}>
            <div><p style={{ fontSize: 10, color: "#64748B" }}>Impressões</p><strong style={{ fontSize: 18 }}>{integer(current.impressions)}</strong></div>
            <ArrowRight size={14} color="#CBD5E1" />
            <div><p style={{ fontSize: 10, color: "#64748B" }}>Cliques</p><strong style={{ fontSize: 18 }}>{integer(current.clicks)}</strong><p style={{ fontSize: 9.5, color: "#94A3B8" }}>{percent(current.ctr, 2)} CTR</p></div>
            <ArrowRight size={14} color="#CBD5E1" />
            <div><p style={{ fontSize: 10, color: "#64748B" }}>Conversões Google</p><strong style={{ fontSize: 18 }}>{integer(current.conversions)}</strong><p style={{ fontSize: 9.5, color: "#94A3B8" }}>{percent(current.cvr, 2)} taxa</p></div>
            <ArrowRight size={14} color="#CBD5E1" />
            <div><p style={{ fontSize: 10, color: "#64748B" }}>Leads reais</p><strong style={{ fontSize: 12, color: "#64748B" }}>Não conciliados</strong><p style={{ fontSize: 9.5, color: "#94A3B8" }}>CRM/planilha</p></div>
          </div>
        </section>

        <section className="card" style={{ padding: 17 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}><Gauge size={16} color="#2563EB" /><h3 style={{ fontSize: 13, fontWeight: 760 }}>{previousSnapshot ? "Desde a última análise" : "Comparado ao período anterior"}</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {changes.length ? changes.map((item) => {
              const positive = item.good;
              const neutral = Math.abs(item.delta) < 0.1;
              const Icon = neutral ? ArrowRight : item.delta > 0 ? ArrowUpRight : ArrowDownRight;
              return <div key={item.label} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: 9 }}><p style={{ fontSize: 9.5, color: "#64748B" }}>{item.label}</p><div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}><strong style={{ fontSize: 13 }}>{item.value}</strong><Icon size={12} color={neutral ? "#94A3B8" : positive ? "#059669" : "#DC2626"} /><span style={{ fontSize: 9.5, color: neutral ? "#94A3B8" : positive ? "#047857" : "#B91C1C", fontWeight: 700 }}>{item.label === "Perda por classificação" ? `${item.delta > 0 ? "+" : ""}${item.delta.toFixed(1).replace(".", ",")} p.p.` : `${item.delta > 0 ? "+" : ""}${item.delta.toFixed(0)}%`}</span></div></div>;
            }) : <p style={{ fontSize: 11, color: "#64748B" }}>Ainda não há uma base anterior suficiente para comparação.</p>}
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(300px,.8fr)", gap: 12, marginBottom: 12 }} className="admin-two-col">
        <section className="card" style={{ padding: 17 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Sparkles size={16} color="#2563EB" /><div><h3 style={{ fontSize: 13, fontWeight: 760 }}>Tendência · últimas 8 semanas</h3><p style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>Um gráfico, escolha a métrica que quer investigar.</p></div></div>
          <GoogleAdsTrendExplorer points={trend} />
        </section>

        <div style={{ display: "grid", gap: 12 }}>
          <section className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CircleDollarSign size={16} color="#EA580C" /><h3 style={{ fontSize: 13, fontWeight: 760 }}>Onde revisar gasto</h3></div>
            <p style={{ marginTop: 7, fontSize: 20, fontWeight: 780, color: identifiedTermSpend > 0 ? "#9A3412" : "#334155" }}>{brl(identifiedTermSpend)}</p>
            <p style={{ marginTop: 2, fontSize: 10.5, color: "#64748B" }}>identificados em termos de pesquisa sem conversão no recorte.</p>
            {termsWithoutConversion.slice(0, 3).map((item) => {
              const classification = classifyTerm(item.label, item.clicks, item.cost, item.conversions, current.cost);
              return <div key={`${item.label}:${item.matched}`} style={{ borderTop: "1px solid #E2E8F0", paddingTop: 7, marginTop: 7 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 10.5, fontWeight: 700 }}>{item.label}</span><strong style={{ fontSize: 10.5 }}>{brl(item.cost)}</strong></div><span style={{ display: "inline-flex", marginTop: 4, padding: "2px 6px", borderRadius: 999, background: classification.background, color: classification.color, fontSize: 9, fontWeight: 800 }}>{classification.label}</span></div>;
            })}
          </section>

          <section className="card" style={{ padding: 16, border: `1px solid ${scaleLevel === "positive" ? "#A7F3D0" : "#E2E8F0"}`, background: scaleLevel === "positive" ? "#F0FDF4" : "#FFFFFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Lightbulb size={16} color={scaleLevel === "positive" ? "#059669" : "#64748B"} /><h3 style={{ fontSize: 13, fontWeight: 760 }}>Potencial de escala</h3></div>
            <p style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: "#475569" }}>{scaleText}</p>
          </section>
        </div>
      </div>

      <section className="card" style={{ padding: 17, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Search size={16} color="#EA580C" /><div><h3 style={{ fontSize: 13, fontWeight: 760 }}>Buscas e palavras-chave que pedem atenção</h3><p style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>Mostramos só os itens mais relevantes; a tabela completa fica nos detalhes técnicos.</p></div></div>
          <span style={{ fontSize: 10, color: "#64748B" }}>{keywordWaste.length} palavra(s)-chave com gasto sem conversão</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 8, marginTop: 11 }}>
          {termItems.slice(0, 3).map((item) => {
            const classification = classifyTerm(item.label, item.clicks, item.cost, item.conversions, current.cost);
            return <div key={`${item.label}:${item.matched}`} style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 11 }}>{item.label}</strong><span style={{ fontSize: 10, fontWeight: 700 }}>{brl(item.cost)}</span></div><p style={{ marginTop: 3, fontSize: 9.5, color: "#94A3B8" }}>{item.matched ? `acionada por “${item.matched}”` : "palavra-chave acionadora não identificada"}</p><span style={{ display: "inline-flex", marginTop: 5, padding: "2px 6px", borderRadius: 999, background: classification.background, color: classification.color, fontSize: 9, fontWeight: 800 }}>{classification.label}</span></div>;
          })}
          {keywordWaste.slice(0, 3).map((item) => <div key={`${item.label}:${item.match}`} style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 11 }}>{item.label}</strong><span style={{ fontSize: 10, fontWeight: 700 }}>{brl(item.cost)}</span></div><p style={{ marginTop: 3, fontSize: 9.5, color: "#94A3B8" }}>{item.match || "correspondência não disponível"} · {integer(item.clicks)} clique(s) · 0 conversões</p><span style={{ display: "inline-flex", marginTop: 5, padding: "2px 6px", borderRadius: 999, background: "#FFFBEB", color: "#92400E", fontSize: 9, fontWeight: 800 }}>Revisar eficiência</span></div>)}
        </div>
      </section>

      {relevantChange ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", border: "1px solid #E2E8F0", background: "#F8FAFC", borderRadius: 9 }}>
          <Target size={14} color="#64748B" />
          <p style={{ fontSize: 10.5, color: "#475569", lineHeight: 1.4 }}><strong>Última mudança relevante:</strong> {formatDate(relevantChange.date)} · {relevantChange.count} alterações · {Array.from(relevantChange.types.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => `${eventTypeLabel(type)} (${count})`).join(" · ")}.</p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", border: "1px solid #E2E8F0", background: "#F8FAFC", borderRadius: 9 }}><ShieldCheck size={14} color="#64748B" /><p style={{ fontSize: 10.5, color: "#64748B" }}>Nenhuma concentração relevante de alterações foi encontrada na janela recente disponível.</p></div>
      )}
    </div>
  );
}
