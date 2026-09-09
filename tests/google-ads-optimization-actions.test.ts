import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleAdsAutomationContext, type OptimizationAnalyticsRow, type OptimizationConfigRow } from "../src/lib/google-ads-api/optimization-actions.ts";

function row(dataset: "campaign" | "group" | "keyword" | "term" | "ad" | "time", overrides: Record<string, unknown> = {}): OptimizationAnalyticsRow {
  const baseDimensions = {
    campaignId: "10",
    campaignName: "Pesquisa Principal",
    campaignStatus: "ENABLED",
    channelType: "SEARCH",
    adGroupId: "20",
    adGroupName: "Serviços",
    adGroupStatus: "ENABLED",
  };
  const dimensions = {
    ...baseDimensions,
    ...(dataset === "keyword" ? { criterionId: "30", keywordText: "consultoria", keywordMatchType: "PHRASE", keywordStatus: "ENABLED" } : {}),
    ...(dataset === "term" ? { searchTerm: "consultoria premium" } : {}),
    ...(dataset === "ad" ? { adId: "40", adName: "Anúncio principal", adStatus: "ENABLED", adType: "RESPONSIVE_SEARCH_AD" } : {}),
    ...(dataset === "time" ? { dayOfWeek: "MONDAY", hour: 9 } : {}),
    ...((overrides.dimensions as Record<string, unknown> | undefined) || {}),
  };
  const metrics = {
    impressions: 100,
    clicks: 10,
    costMicros: 50_000_000,
    conversions: dataset === "campaign" ? 5 : 0,
    conversionsValue: dataset === "campaign" ? 500 : 0,
    searchBudgetLostImpressionShare: 0.35,
    searchRankLostImpressionShare: 0.1,
    ...((overrides.metrics as Record<string, unknown> | undefined) || {}),
  };
  return {
    observed_date: "2026-09-01",
    dimensions,
    metrics,
    raw_row: (overrides.raw_row as Record<string, unknown> | undefined) || null,
  };
}

function configRows(): OptimizationConfigRow[] {
  return [
    {
      config_type: "campaign_budget",
      resource_name: "customers/1234567890/campaignBudgets/1",
      campaign_id: "10",
      observed_at: "2026-09-02T00:00:00Z",
      payload: { campaign: { id: "10" }, campaignBudget: { amountMicros: "100000000" } },
    },
    {
      config_type: "campaign_bidding",
      resource_name: "customers/1234567890/campaigns/10",
      campaign_id: "10",
      observed_at: "2026-09-02T00:00:00Z",
      payload: { campaign: { id: "10", resourceName: "customers/1234567890/campaigns/10", biddingStrategyType: "MAXIMIZE_CONVERSIONS", maximizeConversions: { targetCpaMicros: "12000000" } } },
    },
  ];
}

function build(overrides: Partial<Parameters<typeof buildGoogleAdsAutomationContext>[0]> = {}) {
  return buildGoogleAdsAutomationContext({
    period: { start: "2026-08-18", end: "2026-09-01" },
    account: { customerId: "1234567890", customerName: "Conta teste", currencyCode: "BRL", timezone: "America/Sao_Paulo" },
    campaignRows: [row("campaign")],
    adGroupRows: [row("group")],
    keywordRows: [row("keyword")],
    searchRows: [],
    adRows: [],
    timeRows: [],
    configRows: configRows(),
    assetInventory: { available: false, receivedRows: 0 },
    ...overrides,
  });
}

test("turns a converting search term into a prefilled exact-keyword action", () => {
  const context = build({ searchRows: [row("term", { metrics: { clicks: 7, costMicros: 30_000_000, conversions: 2 } })] });
  const action = context.actions.find((item) => item.operationType === "add_ad_group_keyword");
  assert.equal(action?.readiness, "ready");
  assert.deepEqual(action?.target, { campaignId: "10", adGroupId: "20", text: "consultoria premium", matchType: "EXACT" });
});

test("suggests a controlled budget increase only when efficiency and auction loss support it", () => {
  const context = build();
  const action = context.actions.find((item) => item.operationType === "set_campaign_budget");
  assert.equal(action?.readiness, "ready");
  assert.deepEqual(action?.target, { campaignId: "10", amount: 110 });

  const insufficient = build({ campaignRows: [row("campaign", { metrics: { conversions: 1 } })] });
  assert.equal(insufficient.actions.some((item) => item.operationType === "set_campaign_budget"), false);
});

test("creates an RSA draft action from a low-quality keyword and the current responsive ad", () => {
  const keyword = row("keyword", { raw_row: { adGroupCriterion: { qualityInfo: { qualityScore: 3 } } } });
  const ad = row("ad", {
    raw_row: {
      adGroupAd: {
        ad: {
          type: "RESPONSIVE_SEARCH_AD",
          responsiveSearchAd: { headlines: [{ text: "Título atual" }, { text: "Segundo título" }, { text: "Terceiro título" }], descriptions: [{ text: "Descrição um" }, { text: "Descrição dois" }] },
          finalUrls: ["https://example.com"],
        },
      },
    },
  });
  const context = build({ keywordRows: [keyword], adRows: [ad] });
  const action = context.actions.find((item) => item.editor === "rsa_draft");
  assert.equal(action?.readiness, "review");
  assert.equal(action?.target?.adId, "40");
  assert.deepEqual(context.ads[0].headlines, ["Título atual", "Segundo título", "Terceiro título"]);
});

test("keeps schedule intervention blocked while the sample is short", () => {
  const context = build({
    period: { start: "2026-08-29", end: "2026-09-01" },
    timeRows: [row("time", { metrics: { clicks: 12, costMicros: 40_000_000, conversions: 0 } })],
  });
  const action = context.actions.find((item) => item.editor === "schedule_review");
  assert.equal(action?.readiness, "wait");
  assert.equal(action?.target?.dayOfWeek, "MONDAY");
});

test("uses only the authoritative campaign-asset inventory for missing-asset actions", () => {
  const unavailable = build();
  assert.equal(unavailable.actions.some((item) => item.editor === "asset_draft"), false);

  const available = build({ assetInventory: { available: true, receivedRows: 0 } });
  const action = available.actions.find((item) => item.editor === "asset_draft");
  assert.equal(action?.target?.assetType, "SITELINK");
  assert.match(action?.reason || "", /inventário oficial/i);
});
