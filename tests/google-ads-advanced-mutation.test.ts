import assert from "node:assert/strict";
import test from "node:test";
import { buildAdGroupKeyword, buildAdSchedule, buildKeywordCpc, buildLocation, buildNewResponsiveSearchAd, buildResponsiveSearchAd, buildTargetOrBidding } from "../src/lib/google-ads-api/advanced-mutation-builders.ts";
import { detectGoogleAdsCapabilities } from "../src/lib/google-ads-api/capabilities.ts";
import { googleAdsRiskForOperation, googleAdsWritesEnabled } from "../src/lib/google-ads-api/risk-policy.ts";

const keywordState = { customerId: "1234567890", campaignResourceName: "customers/1234567890/campaigns/1", adGroupResourceName: "customers/1234567890/adGroups/2", adGroupName: "Grupo" };

test("capabilities only allow CPC manual and targets on compatible strategies", () => {
  assert.equal(detectGoogleAdsCapabilities({ biddingStrategyType: "MANUAL_CPC" }).manualCpc, true);
  assert.equal(detectGoogleAdsCapabilities({ biddingStrategyType: "TARGET_ROAS" }).targetRoas, true);
  assert.equal(detectGoogleAdsCapabilities({ biddingStrategyType: "TARGET_CPA" }).manualCpc, false);
});

test("keyword creation validates match type, duplicate and negative conflict", () => {
  assert.equal(buildAdGroupKeyword({ campaignId: "1", adGroupId: "2", text: "curso online", matchType: "PHRASE" }, keywordState).riskLevel, "medium");
  assert.throws(() => buildAdGroupKeyword({ campaignId: "1", adGroupId: "2", text: "curso", matchType: "EXACT" }, { ...keywordState, duplicate: true }), /já existe/);
  assert.throws(() => buildAdGroupKeyword({ campaignId: "1", adGroupId: "2", text: "curso", matchType: "BROAD" }, { ...keywordState, conflict: true }), /conflita/);
});

test("CPC applies the 20 percent risk boundary and 50 percent hard guard", () => {
  assert.equal(buildKeywordCpc({ cpcMicros: 1200000 }, { resourceName: "customers/1234567890/adGroupCriteria/3", currentCpcMicros: 1000000, biddingStrategyType: "MANUAL_CPC" }).riskLevel, "medium");
  assert.equal(buildKeywordCpc({ cpcMicros: 1210000 }, { resourceName: "customers/1234567890/adGroupCriteria/3", currentCpcMicros: 1000000, biddingStrategyType: "MANUAL_CPC" }).riskLevel, "high");
  assert.throws(() => buildKeywordCpc({ cpcMicros: 1510000 }, { resourceName: "customers/1234567890/adGroupCriteria/3", currentCpcMicros: 1000000, biddingStrategyType: "MANUAL_CPC" }), /50%/);
});

test("schedule validation blocks inverted and overlapping intervals", () => {
  assert.throws(() => buildAdSchedule("add_ad_schedule", { campaignResourceName: "customers/1234567890/campaigns/1", dayOfWeek: "MONDAY", start: "18:00", end: "09:00" }, { campaignResourceName: "customers/1234567890/campaigns/1", existingSchedules: [] }), /terminar depois/);
  assert.throws(() => buildAdSchedule("add_ad_schedule", { campaignResourceName: "customers/1234567890/campaigns/1", dayOfWeek: "MONDAY", start: "10:00", end: "12:00" }, { campaignResourceName: "customers/1234567890/campaigns/1", existingSchedules: [{ dayOfWeek: "MONDAY", startMinutes: 600, endMinutes: 720 }] }), /sobrepõe/);
});

test("location uses official GeoTargetConstant and guards the last coverage", () => {
  assert.throws(() => buildLocation("add_campaign_location", { campaignResourceName: "customers/1234567890/campaigns/1", geoTargetConstantResourceName: "123" }, { campaignResourceName: "customers/1234567890/campaigns/1", existingLocations: [] }), /oficial/);
  assert.throws(() => buildLocation("remove_campaign_location", { geoTargetConstantResourceName: "geoTargetConstants/100", resourceName: "customers/1234567890/campaignCriteria/4" }, { campaignResourceName: "customers/1234567890/campaigns/1", existingLocations: [{ resourceName: "x", geoTargetConstantResourceName: "geoTargetConstants/100" }] }), /cobertura/);
});

