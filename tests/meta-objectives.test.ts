import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMetaAdsObjectives,
  resolveMetaObjectivePresentation,
  validateMetaObjectivesMetrics,
} from "../src/lib/meta-ads/objectives.ts";

test("normalizeMetaAdsObjectives removes invalid/duplicated values", () => {
  const result = normalizeMetaAdsObjectives(["Leads", "leads", "foo", "alcance"]);
  assert.deepEqual(result, ["leads", "alcance"]);
});

test("resolveMetaObjectivePresentation switches to Leads when objective is vendas with lead fields", () => {
  const result = resolveMetaObjectivePresentation({
    primaryObjective: "vendas",
    objectives: ["vendas"],
    availableFields: { leads: true, leadAny: true, cost: true },
    dailyRows: [{ leads: 12, messagingConversationsStarted: 0 }],
  });

  assert.equal(result.conversionLabel, "Leads");
  assert.equal(result.costLabel, "Custo por Lead");
});

test("validateMetaObjectivesMetrics reports missing required fields", () => {
  const result = validateMetaObjectivesMetrics(["alcance"], {
    reach: true,
    impressions: true,
    frequency: false,
    cpm: false,
    cost: true,
  });

  assert.equal(result.missingMetricFields.includes("frequency"), true);
  assert.equal(result.missingMetricFields.includes("cpm"), true);
});
