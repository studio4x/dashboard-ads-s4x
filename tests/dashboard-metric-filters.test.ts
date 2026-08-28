import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDashboardMetricFilters,
  extractDashboardMetricFilterOptions,
  normalizeDashboardMetricFilters,
} from "../src/lib/dashboard/metric-filters.ts";

const payload = {
  diagnostics: { snapshotVersion: "google_meta_ads_s4x_v1" },
  dailyPerformance: [
    { date: "2026-08-27", platform: "google_ads", campaignId: "g1", campaignName: "Pesquisa", campaignStatus: "ENABLED", cost: 100 },
    { date: "2026-08-27", platform: "google_ads", campaignId: "g2", campaignName: "Remarketing", campaignStatus: "PAUSED", cost: 50 },
    { date: "2026-08-27", platform: "meta_ads", campaignId: "m1", campaignName: "WhatsApp", campaignEffectiveStatus: "ACTIVE", cost: 80 },
  ],
  google_ads: [
    { date: "2026-08-27", campaignId: "g1", campaignName: "Pesquisa", campaignStatus: "ENABLED", cost: 100 },
    { date: "2026-08-27", campaignId: "g2", campaignName: "Remarketing", campaignStatus: "PAUSED", cost: 50 },
  ],
  meta_ads: [
    { date: "2026-08-27", campaignId: "m1", campaignName: "WhatsApp", campaignEffectiveStatus: "ACTIVE", cost: 80 },
  ],
  campaigns: [
    { campaignId: "g1", campaignName: "Pesquisa", campaignStatus: "ENABLED" },
    { campaignId: "g2", campaignName: "Remarketing", campaignStatus: "PAUSED" },
  ],
  adGroups: [
    { campaignId: "g1", campaignName: "Pesquisa", adGroupName: "Grupo 1" },
    { campaignId: "g2", campaignName: "Remarketing", adGroupName: "Grupo 2" },
  ],
};

test("normaliza filtros persistidos e remove valores inválidos", () => {
  assert.deepEqual(normalizeDashboardMetricFilters({
    campaignNames: [" Pesquisa ", "Pesquisa", ""],
    campaignStatuses: ["enabled", "ENABLED"],
    platforms: ["google_ads", "invalida"],
  }), {
    campaignNames: ["Pesquisa"],
    campaignStatuses: ["ENABLED"],
    platforms: ["google_ads"],
  });
});

test("extrai campanhas, status e plataformas disponíveis", () => {
  assert.deepEqual(extractDashboardMetricFilterOptions(payload), {
    campaignNames: ["Pesquisa", "Remarketing", "WhatsApp"],
    campaignStatuses: ["ACTIVE", "ENABLED", "PAUSED"],
    platforms: ["google_ads", "meta_ads"],
  });
});

test("filtra métricas e coleções relacionadas pela campanha e status", () => {
  const filtered = applyDashboardMetricFilters(payload, {
    campaignNames: ["Pesquisa"],
    campaignStatuses: ["ENABLED"],
  });
  assert.deepEqual(filtered.dailyPerformance.map((row: { campaignName: string }) => row.campaignName), ["Pesquisa"]);
  assert.deepEqual(filtered.campaigns.map((row: { campaignName: string }) => row.campaignName), ["Pesquisa"]);
  assert.deepEqual(filtered.adGroups.map((row: { campaignName: string }) => row.campaignName), ["Pesquisa"]);
});

test("filtra plataforma em dashboards integrados", () => {
  const filtered = applyDashboardMetricFilters(payload, { platforms: ["meta_ads"] });
  assert.deepEqual(filtered.dailyPerformance.map((row: { campaignName: string }) => row.campaignName), ["WhatsApp"]);
  assert.equal(filtered.google_ads.length, 0);
  assert.equal(filtered.meta_ads.length, 1);
  assert.equal(filtered.campaigns.length, 0);
  assert.equal(filtered.adGroups.length, 0);
});

test("preserva coleções detalhadas do Google ao filtrar Google em dashboard integrado", () => {
  const filtered = applyDashboardMetricFilters(payload, { platforms: ["google_ads"] });
  assert.deepEqual(filtered.dailyPerformance.map((row: { campaignName: string }) => row.campaignName), ["Pesquisa", "Remarketing"]);
  assert.equal(filtered.campaigns.length, 2);
  assert.equal(filtered.adGroups.length, 2);
  assert.equal(filtered.meta_ads.length, 0);
});