test("RSA limits and target gate are enforced before API mutation", () => {
  assert.throws(() => buildResponsiveSearchAd({ headlines: ["A", "A", "B"], descriptions: ["D1", "D2"], finalUrls: ["https://example.com"] }, { resourceName: "customers/1234567890/ads/1", adType: "RESPONSIVE_SEARCH_AD" }), /duplicados/);
  const rsa = buildResponsiveSearchAd({ headlines: ["Título A", "Título B", "Título C"], descriptions: ["Descrição A", "Descrição B"], finalUrls: ["https://example.com"], finalMobileUrls: [] }, { resourceName: "customers/1234567890/ads/1", adType: "RESPONSIVE_SEARCH_AD", headlineAssets: [{ text: "Título A", pinnedField: "HEADLINE_1" }], headlines: ["Anterior A", "Anterior B", "Anterior C"], descriptions: ["Descrição A", "Descrição B"], finalUrls: ["https://example.com"], finalMobileUrls: [] });
  assert.equal(rsa.collection, "ads");
  assert.equal(rsa.operations[0].updateMask, "responsive_search_ad.headlines,responsive_search_ad.descriptions,final_urls,final_mobile_urls");
  assert.deepEqual(rsa.operations[0].update, { resourceName: "customers/1234567890/ads/1", responsiveSearchAd: { headlines: [{ text: "Título A", pinnedField: "HEADLINE_1" }, { text: "Título B" }, { text: "Título C" }], descriptions: [{ text: "Descrição A" }, { text: "Descrição B" }] }, finalUrls: ["https://example.com"], finalMobileUrls: [] });
  const createAndPause = buildNewResponsiveSearchAd({ adGroupId: "2", adId: "1", pauseExisting: true, headlines: ["Título A", "Título B", "Título C"], descriptions: ["Descrição A", "Descrição B"], finalUrls: ["https://example.com"], finalMobileUrls: [] }, { resourceName: "customers/1234567890/ads/1", adGroupResourceName: "customers/1234567890/adGroups/2", adGroupAdResourceName: "customers/1234567890/adGroupAds/2~1", adGroupAdStatus: "ENABLED", adType: "RESPONSIVE_SEARCH_AD" });
  assert.equal(createAndPause.collection, "adGroupAds");
  assert.equal(createAndPause.operations.length, 2);
  assert.equal((createAndPause.operations[0].create as Record<string, unknown>).status, "ENABLED");
  assert.deepEqual(createAndPause.operations[1], { update: { resourceName: "customers/1234567890/adGroupAds/2~1", status: "PAUSED" }, updateMask: "status" });
  const createAndKeep = buildNewResponsiveSearchAd({ adGroupId: "2", adId: "1", pauseExisting: false, headlines: ["Título A", "Título B", "Título C"], descriptions: ["Descrição A", "Descrição B"], finalUrls: ["https://example.com"] }, { resourceName: "customers/1234567890/ads/1", adGroupResourceName: "customers/1234567890/adGroups/2", adGroupAdResourceName: "customers/1234567890/adGroupAds/2~1", adGroupAdStatus: "ENABLED", adType: "RESPONSIVE_SEARCH_AD" });
  assert.equal(createAndKeep.operations.length, 1);
  const blocked = buildTargetOrBidding("set_target_cpa", { targetCpaMicros: 1000000 }, { resourceName: "customers/1234567890/campaigns/1", biddingStrategyType: "MAXIMIZE_CONVERSIONS", recentConversions: 29 });
  assert.equal(blocked.executable, false);
  assert.match(blocked.blockedReason || "", /30/);
  const strategy = buildTargetOrBidding("set_campaign_bidding_strategy", { strategy: "MAXIMIZE_CONVERSIONS" }, { resourceName: "customers/1234567890/campaigns/1", biddingStrategyType: "MAXIMIZE_CLICKS", recentConversions: 30 });
  assert.equal((strategy.operations[0].update as Record<string, unknown>).biddingStrategyType, undefined);
  assert.equal(strategy.operations[0].updateMask, "maximize_conversions.target_cpa_micros");
});

test("risk policy protects critical operations and global write switch", () => {
  assert.equal(googleAdsRiskForOperation("set_conversion_action_primary"), "critical");
  assert.equal(googleAdsRiskForOperation("batch_google_ads_changes", { items: [{ operationType: "add_ad_group_keyword", target: { matchType: "BROAD" } }] }), "high");
  const previous = process.env.GOOGLE_ADS_WRITES_ENABLED;
  process.env.GOOGLE_ADS_WRITES_ENABLED = "false";
  assert.equal(googleAdsWritesEnabled(), false);
  process.env.GOOGLE_ADS_WRITES_ENABLED = "true";
  assert.equal(googleAdsWritesEnabled(), true);
  if (previous === undefined) delete process.env.GOOGLE_ADS_WRITES_ENABLED; else process.env.GOOGLE_ADS_WRITES_ENABLED = previous;
});
