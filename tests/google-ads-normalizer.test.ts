import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleAdsApiPayload,
  deriveGoogleAdsMetrics,
  microsToCurrency,
  normalizeAd,
  normalizeAdGroup,
  normalizeCampaign,
  normalizeCampaignNegative,
  normalizeKeyword,
  normalizeSearchTerm,
  normalizeSharedNegatives,
  ratioToPercent,
} from "../src/lib/google-ads-api/normalizer.ts";
import type { GoogleAdsApiRow } from "../src/types/google-ads-api.ts";

const baseMetrics = {
  impressions: "1000", clicks: "100", costMicros: "250000000", conversions: 10,
  conversionsValue: 1000, allConversions: 12, allConversionsValue: 1200, interactions: "110",
};

const baseRow: GoogleAdsApiRow = {
  campaign: { id: "123", name: "Search", status: "ENABLED", advertisingChannelType: "SEARCH" },
  adGroup: { id: "456", name: "Grupo", status: "ENABLED" },
  metrics: baseMetrics,
};

test("converte cost_micros para moeda", () => {
  assert.equal(microsToCurrency("1234567"), 1.234567);
});

test("converte razões da API para percentual em base 100", () => {
  assert.equal(ratioToPercent(0.054), 5.4);
  assert.equal(ratioToPercent(null), null);
});

test("calcula métricas derivadas na escala esperada pelo dashboard", () => {
  const metrics = deriveGoogleAdsMetrics({ impressions: 1000, clicks: 100, cost: 250, conversions: 10, conversionValue: 1000, interactions: 110 });
  assert.equal(metrics.ctr, 10);
  assert.equal(metrics.avgCpc, 2.5);
  assert.equal(metrics.cpa, 25);
  assert.equal(metrics.roas, 4);
  assert.equal(metrics.avgCpm, 250);
  assert.equal(metrics.conversionRate, 10);
  assert.equal(metrics.interactionRate, 11);
});

test("normaliza campanha com ID estável e impression share", () => {
  const campaign = normalizeCampaign({ ...baseRow, metrics: { ...baseMetrics, searchImpressionShare: 0.75 } });
  assert.equal(campaign.campaignId, "123");
  assert.equal(campaign.cost, 250);
  assert.equal(campaign.searchImpressionShare, 75);
  assert.equal(campaign.aiKey, "campaign:123");
});

test("normaliza grupo de anúncios", () => {
  const group = normalizeAdGroup(baseRow);
  assert.equal(group.adGroupId, "456");
  assert.equal(group.adGroupName, "Grupo");
  assert.equal(group.avgCpc, 2.5);
});

test("normaliza keyword e quality info sem inventar valores", () => {
  const keyword = normalizeKeyword({
    ...baseRow,
    adGroupCriterion: {
      criterionId: "789", status: "ENABLED", keyword: { text: "comprar agora", matchType: "PHRASE" },
      qualityInfo: { qualityScore: 8, creativeQualityScore: "ABOVE_AVERAGE" },
    },
  });
  assert.equal(keyword.criterionId, "789");
  assert.equal(keyword.qualityScore, 8);
  assert.equal(keyword.postClickQualityScore, null);
});

test("normaliza termos de pesquisa", () => {
  const term = normalizeSearchTerm({
    ...baseRow, searchTermView: { searchTerm: "tenis azul", status: "ADDED" },
    segments: { searchTermMatchType: "NEAR_EXACT" },
  });
  assert.equal(term.searchTerm, "tenis azul");
  assert.equal(term.termStatus, "ADDED");
  assert.equal(term.cost, 250);
});

test("normaliza negativas de campanha e listas compartilhadas", () => {
  const direct = normalizeCampaignNegative({
    campaign: baseRow.campaign,
    campaignCriterion: { criterionId: "90", keyword: { text: "gratis", matchType: "BROAD" } },
  });
  const shared = normalizeSharedNegatives(
    [{ sharedSet: { id: "50", name: "Negativas gerais" }, sharedCriterion: { criterionId: "51", keyword: { text: "emprego", matchType: "PHRASE" } } }],
    [{ campaign: { id: "123", name: "Search" }, sharedSet: { id: "50" } }],
  );
  assert.equal(direct.negativeOrigin, "CAMPAIGN");
  assert.equal(shared[0].negativeOrigin, "CAMPAIGN_LIST");
  assert.equal(shared[0].campaignName, "Search");
});

test("normaliza anúncio e marca textos repetidos como não agregáveis", () => {
  const rows = normalizeAd({
    ...baseRow,
    adGroupAd: {
      status: "ENABLED",
      ad: { id: "999", type: "RESPONSIVE_SEARCH_AD", finalUrls: ["https://example.com"], responsiveSearchAd: { headlines: [{ text: "Título" }], descriptions: [{ text: "Descrição" }] } },
    },
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].isAggregatable, true);
  assert.equal(rows[1].isAggregatable, false);
  assert.equal(rows[1].assetType, "HEADLINE");
});

test("gera payload GoogleAdsS4X compatível", () => {
  const payload = buildGoogleAdsApiPayload({
    customerId: "1234567890", customerName: "Cliente", managerCustomerId: "9999999999", timezone: "America/Sao_Paulo",
    apiVersion: "v25", dateStart: "2026-06-01", dateEnd: "2026-08-27",
    dailyRows: [{ ...baseRow, segments: { date: "2026-08-27" } }], campaignRows: [baseRow], adGroupRows: [baseRow],
    keywordRows: [], searchTermRows: [], campaignNegativeRows: [], sharedNegativeRows: [], campaignSharedSetRows: [],
    adRows: [], adAssetRows: [], pmaxAssetRows: [],
  });
  assert.equal(payload.config.source, "google_ads_api");
  assert.equal(payload.diagnostics.snapshotVersion, "google_ads_s4x_v1");
  assert.equal(payload.diagnostics.sourceSpreadsheetId, undefined);
  assert.equal(payload.summary.cost, 250);
  assert.equal(payload.dailyPerformance.length, 1);
});
