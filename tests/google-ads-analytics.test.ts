import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAnalyticsRows, normalizeChangeEvents, normalizeConfigurationSnapshot, parseChangeResourceIds } from "../src/lib/google-ads-api/analytics.ts";
import { googleAdsAnalyticsQueries } from "../src/lib/google-ads-api/queries.ts";

const source = { dataSourceId: "source-1", customerId: "1234567890", managerCustomerId: "9999999999", observedAt: "2026-09-08T12:00:00.000Z" };

test("normaliza fatos analíticos preservando métricas brutas e derivadas", () => {
  const [row] = normalizeAnalyticsRows("device_daily", [{
    campaign: { id: "10", name: "Search", status: "ENABLED" },
    segments: { date: "2026-09-07", device: "MOBILE" },
    metrics: { impressions: "1000", clicks: "100", costMicros: "250000000", conversions: "10", conversionsValue: "1000" },
  }], source);
  assert.equal(row.metrics.costMicros, "250000000");
  assert.equal(row.derived_metrics.cost, 250);
  assert.equal(row.derived_metrics.ctr, 0.1);
  assert.equal(row.dimensions.device, "MOBILE");
  assert.match(row.row_key, /^[a-f0-9]{64}$/);
});

test("a chave é idempotente e inclui dimensões segmentadas", () => {
  const input = { campaign: { id: "10" }, segments: { date: "2026-09-07", device: "MOBILE", adNetworkType: "SEARCH" }, metrics: { clicks: 1 } };
  const [first] = normalizeAnalyticsRows("network_daily", [input], source);
  const [same] = normalizeAnalyticsRows("network_daily", [input], source);
  const [different] = normalizeAnalyticsRows("network_daily", [{ ...input, segments: { ...input.segments, device: "DESKTOP" } }], source);
  assert.equal(first.row_key, same.row_key);
  assert.notEqual(first.row_key, different.row_key);
});

test("preserva snapshots de configuração na data observada", () => {
  const [snapshot] = normalizeConfigurationSnapshot("conversion_action", [{
    conversionAction: { resourceName: "customers/1234567890/conversionActions/7", id: "7", name: "WhatsApp", primaryForGoal: false },
  }], source);
  assert.equal(snapshot.resource_name, "customers/1234567890/conversionActions/7");
  assert.equal(snapshot.observed_on, "2026-09-08");
});

test("normaliza change events sem expor segredo e usa o resource name como identidade", () => {
  const [event] = normalizeChangeEvents([{ changeEvent: {
    resourceName: "customers/1234567890/changeEvents/abc", changeDateTime: "2026-09-08 10:00:00",
    changeResourceName: "customers/1234567890/campaigns/10", changeResourceType: "CAMPAIGN",
    resourceChangeOperation: "UPDATE", changedFields: { paths: ["budget_amount_micros"] }, oldResource: { budgetAmountMicros: "1" }, newResource: { budgetAmountMicros: "2" },
    clientType: "GOOGLE_ADS_WEB_CLIENT", userEmail: "operator@example.com",
  } }], source);
  assert.equal(event.google_resource_name, "customers/1234567890/changeEvents/abc");
  assert.equal(event.campaign_id, "10");
  assert.equal(event.user_email, "operator@example.com");
});

