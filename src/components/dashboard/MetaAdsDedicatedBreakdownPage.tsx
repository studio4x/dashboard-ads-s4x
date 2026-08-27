"use client";

import React, { useState } from "react";
import MetaAdsPage from "@/app/app/dashboards/[dashboardId]/meta-ads/page";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { getTemplateMetricSection } from "@/lib/dashboard/template-metric-config";

type BreakdownLevel = "campaigns" | "adSets" | "ads";

type BreakdownRow = {
  campaignName: string;
  adSetName?: string;
  adName?: string;
  cost: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  postEngagement: number;
  postComments: number;
  postReactions: number;
  postShares: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number | null;
  frequency: number;
};

const META_SECTIONS: Record<BreakdownLevel, string> = {
  campaigns: "campanhas",
  adSets: "conjuntos",
  ads: "anuncios",
};

const TITLES: Record<BreakdownLevel, { title: string; subtitle: string }> = {
  campaigns: { title: "Campanhas", subtitle: "Desempenho consolidado por campanha" },
  adSets: { title: "Conjuntos", subtitle: "Desempenho por conjunto de anúncios" },
  ads: { title: "Anúncios", subtitle: "Desempenho por criativo/anúncio" },
};

function aggregateRows(rows: any[], level: BreakdownLevel): BreakdownRow[] {
  const grouped = new Map<string, BreakdownRow>();

  for (const row of rows || []) {
    const campaignName = String(row?.campaignName || "Sem campanha");
    const adSetName = String(row?.adSetName || "Sem conjunto");
    const adName = String(row?.adName || "Sem anúncio");
    const key = level === "campaigns"
      ? campaignName
      : level === "adSets"
        ? `${campaignName} > ${adSetName}`
        : `${campaignName} > ${adSetName} > ${adName}`;

    const current = grouped.get(key) || {
      campaignName,
      ...(level !== "campaigns" ? { adSetName } : {}),
      ...(level === "ads" ? { adName } : {}),
      cost: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      conversions: 0,
      postEngagement: 0,
      postComments: 0,
      postReactions: 0,
      postShares: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      cpa: null,
      frequency: 0,
    } satisfies BreakdownRow;

    current.cost += Number(row?.cost || 0);
    current.impressions += Number(row?.impressions || 0);
    current.reach += Number(row?.reach || 0);
    current.clicks += Number(row?.clicks || 0);
    current.conversions += Number(row?.conversions || row?.messagingConversationsStarted || 0);
    current.postEngagement += Number(row?.postEngagement || 0);
    current.postComments += Number(row?.postComments || 0);
    current.postReactions += Number(row?.postReactions || 0);
    current.postShares += Number(row?.postShares || 0);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
      cpc: row.clicks > 0 ? row.cost / row.clicks : 0,
      cpm: row.impressions > 0 ? (row.cost / row.impressions) * 1000 : 0,
      cpa: row.conversions > 0 ? row.cost / row.conversions : null,
      frequency: row.reach > 0 ? row.impressions / row.reach : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
}

function renderMetricValue(key: string, value: unknown) {
  const numeric = Number(value || 0);
  if (["cost", "cpc", "cpa", "cpm"].includes(key)) {
    if (key === "cpa" && (value === null || value === undefined)) return "-";
    return formatCurrency(numeric);
  }
  if (key === "ctr") return `${numeric.toFixed(2)}%`;
  if (key === "frequency") return `${numeric.toFixed(2)}x`;
  return formatNumber(numeric);
}

export function MetaAdsDedicatedBreakdownPage({ level }: { level: BreakdownLevel }) {
  const { data } = useDashboard();
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [adSetFilter, setAdSetFilter] = useState("all");

  if (!data) return null;

  const sectionKey = META_SECTIONS[level];
  const section = getTemplateMetricSection(data.templateConfig, sectionKey);
  const customResultMetric = section?.metrics?.find((metric) =>
    metric.enabled &&
    metric.key === "conversions" &&
    /whatsapp|conversa|mensag/i.test(metric.label || "")
  );

  // Preserva integralmente o comportamento dos templates Meta padrão.
  if (!customResultMetric) {
    return <MetaAdsPage />;
  }

  const rawRows = Array.isArray(data.dailyPerformance) && data.dailyPerformance.length > 0
    ? data.dailyPerformance
    : Array.isArray(data.meta_ads)
      ? data.meta_ads
      : [];

  const aggregated = aggregateRows(rawRows, level);
  const campaigns = Array.from(new Set(aggregated.map((row) => row.campaignName))).filter(Boolean);
  const adSets = Array.from(new Set(
    aggregated
      .filter((row) => campaignFilter === "all" || row.campaignName === campaignFilter)
      .map((row) => row.adSetName || "")
  )).filter(Boolean);

  const filteredRows = aggregated.filter((row) => {
    const campaignMatch = campaignFilter === "all" || row.campaignName === campaignFilter;
    const adSetMatch = level !== "ads" || adSetFilter === "all" || row.adSetName === adSetFilter;
    return campaignMatch && adSetMatch;
  });

  if (rawRows.length === 0 && data.source !== "mock") {
    return (
      <DashboardPageShell title={TITLES[level].title} subtitle={TITLES[level].subtitle}>
        <TemplateEmptyState title="Dados do Meta Ads" description="Ainda não foram encontrados dados para esta aba." />
      </DashboardPageShell>
    );
  }

  const identityColumns: any[] = level === "campaigns"
    ? [
        { key: "campaignName", label: "Campanha", render: (value: unknown) => <strong>{String(value)}</strong> },
      ]
    : level === "adSets"
      ? [
          { key: "adSetName", label: "Conjunto de anúncios", render: (value: unknown) => <strong>{String(value)}</strong> },
          { key: "campaignName", label: "Campanha", render: (value: unknown) => String(value) },
        ]
      : [
          { key: "adName", label: "Anúncio", render: (value: unknown) => <strong>{String(value)}</strong> },
          { key: "adSetName", label: "Conjunto", render: (value: unknown) => String(value) },
        ];

  const metricColumns = (section?.metrics || [])
    .filter((metric) => metric.enabled)
    .sort((a, b) => a.order - b.order)
    .map((metric) => ({
      key: metric.key,
      label: metric.label || metric.key,
      align: "right",
      render: (value: unknown) => renderMetricValue(metric.key, value),
    }));

  return (
    <DashboardPageShell title={TITLES[level].title} subtitle={TITLES[level].subtitle}>
      <div className="card" style={{ padding: 24, backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0" }}>
        {level !== "campaigns" && (
          <div className="dashboard-filter-row" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
            <select
              value={campaignFilter}
              onChange={(event) => {
                setCampaignFilter(event.target.value);
                setAdSetFilter("all");
              }}
              style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}
            >
              <option value="all">Todas as campanhas</option>
              {campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
            </select>

            {level === "ads" && (
              <select
                value={adSetFilter}
                onChange={(event) => setAdSetFilter(event.target.value)}
                style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}
              >
                <option value="all">Todos os conjuntos</option>
                {adSets.map((adSet) => <option key={adSet} value={adSet}>{adSet}</option>)}
              </select>
            )}
          </div>
        )}

        <DataTableWidget
          data={filteredRows as unknown as Record<string, unknown>[]}
          columns={[...identityColumns, ...metricColumns] as any}
        />
      </div>
    </DashboardPageShell>
  );
}
