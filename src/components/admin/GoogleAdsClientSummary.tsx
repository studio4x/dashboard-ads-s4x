import { createAdminClient } from "@/lib/supabase/server";
import {
  generateClientPerformanceSummary,
  type ClientPerformanceSummaryInput,
} from "@/lib/ai/client-performance-summary";
import { GoogleAdsClientSummaryCard } from "./GoogleAdsClientSummaryCard";

type Props = {
  sourceId: string;
  from?: string | null;
  to?: string | null;
};

type AnalyticsRow = {
  observed_date: string;
  dimensions: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
};

type Snapshot = ClientPerformanceSummaryInput["current"];

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
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function numberMetric(row: AnalyticsRow, key: string) {
  const value = Number(row.metrics?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function nullableNumberMetric(row: AnalyticsRow, key: string) {
  const raw = row.metrics?.[key];
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function aggregate(rows: AnalyticsRow[], start: string, end: string): Snapshot {
  const selected = rows.filter((row) => row.observed_date >= start && row.observed_date <= end);
  const impressions = selected.reduce((sum, row) => sum + numberMetric(row, "impressions"), 0);
  const clicks = selected.reduce((sum, row) => sum + numberMetric(row, "clicks"), 0);
  const cost = selected.reduce((sum, row) => sum + numberMetric(row, "costMicros") / 1_000_000, 0);
  const conversions = selected.reduce((sum, row) => sum + numberMetric(row, "conversions"), 0);

  return {
    cost,
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? cost / clicks : 0,
    conversions,
    cvr: clicks ? conversions / clicks * 100 : 0,
    cpa: conversions ? cost / conversions : null,
  };
}

function weightedAuction(rows: AnalyticsRow[], start: string, end: string) {
  const selected = rows.filter((row) => row.observed_date >= start && row.observed_date <= end);
  const fields = [
    "searchImpressionShare",
    "searchBudgetLostImpressionShare",
    "searchRankLostImpressionShare",
  ] as const;
  const sums = new Map<string, { weighted: number; weight: number }>();

  for (const field of fields) sums.set(field, { weighted: 0, weight: 0 });
  for (const row of selected) {
    const impressions = numberMetric(row, "impressions");
    if (impressions <= 0) continue;
    for (const field of fields) {
      const value = nullableNumberMetric(row, field);
      if (value == null) continue;
      const bucket = sums.get(field)!;
      bucket.weighted += value * impressions;
      bucket.weight += impressions;
    }
  }

  const value = (field: typeof fields[number]) => {
    const bucket = sums.get(field)!;
    return bucket.weight ? bucket.weighted / bucket.weight : null;
  };

  return {
    searchImpressionShare: value("searchImpressionShare"),
    budgetLostImpressionShare: value("searchBudgetLostImpressionShare"),
    rankLostImpressionShare: value("searchRankLostImpressionShare"),
  };
}

function summarizeExecutedOptimizations(events: Array<{ change_resource_type: string | null }>) {
  const types = new Set(events.map((event) => String(event.change_resource_type || "").toUpperCase()));
  const result: string[] = [];

  if (types.has("AD_GROUP_CRITERION")) result.push("palavras-chave e critérios dos grupos de anúncios");
  if (types.has("CAMPAIGN_CRITERION")) result.push("segmentações e critérios da campanha");
  if (types.has("AD_GROUP_AD")) result.push("anúncios");
  if (types.has("AD_GROUP") || types.has("CAMPAIGN")) result.push("estrutura e configurações da campanha");
  if (types.has("CAMPAIGN_BUDGET")) result.push("orçamento");
  if (types.has("BIDDING_STRATEGY") || types.has("CAMPAIGN_BIDDING_STRATEGY")) result.push("estratégia de lances");
  if (["ASSET", "CAMPAIGN_ASSET", "AD_GROUP_ASSET", "CUSTOMER_ASSET"].some((type) => types.has(type))) {
    result.push("recursos dos anúncios");
  }

  return Array.from(new Set(result));
}

function buildNextActions(params: {
  current: Snapshot;
  previous: Snapshot;
  auction: ReturnType<typeof weightedAuction>;
  wasteSearchTerms: number;
}) {
  const actions: string[] = [];
  const { current, previous, auction, wasteSearchTerms } = params;

  if (previous.conversions > 0 && current.conversions < previous.conversions * 0.6) {
    actions.push("recuperar a eficiência da campanha antes de ampliar o investimento");
  }

  if (
    auction.rankLostImpressionShare != null &&
    auction.rankLostImpressionShare > 0.25 &&
    auction.rankLostImpressionShare > (auction.budgetLostImpressionShare || 0)
  ) {
    actions.push("melhorar a relevância e a presença dos anúncios nas buscas");
  }

  if (wasteSearchTerms > 0) {
    actions.push("reduzir buscas pouco alinhadas e direcionar melhor o investimento para as intenções com maior potencial");
  }

  if (previous.ctr > 0 && current.ctr < previous.ctr * 0.85) {
    actions.push("testar melhorias na comunicação dos anúncios para recuperar a taxa de cliques");
  }

  if (!actions.length) {
    actions.push("acompanhar a estabilidade da campanha e acumular mais dados antes de novas mudanças relevantes");
  }

  return Array.from(new Set(actions)).slice(0, 3);
}

async function fetchCampaignRows(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sourceId: string,
  start: string,
  end: string,
) {
  const rows: AnalyticsRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("google_ads_analytics_rows")
      .select("observed_date,dimensions,metrics")
      .eq("data_source_id", sourceId)
      .eq("dataset", "campaign_daily")
      .gte("observed_date", start)
      .lte("observed_date", end)
      .order("observed_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as AnalyticsRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

export function GoogleAdsClientSummarySkeleton() {
  return (
    <section className="card" style={{ padding: 22, marginTop: 18, marginBottom: 24, border: "1px solid #DBEAFE" }}>
      <div style={{ height: 18, width: "55%", borderRadius: 6, background: "#E2E8F0" }} />
      <div style={{ marginTop: 16, height: 118, borderRadius: 10, background: "#F1F5F9" }} />
      <p style={{ marginTop: 9, fontSize: 11, color: "#94A3B8" }}>Preparando a sugestão de mensagem para a cliente…</p>
    </section>
  );
}

export async function GoogleAdsClientSummary({ sourceId, from, to }: Props) {
  const supabase = await createAdminClient();

  const [{ data: source }, { data: latest }] = await Promise.all([
    supabase
      .from("data_sources")
      .select("id,name,client_id")
      .eq("id", sourceId)
      .eq("type", "google_ads")
      .maybeSingle(),
    supabase
      .from("google_ads_analytics_rows")
      .select("observed_date")
      .eq("data_source_id", sourceId)
      .eq("dataset", "campaign_daily")
      .order("observed_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!source || !latest?.observed_date) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("name,company_name")
    .eq("id", source.client_id)
    .maybeSingle();

  const latestObserved = String(latest.observed_date);
  const today = localToday();
  const defaultEnd = latestObserved >= today ? addDays(today, -1) : latestObserved;
  const hasExplicitRange = isIsoDate(from) && isIsoDate(to) && from <= to;
  const currentStart = hasExplicitRange ? from : addDays(defaultEnd, -29);
  const currentEnd = hasExplicitRange ? to : defaultEnd;
  const periodDays = daysInclusive(currentStart, currentEnd);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(periodDays - 1));

  const [campaignRows, eventsResult, searchTermsResult, progressResult] = await Promise.all([
    fetchCampaignRows(supabase, sourceId, previousStart, currentEnd),
    supabase
      .from("google_ads_change_events")
      .select("change_resource_type,operation,change_date_time,user_email,client_type")
      .eq("data_source_id", sourceId)
      .gte("change_date_time", `${currentStart}T00:00:00Z`)
      .lt("change_date_time", `${addDays(currentEnd, 1)}T00:00:00Z`)
      .order("change_date_time", { ascending: true })
      .limit(1000),
    supabase
      .from("google_ads_analytics_rows")
      .select("metrics")
      .eq("data_source_id", sourceId)
      .eq("dataset", "search_terms_daily")
      .gte("observed_date", currentStart)
      .lte("observed_date", currentEnd)
      .limit(3000),
    supabase
      .from("google_ads_action_progress")
      .select("action_title,status,note,completed_at,validated_at,updated_at")
      .eq("data_source_id", sourceId)
      .in("status", ["completed", "validated"])
      .gte("updated_at", `${currentStart}T00:00:00Z`)
      .lt("updated_at", `${addDays(currentEnd, 1)}T00:00:00Z`)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const current = aggregate(campaignRows, currentStart, currentEnd);
  const previous = aggregate(campaignRows, previousStart, previousEnd);
  const auction = weightedAuction(campaignRows, currentStart, currentEnd);

  const checklistOptimizations = (progressResult.data || [])
    .map((item) => String(item.action_title || "").trim())
    .filter(Boolean);
  const eventOptimizations = summarizeExecutedOptimizations(
    ((eventsResult.data || []) as Array<{ change_resource_type: string | null }>),
  );
  const executedOptimizations = checklistOptimizations.length
    ? Array.from(new Set(checklistOptimizations)).slice(0, 5)
    : eventOptimizations;

  const wasteSearchTerms = (searchTermsResult.data || []).filter((row: any) => {
    const metrics = row?.metrics || {};
    const cost = Number(metrics.costMicros || 0) / 1_000_000;
    const conversions = Number(metrics.conversions || 0);
    return cost >= 5 && conversions === 0;
  }).length;

  const nextActions = buildNextActions({ current, previous, auction, wasteSearchTerms });
  const clientName = String(client?.name || client?.company_name || source.name || "Cliente");

  const input: ClientPerformanceSummaryInput = {
    clientName,
    period: { from: currentStart, to: currentEnd, days: periodDays },
    previousPeriod: { from: previousStart, to: previousEnd },
    current,
    previous,
    auction,
    executedOptimizations,
    nextActions,
  };

  const result = await generateClientPerformanceSummary(input);
  const periodLabel = `${formatDate(currentStart)} a ${formatDate(currentEnd)}`;

  return (
    <GoogleAdsClientSummaryCard
      text={result.text}
      periodLabel={periodLabel}
      provider={result.provider}
      model={result.model}
      generatedWithAi={result.generatedWithAi}
    />
  );
}