test("parseia IDs de change_resource_name por tipo, sem deixar chaves compostas", () => {
  assert.deepEqual(parseChangeResourceIds("AD_GROUP", "customers/1234567890/adGroups/195371147454"), {
    campaignId: null, adGroupId: "195371147454", criterionId: null, adId: null, assetId: null, campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("AD_GROUP_CRITERION", "customers/1234567890/adGroupCriteria/199059715373~379377417593"), {
    campaignId: null, adGroupId: "199059715373", criterionId: "379377417593", adId: null, assetId: null, campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("AD_GROUP_AD", "customers/1234567890/adGroupAds/199059715373~123456789"), {
    campaignId: null, adGroupId: "199059715373", criterionId: null, adId: "123456789", assetId: null, campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("AD_GROUP_ASSET", "customers/1234567890/adGroupAssets/199059715373~987654321~HEADLINE"), {
    campaignId: null, adGroupId: "199059715373", criterionId: null, adId: null, assetId: "987654321", campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("CAMPAIGN", "customers/1234567890/campaigns/23776438287"), {
    campaignId: "23776438287", adGroupId: null, criterionId: null, adId: null, assetId: null, campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("CAMPAIGN_CRITERION", "customers/1234567890/campaignCriteria/23776438287~303638868443"), {
    campaignId: "23776438287", adGroupId: null, criterionId: "303638868443", adId: null, assetId: null, campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("CAMPAIGN_ASSET", "customers/1234567890/campaignAssets/23776438287~987654321~HEADLINE"), {
    campaignId: "23776438287", adGroupId: null, criterionId: null, adId: null, assetId: "987654321", campaignBudgetId: null,
  });
  assert.deepEqual(parseChangeResourceIds("CAMPAIGN_BUDGET", "customers/1234567890/campaignBudgets/7654321"), {
    campaignId: null, adGroupId: null, criterionId: null, adId: null, assetId: null, campaignBudgetId: "7654321",
  });
  assert.deepEqual(parseChangeResourceIds("ASSET", "customers/1234567890/assets/987654321"), {
    campaignId: null, adGroupId: null, criterionId: null, adId: null, assetId: "987654321", campaignBudgetId: null,
  });
  for (const [type, resource] of [["UNKNOWN", "customers/1234567890/unknown/1"], ["AD_GROUP_AD", "malformed~value"]] as const) {
    assert.deepEqual(parseChangeResourceIds(type, resource), {
      campaignId: null, adGroupId: null, criterionId: null, adId: null, assetId: null, campaignBudgetId: null,
    });
  }
});

test("a query campaign_daily inclui Search Impression Share e preserva proporções nulas", () => {
  const query = googleAdsAnalyticsQueries.campaignDaily("2026-08-03", "2026-08-21");
  for (const field of [
    "metrics.search_impression_share", "metrics.search_budget_lost_impression_share", "metrics.search_rank_lost_impression_share",
    "metrics.search_top_impression_share", "metrics.search_absolute_top_impression_share", "metrics.search_budget_lost_top_impression_share",
    "metrics.search_rank_lost_top_impression_share", "metrics.search_budget_lost_absolute_top_impression_share", "metrics.search_rank_lost_absolute_top_impression_share",
    "metrics.search_exact_match_impression_share", "metrics.search_click_share", "metrics.top_impression_percentage", "metrics.absolute_top_impression_percentage",
  ]) assert.match(query, new RegExp(field.replaceAll(".", "\\.")));

  const [row] = normalizeAnalyticsRows("campaign_daily", [{ campaign: { id: "10" }, segments: { date: "2026-08-05" }, metrics: {
    impressions: 10, searchImpressionShare: 0.283, searchBudgetLostImpressionShare: null,
  } }], source);
  assert.equal(row.metrics.searchImpressionShare, 0.283);
  assert.equal(row.metrics.searchBudgetLostImpressionShare, null);
  assert.equal((row.raw_row.metrics as Record<string, unknown>).searchImpressionShare, 0.283);
});

test("search_terms_daily preserva keyword associada e não confunde os dois match types", () => {
  const query = googleAdsAnalyticsQueries.searchTermsDaily("2026-08-03", "2026-08-28");
  assert.match(query, /segments\.keyword\.ad_group_criterion/);
  assert.match(query, /segments\.keyword\.info\.text/);
  assert.match(query, /segments\.keyword\.info\.match_type/);

  const [row] = normalizeAnalyticsRows("search_terms_daily", [{
    campaign: { id: "10", name: "Search" }, adGroup: { id: "20", name: "Psicoterapia" },
    searchTermView: { searchTerm: "psicologa juazeiro do norte", status: "ADDED" },
    segments: {
      date: "2026-08-11", searchTermMatchType: "NEAR_PHRASE",
      keyword: { adGroupCriterion: "customers/5578515674/adGroupCriteria/195865330317~296334051048", info: { text: "consultório psicologia", matchType: "PHRASE" } },
    }, metrics: { impressions: 1, clicks: 2, costMicros: 29100000, conversions: 0 },
  }], source);
  assert.equal(row.dimensions.searchTermMatchType, "NEAR_PHRASE");
  assert.equal(row.dimensions.matchedKeywordCriterion, "customers/5578515674/adGroupCriteria/195865330317~296334051048");
  assert.equal(row.dimensions.matchedKeywordText, "consultório psicologia");
  assert.equal(row.dimensions.matchedKeywordMatchType, "PHRASE");
  assert.equal((row.raw_row.segments as Record<string, unknown>).keyword !== null, true);

  const [withoutKeyword] = normalizeAnalyticsRows("search_terms_daily", [{
    searchTermView: { searchTerm: "termo sem keyword", status: "NONE" }, segments: { date: "2026-08-11", searchTermMatchType: "BROAD" }, metrics: {},
  }], source);
  assert.equal(withoutKeyword.dimensions.matchedKeywordCriterion, null);
  assert.equal(withoutKeyword.dimensions.matchedKeywordText, null);
  assert.equal(withoutKeyword.dimensions.matchedKeywordMatchType, null);
});

test("remove somente o agregado nulo quando search_terms tem keywords segmentadas", () => {
  const base = { campaign: { id: "10" }, adGroup: { id: "20" }, searchTermView: { searchTerm: "psicologo", status: "NONE" }, segments: { date: "2026-08-11", searchTermMatchType: "NEAR_PHRASE" }, metrics: { impressions: 1 } };
  const rows = normalizeAnalyticsRows("search_terms_daily", [
    base,
    { ...base, segments: { ...base.segments, keyword: { adGroupCriterion: "customers/1234567890/adGroupCriteria/20~30", info: { text: "psicologo", matchType: "EXACT" } } } },
    { ...base, segments: { ...base.segments, keyword: { adGroupCriterion: "customers/1234567890/adGroupCriteria/20~31", info: { text: "terapia", matchType: "PHRASE" } } } },
  ], source);
  assert.equal(rows.length, 2);
  assert.equal(rows.every((row) => row.dimensions.matchedKeywordCriterion !== null), true);
  assert.notEqual(rows[0].row_key, rows[1].row_key);
});
