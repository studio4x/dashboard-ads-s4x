import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsWriteCenterClient, type BudgetOption, type EntityOption, type KeywordSuggestion, type NegativeSuggestion } from "./GoogleAdsWriteCenterClient";
import { GoogleAdsAdvancedActions } from "./GoogleAdsAdvancedActions";

type Props = {
  sourceId: string;
  from?: string | null;
  to?: string | null;
};

type Row = {
  observed_date: string;
  dimensions: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dimension(row: Row, key: string) {
  const value = object(row.dimensions)[key];
  return value == null ? "" : String(value);
}

function metric(row: Row, key: string) {
  return numeric(object(row.metrics)[key]);
}

function cost(row: Row) {
  return metric(row, "costMicros") / 1_000_000;
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00Z`).getTime());
}

function localToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function fetchDataset(supabase: Awaited<ReturnType<typeof createAdminClient>>, sourceId: string, dataset: string, start: string, end: string) {
  const rows: Row[] = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("google_ads_analytics_rows")
      .select("observed_date,dimensions,metrics")
      .eq("data_source_id", sourceId)
      .eq("dataset", dataset)
      .gte("observed_date", start)
      .lte("observed_date", end)
      .order("observed_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as Row[];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

export async function GoogleAdsWriteCenter({ sourceId, from, to }: Props) {
  const supabase = await createAdminClient({ actor: "server_component", action: "google_ads_write_center" });
  const [{ data: latest }, { data: sourceConfig }] = await Promise.all([
    supabase.from("google_ads_analytics_rows").select("observed_date").eq("data_source_id", sourceId).eq("dataset", "campaign_daily").order("observed_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("google_ads_sources").select("currency_code").eq("data_source_id", sourceId).maybeSingle(),
  ]);
  if (!latest?.observed_date) return null;

  const latestObserved = String(latest.observed_date);
  const today = localToday();
  const defaultEnd = latestObserved >= today ? addDays(today, -1) : latestObserved;
  const end = isIsoDate(to) ? to : defaultEnd;
  const start = isIsoDate(from) && from <= end ? from : addDays(end, -29);

  const [campaignRows, searchRows, keywordRows, adRows, adGroupRows, budgetResult] = await Promise.all([
    fetchDataset(supabase, sourceId, "campaign_daily", start, end),
    fetchDataset(supabase, sourceId, "search_terms_daily", start, end),
    fetchDataset(supabase, sourceId, "keyword_daily", start, end),
    fetchDataset(supabase, sourceId, "ad_daily", start, end),
    fetchDataset(supabase, sourceId, "ad_group_daily", start, end),
    supabase.from("google_ads_config_history").select("campaign_id,payload,observed_at").eq("data_source_id", sourceId).eq("config_type", "campaign_budget").order("observed_at", { ascending: false }).limit(500),
  ]);

  const totalCost = campaignRows.reduce((sum, row) => sum + cost(row), 0);
  const lowIntentTokens = [
    "gratis", "gratuito", "gratuita", "vaga", "vagas", "emprego", "empregos", "curso", "cursos",
    "faculdade", "salario", "salarios", "pdf", "apostila", "modelo", "exemplo", "30 reais", "barato", "barata",
  ];

  const termMap = new Map<string, NegativeSuggestion & { conversions: number }>();
  for (const row of searchRows) {
    const term = dimension(row, "searchTerm").trim();
    const campaignId = dimension(row, "campaignId");
    if (!term || !campaignId) continue;
    const key = `${campaignId}:${term.toLocaleLowerCase("pt-BR")}`;
    const current = termMap.get(key) || { campaignId, campaignName: dimension(row, "campaignName"), term, clicks: 0, cost: 0, conversions: 0 };
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    termMap.set(key, current);
  }
  const negatives: NegativeSuggestion[] = Array.from(termMap.values())
    .filter((item) => item.conversions === 0 && item.clicks > 0 && item.cost > 0 && lowIntentTokens.some((token) => normalize(item.term).includes(token)))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map(({ conversions: _conversions, ...item }) => item);

  const keywordMap = new Map<string, KeywordSuggestion>();
  for (const row of keywordRows) {
    const adGroupId = dimension(row, "adGroupId");
    const criterionId = dimension(row, "criterionId");
    const keyword = dimension(row, "keywordText");
    if (!adGroupId || !criterionId || !keyword) continue;
    const key = `${adGroupId}:${criterionId}`;
    const current = keywordMap.get(key) || { adGroupId, criterionId, keyword, matchType: dimension(row, "keywordMatchType") || "—", clicks: 0, cost: 0, conversions: 0, status: dimension(row, "keywordStatus") || "ENABLED" };
    current.clicks += metric(row, "clicks");
    current.cost += cost(row);
    current.conversions += metric(row, "conversions");
    keywordMap.set(key, current);
  }
  const keywordThreshold = Math.max(20, totalCost * 0.1);
  const keywords = Array.from(keywordMap.values())
    .filter((item) => item.status.toUpperCase() === "ENABLED" && item.conversions === 0 && (item.clicks >= 8 || item.cost >= keywordThreshold))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8);

  const adMap = new Map<string, EntityOption>();
  for (const row of adRows) {
    const id = dimension(row, "adId");
    const parentId = dimension(row, "adGroupId");
    if (!id || !parentId) continue;
    const status = dimension(row, "adStatus");
    if (!new Set(["ENABLED", "PAUSED"]).has(status.toUpperCase())) continue;
    if (!adMap.has(id)) adMap.set(id, { id, parentId, name: `Anúncio ${id}`, status });
  }
  const ads = Array.from(adMap.values()).slice(0, 30);

  const groupMap = new Map<string, EntityOption>();
  for (const row of adGroupRows) {
    const id = dimension(row, "adGroupId");
    if (!id) continue;
    const status = dimension(row, "adGroupStatus");
    if (!new Set(["ENABLED", "PAUSED"]).has(status.toUpperCase())) continue;
    if (!groupMap.has(id)) groupMap.set(id, { id, name: dimension(row, "adGroupName") || `Grupo ${id}`, status });
  }
  const adGroups = Array.from(groupMap.values()).slice(0, 30);

  const budgets: BudgetOption[] = [];
  const seenCampaigns = new Set<string>();
  for (const row of budgetResult.data || []) {
    const campaignId = String(row.campaign_id || "");
    if (!campaignId || seenCampaigns.has(campaignId)) continue;
    const payload = object(row.payload);
    const campaign = object(payload.campaign);
    const budget = object(payload.campaignBudget);
    const amount = Number(budget.amountMicros || 0) / 1_000_000;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    seenCampaigns.add(campaignId);
    budgets.push({ campaignId, campaignName: String(campaign.name || `Campanha ${campaignId}`), amount, currencyCode: String(sourceConfig?.currency_code || "BRL") });
  }

  return <>
    <GoogleAdsWriteCenterClient sourceId={sourceId} negatives={negatives} keywords={keywords} ads={ads} adGroups={adGroups} budgets={budgets} />
    <div style={{ maxWidth: 1440, width: "100%", margin: "0 auto", padding: "0 clamp(14px, 3vw, 32px)", boxSizing: "border-box" }}>
      <GoogleAdsAdvancedActions sourceId={sourceId} />
    </div>
  </>;
}
