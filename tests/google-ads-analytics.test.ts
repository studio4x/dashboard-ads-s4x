import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAnalyticsRows, normalizeChangeEvents, normalizeConfigurationSnapshot } from "../src/lib/google-ads-api/analytics.ts";

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
