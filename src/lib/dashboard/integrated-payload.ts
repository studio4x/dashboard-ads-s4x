/* eslint-disable @typescript-eslint/no-explicit-any */
function mapIntegratedDailyRow(row: any, platform: "google_ads" | "meta_ads") {
  return {
    ...row,
    platform,
    date: row.date,
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    cost: Number(row.cost || 0),
    conversions: Number(row.conversions || 0),
    conversionValue: Number(row.conversionValue || 0),
    reach: Number(row.reach || 0),
    postEngagement: Number(row.postEngagement || 0),
  };
}

function calculateIntegratedSummary(rows: any[]) {
  const totals = rows.reduce((acc, row) => {
    acc.impressions += Number(row.impressions || 0);
    acc.clicks += Number(row.clicks || 0);
    acc.cost += Number(row.cost || 0);
    acc.conversions += Number(row.conversions || 0);
    acc.conversionValue += Number(row.conversionValue || 0);
    acc.reach += Number(row.reach || 0);
    acc.postEngagement += Number(row.postEngagement || 0);
    return acc;
  }, { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionValue: 0, reach: 0, postEngagement: 0 });

  return {
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
    cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
    roas: totals.cost > 0 ? totals.conversionValue / totals.cost : 0,
    frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
    avgCpm: totals.impressions > 0 ? (totals.cost / totals.impressions) * 1000 : 0,
  };
}

export function buildIntegratedAdsPayload(params: {
  sourceRole: "google_ads" | "meta_ads";
  importedPayload: any;
  previousPayload?: any | null;
  sourceLabel: string;
  sourceReference?: string | null;
  preferPreviousRolePayload?: boolean;
}) {
  const previous = params.previousPayload || {};
  const googlePayload = params.sourceRole === "google_ads" && !params.preferPreviousRolePayload
    ? params.importedPayload
    : previous.googlePayload || (previous.diagnostics?.googleSnapshotVersion?.startsWith?.("google_ads_s4x") ? previous : null);
  const metaPayload = params.sourceRole === "meta_ads" && !params.preferPreviousRolePayload
    ? params.importedPayload
    : previous.metaPayload || (previous.diagnostics?.metaSnapshotVersion?.startsWith?.("meta_ads_s4x") ? previous : null);

  const googleRows = Array.isArray(googlePayload?.dailyPerformance)
    ? googlePayload.dailyPerformance.map((row: any) => mapIntegratedDailyRow(row, "google_ads"))
    : [];
  const metaRows = Array.isArray(metaPayload?.dailyPerformance)
    ? metaPayload.dailyPerformance.map((row: any) => mapIntegratedDailyRow(row, "meta_ads"))
    : [];
  const dailyPerformance = [...googleRows, ...metaRows]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  return {
    meta: {
      accountName: "Integrado Google + Meta",
      accountId: null,
      timezone: googlePayload?.meta?.timezone || metaPayload?.meta?.timezone || "America/Sao_Paulo",
    },
    config: {
      templateId: "google_meta_ads_s4x",
      templateLabel: "Google + Meta Ads S4X",
      templateVersion: "1.0",
      source: params.sourceLabel,
    },
    summary: calculateIntegratedSummary(dailyPerformance),
    google_ads_summary: googlePayload?.summary || null,
    meta_ads_summary: metaPayload?.summary || null,
    overview: dailyPerformance,
    dailyPerformance,
    google_ads: googleRows,
    meta_ads: metaRows,
    campaigns: googlePayload?.campaigns || [],
    adGroups: googlePayload?.adGroups || [],
    keywords: googlePayload?.keywords || [],
    searchTerms: googlePayload?.searchTerms || [],
    negativeKeywords: googlePayload?.negativeKeywords || [],
    adsAndAssets: googlePayload?.adsAndAssets || [],
    diagnostics: {
      snapshotVersion: "google_meta_ads_s4x_v1",
      googleSnapshotVersion: googlePayload?.diagnostics?.snapshotVersion || null,
      metaSnapshotVersion: metaPayload?.diagnostics?.snapshotVersion || null,
      sourceReference: params.sourceReference || null,
      importedAt: new Date().toISOString(),
      warnings: [
        ...(!googlePayload ? ["Fonte Google Ads ainda não importada para este dashboard integrado."] : []),
        ...(!metaPayload ? ["Fonte Meta Ads ainda não importada para este dashboard integrado."] : []),
      ],
    },
    googlePayload: googlePayload || null,
    metaPayload: metaPayload || null,
  };
}
