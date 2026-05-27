type GenericRow = Record<string, any>;

const SCALE_KEYS = new Set([
  "cost",
  "clicks",
  "impressions",
  "conversions",
  "conversionValue",
  "allConversions",
  "allConversionsValue",
  "interactions",
]);

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function computeDerivedMetrics(row: GenericRow): GenericRow {
  const impressions = toNumber(row.impressions);
  const clicks = toNumber(row.clicks);
  const cost = toNumber(row.cost);
  const conversions = toNumber(row.conversions);
  const conversionValue = toNumber(row.conversionValue);
  const interactions = toNumber(row.interactions);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const avgCpc = clicks > 0 ? cost / clicks : 0;
  const avgCpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
  const cpa = conversions > 0 ? cost / conversions : 0;
  const roas = cost > 0 ? conversionValue / cost : 0;
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const costPerConversion = conversions > 0 ? cost / conversions : 0;
  const interactionRate = impressions > 0 ? interactions / impressions : 0;

  return {
    ...row,
    ctr: roundMetric(ctr),
    avgCpc: roundMetric(avgCpc),
    avgCpm: roundMetric(avgCpm),
    cpa: roundMetric(cpa),
    roas: roundMetric(roas),
    conversionRate: roundMetric(conversionRate),
    costPerConversion: roundMetric(costPerConversion),
    interactionRate: roundMetric(interactionRate),
    avgCost: roundMetric(avgCpc),
  };
}

function buildCampaignScaleMap(dailyRows: GenericRow[], campaigns: GenericRow[]): Map<string, number> {
  const periodCostByCampaign = new Map<string, number>();
  for (const row of dailyRows) {
    const campaignName = String(row?.campaignName || "");
    if (!campaignName) continue;
    periodCostByCampaign.set(campaignName, toNumber(periodCostByCampaign.get(campaignName)) + toNumber(row?.cost ?? row?.total_spend));
  }

  const totalCostByCampaign = new Map<string, number>();
  for (const row of campaigns) {
    const campaignName = String(row?.campaignName || "");
    if (!campaignName) continue;
    totalCostByCampaign.set(campaignName, toNumber(totalCostByCampaign.get(campaignName)) + toNumber(row?.cost ?? row?.total_spend));
  }

  const scaleByCampaign = new Map<string, number>();
  for (const [campaignName, periodCost] of periodCostByCampaign.entries()) {
    const totalCost = toNumber(totalCostByCampaign.get(campaignName));
    if (totalCost <= 0) {
      scaleByCampaign.set(campaignName, periodCost > 0 ? 1 : 0);
      continue;
    }
    scaleByCampaign.set(campaignName, periodCost / totalCost);
  }

  return scaleByCampaign;
}

export function normalizeGoogleAdsRowsToPeriod(
  rows: GenericRow[],
  dailyRows: GenericRow[],
  campaigns: GenericRow[],
): GenericRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!Array.isArray(dailyRows) || dailyRows.length === 0) return rows;
  if (!Array.isArray(campaigns) || campaigns.length === 0) return rows;

  const scaleByCampaign = buildCampaignScaleMap(dailyRows, campaigns);
  if (scaleByCampaign.size === 0) return rows;

  return rows
    .map((row) => {
      const campaignName = String(row?.campaignName || "");
      const scale = scaleByCampaign.get(campaignName);
      if (scale === undefined) return null;

      const normalized: GenericRow = { ...row };
      for (const key of Object.keys(normalized)) {
        if (!SCALE_KEYS.has(key)) continue;
        normalized[key] = roundMetric(toNumber(normalized[key]) * scale);
      }

      return computeDerivedMetrics(normalized);
    })
    .filter((row): row is GenericRow => Boolean(row));
}
