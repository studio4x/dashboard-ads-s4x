import test from "node:test";
import assert from "node:assert/strict";
import { MetricsHelper } from "../src/lib/google-sheets/metrics-helper.ts";

test("MetricsHelper.enrichMetrics calculates derived metrics", () => {
  const enriched = MetricsHelper.enrichMetrics({
    impressions: 1000,
    clicks: 100,
    cost: 250,
    conversions: 10,
    conversionValue: 1000,
  });

  assert.equal(Number(enriched.ctr?.toFixed(2)), 10);
  assert.equal(Number(enriched.avgCpc?.toFixed(2)), 2.5);
  assert.equal(Number(enriched.costPerConversion?.toFixed(2)), 25);
  assert.equal(Number(enriched.roas?.toFixed(2)), 4);
});

test("MetricsHelper.calculateMetaSummary includes reach/frequency", () => {
  const summary = MetricsHelper.calculateMetaSummary([
    { impressions: 1000, clicks: 100, cost: 200, conversions: 5, reach: 500 },
    { impressions: 500, clicks: 50, cost: 150, conversions: 3, reach: 250 },
  ]);

  assert.equal(summary.reach, 750);
  assert.equal(Number((summary.frequency || 0).toFixed(2)), 2);
  assert.equal(summary.conversions, 8);
});
