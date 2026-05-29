"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { generateMetaAdsKpis, generateMetaAdsS4XKpisWithLabels } from "@/lib/dashboard/kpi-generator";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { getMetaConversionLabel, getMetaCostLabel, getMetaCostMetric, getMetaObjectiveLabel, getMetaResultMetric, normalizeMetaAdsObjectives, resolveMetaObjectivePresentation } from "@/lib/meta-ads/objectives";

export default function MetaAdsPage() {
  const { data } = useDashboard();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedPage = searchParams.get("page");

  const resolveTabFromPath = (
    path: string,
    pageParam?: string | null
  ): "campaigns" | "adSets" | "ads" | "performance" | "engagement" => {
    if (path.startsWith("/share/")) {
      if (pageParam === "conjuntos") return "adSets";
      if (pageParam === "anuncios") return "ads";
      if (pageParam === "funil") return "performance";
      if (pageParam === "engajamento") return "engagement";
      if (pageParam === "campanhas") return "campaigns";
      return "campaigns";
    }
    if (path.endsWith("/conjuntos")) return "adSets";
    if (path.endsWith("/anuncios")) return "ads";
    if (path.endsWith("/funil")) return "performance";
    if (path.endsWith("/engajamento")) return "engagement";
    return "campaigns";
  };
  const [activeTab, setActiveTab] = useState<"campaigns" | "adSets" | "ads" | "performance" | "engagement">(
    resolveTabFromPath(pathname, sharedPage)
  );
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [adSetFilter, setAdSetFilter] = useState<string>("all");
  const [selectedObjective, setSelectedObjective] = useState<string>("");
  useEffect(() => {
    setActiveTab(resolveTabFromPath(pathname, sharedPage));
  }, [pathname, sharedPage]);

  const isSharedDedicatedMetaRoute = pathname.startsWith("/share/") && ["campanhas", "conjuntos", "anuncios", "funil", "engajamento"].includes(sharedPage || "");
  const isDedicatedMetaRoute =
    pathname.endsWith("/campanhas") ||
    pathname.endsWith("/conjuntos") ||
    pathname.endsWith("/anuncios") ||
    pathname.endsWith("/funil") ||
    pathname.endsWith("/engajamento") ||
    isSharedDedicatedMetaRoute;

  if (!data) return null;

  const objectiveOptions = normalizeMetaAdsObjectives(Array.isArray(data.metaObjectives) ? data.metaObjectives : []);
  const defaultObjective = normalizeMetaAdsObjectives([data.metaPrimaryObjective])[0] || objectiveOptions[0] || "";
  const activeObjective = selectedObjective || defaultObjective;

  const isMetaS4X = data.templateId === "meta_ads_s4x" || data.templateId === "google_meta_ads_s4x";
  const available =
    data?.diagnostics?.availableMetrics?.fields
    || data?.metaPayload?.diagnostics?.availableMetrics?.fields;
  const hasMetric = (key: string) => {
    if (!isMetaS4X) return true;
    if (!available) return true; // retrocompatibilidade para snapshots antigos
    return Boolean(available[key]);
  };
  const hasReachData = () => {
    const rows = (data.templateId === "google_meta_ads_s4x" ? data.meta_ads : data.dailyPerformance) || [];
    return Array.isArray(rows) && rows.some((row: any) => Number(row?.reach || 0) > 0);
  };
  const canShowReachMetric = hasMetric("reach") || hasReachData();
  const resolvedObjectivePresentation = resolveMetaObjectivePresentation({
    primaryObjective: activeObjective || data.metaPrimaryObjective,
    objectives: objectiveOptions,
    availableFields: available || null,
    dailyRows: Array.isArray(data.dailyPerformance) ? data.dailyPerformance : [],
  });
  const conversionLabel = resolvedObjectivePresentation?.conversionLabel || getMetaConversionLabel(data.metaPrimaryObjective);
  const costLabel = resolvedObjectivePresentation?.costLabel || getMetaCostLabel(data.metaPrimaryObjective);
  const costMetric = resolvedObjectivePresentation?.costMetric || getMetaCostMetric(data.metaPrimaryObjective);
  const resultMetric = resolvedObjectivePresentation?.resultMetric || getMetaResultMetric(data.metaPrimaryObjective);
  const resultValueKey = resultMetric === "postEngagement" ? "postEngagement" : resultMetric === "clicks" ? "clicks" : resultMetric === "reach" ? "reach" : "conversions";
  const costPerResultKey = costMetric === "cpc" ? "cpc" : costMetric === "cpm" ? "cpm" : "cpa";
  const costPerResultColumnKey = costMetric === "cpa" && resultMetric !== "conversions" ? "costPerResult" : costPerResultKey;
  const hasData = isMetaS4X 
    ? ((data.meta_ads && data.meta_ads.length > 0) || (data.dailyPerformance && data.dailyPerformance.length > 0))
    : (data.meta_ads && data.meta_ads.length > 0);
  
  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Meta Ads" subtitle="Campanhas, conjuntos de anúncios e desempenho por objetivo">
        <TemplateEmptyState 
          title="Dados do Meta Ads"
          description="Ainda não foram encontrados dados do Meta Ads. Este modelo de dashboard está em preparação."
        />
      </DashboardPageShell>
    );
  }

  // 1. Geração de KPIs
  const metaRowsForS4X = data.templateId === "google_meta_ads_s4x"
    ? (data.meta_ads || [])
    : (data.dailyPerformance || []);

  let kpis = isMetaS4X 
    ? generateMetaAdsS4XKpisWithLabels(metaRowsForS4X, data.meta_ads_summary, {
      conversionLabel,
      costLabel,
      costMetric,
      resultMetric,
      })
    : generateMetaAdsKpis(data.meta_ads || [], data.meta_ads_summary);

  if (isMetaS4X) {
    const hasResultMetric = resultMetric === "postEngagement"
      ? hasMetric("postEngagement")
      : resultMetric === "clicks"
        ? hasMetric("clicks")
        : resultMetric === "reach"
          ? hasMetric("reach")
          : hasMetric("conversions");
    kpis = kpis.filter((kpi: any) => {
      if (kpi.metricKey === "cost") return hasMetric("cost");
      if (kpi.metricKey === "conversions") return hasResultMetric;
      if (kpi.metricKey === "costPerConversion") {
        if (costMetric === "cpc") return hasMetric("cost") && hasMetric("clicks");
        if (costMetric === "cpm") return hasMetric("cost") && hasMetric("impressions");
        return hasMetric("cost") && hasMetric("conversions");
      }
      if (kpi.metricKey === "reach") return canShowReachMetric;
      if (kpi.metricKey === "frequency") return hasMetric("frequency") || (canShowReachMetric && hasMetric("impressions"));
      if (kpi.metricKey === "clicks") return hasMetric("clicks");
      return true;
    });
  }

  // 2. Gráfico Diário (Evolução Temporal)
  let dailySeries: any[] = [];
  if (isMetaS4X) {
    const dailyGrouped = metaRowsForS4X.reduce((acc: any, curr: any) => {
      const dateStr = formatDateShort(curr.date);
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, cost: 0, conversions: 0, clicks: 0, impressions: 0 };
      }
      acc[dateStr].cost += Number(curr.cost || 0);
      acc[dateStr].conversions += Number(curr.conversions || 0);
      acc[dateStr].clicks += Number(curr.clicks || 0);
      acc[dateStr].impressions += Number(curr.impressions || 0);
      return acc;
    }, {});
    dailySeries = Object.values(dailyGrouped).sort((a: any, b: any) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  } else {
    dailySeries = (data.meta_ads || []).map((r: any) => ({
      date: formatDateShort(r.date),
      Investimento: r.value || r.cost || 0,
    }));
  }

  // 3. Gráfico de Barras (Campanhas com mais gasto)
  let campaignBarData: any[] = [];
  let metaCampaigns: any[] = [];
  let adSets: any[] = [];
  let ads: any[] = [];
  let engagementCampaigns: any[] = [];

  if (isMetaS4X) {
    // Processamento estruturado Meta Ads S4X
    const rawData = (data.templateId === "google_meta_ads_s4x" ? data.meta_ads : data.dailyPerformance) || [];

    // Campanhas
    const campaignsMap = rawData.reduce((acc: any, curr: any) => {
      const key = curr.campaignName;
      if (!acc[key]) {
        acc[key] = { campaignName: key, cost: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, postEngagement: 0, postComments: 0, postReactions: 0, postShares: 0 };
      }
      acc[key].cost += Number(curr.cost || 0);
      acc[key].conversions += Number(curr.conversions || 0);
      acc[key].clicks += Number(curr.clicks || 0);
      acc[key].impressions += Number(curr.impressions || 0);
      acc[key].reach += Number(curr.reach || 0);
      acc[key].postEngagement += Number(curr.postEngagement || 0);
      acc[key].postComments += Number(curr.postComments || 0);
      acc[key].postReactions += Number(curr.postReactions || 0);
      acc[key].postShares += Number(curr.postShares || 0);
      return acc;
    }, {});

    metaCampaigns = Object.values(campaignsMap).map((item: any) => {
      const clicks = Number(item.clicks);
      const impressions = Number(item.impressions);
      const cost = Number(item.cost);
      const conversions = Number(item.conversions);
      const resultBase = Number(item[resultValueKey] || 0);
      return {
        ...item,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
        cpa: conversions > 0 ? cost / conversions : null,
        costPerResult: resultBase > 0 ? cost / resultBase : null,
        frequency: item.reach > 0 ? impressions / item.reach : 0
      };
    }).sort((a: any, b: any) => b.cost - a.cost);

    campaignBarData = metaCampaigns.slice(0, 10).map((c: any) => ({
      label: c.campaignName.substring(0, 24) + (c.campaignName.length > 24 ? "..." : ""),
      value: c.cost,
    }));

    // Ad Sets
    const adSetsMap = rawData.reduce((acc: any, curr: any) => {
      const key = `${curr.campaignName} > ${curr.adSetName}`;
      if (!acc[key]) {
        acc[key] = { campaignName: curr.campaignName, adSetName: curr.adSetName, cost: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0 };
      }
      acc[key].cost += Number(curr.cost || 0);
      acc[key].conversions += Number(curr.conversions || 0);
      acc[key].clicks += Number(curr.clicks || 0);
      acc[key].impressions += Number(curr.impressions || 0);
      acc[key].reach += Number(curr.reach || 0);
      return acc;
    }, {});

    adSets = Object.values(adSetsMap).map((item: any) => {
      const clicks = Number(item.clicks);
      const impressions = Number(item.impressions);
      const cost = Number(item.cost);
      const conversions = Number(item.conversions);
      const resultBase = Number(item[resultValueKey] || 0);
      return {
        ...item,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
        cpa: conversions > 0 ? cost / conversions : null,
        costPerResult: resultBase > 0 ? cost / resultBase : null,
        frequency: item.reach > 0 ? impressions / item.reach : 0
      };
    }).sort((a: any, b: any) => b.cost - a.cost);

    // Ads
    const adsMap = rawData.reduce((acc: any, curr: any) => {
      const key = `${curr.campaignName} > ${curr.adSetName} > ${curr.adName}`;
      if (!acc[key]) {
        acc[key] = { campaignName: curr.campaignName, adSetName: curr.adSetName, adName: curr.adName, cost: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0 };
      }
      acc[key].cost += Number(curr.cost || 0);
      acc[key].conversions += Number(curr.conversions || 0);
      acc[key].clicks += Number(curr.clicks || 0);
      acc[key].impressions += Number(curr.impressions || 0);
      acc[key].reach += Number(curr.reach || 0);
      return acc;
    }, {});

    ads = Object.values(adsMap).map((item: any) => {
      const clicks = Number(item.clicks);
      const impressions = Number(item.impressions);
      const cost = Number(item.cost);
      const conversions = Number(item.conversions);
      const resultBase = Number(item[resultValueKey] || 0);
      return {
        ...item,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
        cpa: conversions > 0 ? cost / conversions : null,
        costPerResult: resultBase > 0 ? cost / resultBase : null,
        frequency: item.reach > 0 ? impressions / item.reach : 0
      };
    }).sort((a: any, b: any) => b.cost - a.cost);

    engagementCampaigns = metaCampaigns
      .filter((c: any) =>
        Number(c.postEngagement || 0) > 0 ||
        Number(c.postComments || 0) > 0 ||
        Number(c.postReactions || 0) > 0 ||
        Number(c.postShares || 0) > 0
      )
      .sort((a: any, b: any) => Number(b.postEngagement || 0) - Number(a.postEngagement || 0));

  } else {
    // Legado
    metaCampaigns = (data.campaigns || []).filter((c: any) => 
      c.platform?.toLowerCase().includes("meta") || c.platform?.toLowerCase().includes("facebook")
    );
    campaignBarData = metaCampaigns.slice(0, 10).map((c: any) => ({
      label: c.campaign_name.substring(0, 24) + (c.campaign_name.length > 24 ? "..." : ""),
      value: c.cost || 0,
    }));
  }

  // Componente de Botões de Abas Premium
  const tabButton = (id: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: activeTab === id ? 600 : 500,
        backgroundColor: activeTab === id ? "#1877F2" : "transparent",
        color: activeTab === id ? "#FFFFFF" : "#64748B",
        border: "none",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );

  const pageTitleByTab = {
    campaigns: "Campanhas",
    adSets: "Conjuntos",
    ads: "Anúncios",
    performance: "Funil",
    engagement: "Engajamento",
  } as const;

  const pageSubtitleByTab = {
    campaigns: "Desempenho consolidado por campanha",
    adSets: "Desempenho por conjunto de anúncios",
    ads: "Desempenho por criativo/anúncio",
    performance: "Eficiência de tráfego e conversão",
    engagement: "Interações e engajamento do público",
  } as const;

  const pageTitle = isDedicatedMetaRoute ? pageTitleByTab[activeTab] : "Meta Ads";
  const pageSubtitle = isDedicatedMetaRoute
    ? pageSubtitleByTab[activeTab]
    : (isMetaS4X ? "Visão integrada baseada no coletor S4X" : "Campanhas, conjuntos de anúncios e desempenho por objetivo");

  const campaignsOptions = metaCampaigns.map((c: any) => String(c.campaignName || "")).filter(Boolean);
  const adSetOptions = adSets
    .filter((a: any) => campaignFilter === "all" || a.campaignName === campaignFilter)
    .map((a: any) => String(a.adSetName || ""))
    .filter(Boolean);

  const filteredAdSets = adSets.filter((row: any) => campaignFilter === "all" || row.campaignName === campaignFilter);
  const filteredAds = ads.filter((row: any) => {
    const campaignMatch = campaignFilter === "all" || row.campaignName === campaignFilter;
    const adSetMatch = adSetFilter === "all" || row.adSetName === adSetFilter;
    return campaignMatch && adSetMatch;
  });
  const filteredCampaigns = metaCampaigns.filter((row: any) => {
    const campaignMatch = campaignFilter === "all" || row.campaignName === campaignFilter;
    return campaignMatch;
  });

  const perfRows = filteredAds;
  const perfTotals = perfRows.reduce((acc: any, row: any) => {
    acc.impressions += Number(row.impressions || 0);
    acc.reach += Number(row.reach || 0);
    acc.clicks += Number(row.clicks || 0);
    acc.conversions += Number(row.conversions || 0);
    acc.engagement += Number(row.postEngagement || 0);
    acc.cost += Number(row.cost || 0);
    return acc;
  }, { impressions: 0, reach: 0, clicks: 0, conversions: 0, engagement: 0, cost: 0 });
  const perfResultTotal = perfRows.reduce((acc: number, row: any) => acc + Number(row[resultValueKey] || 0), 0);

  const funnelData = [
    { name: "Impressões", value: perfTotals.impressions },
    { name: "Alcance", value: perfTotals.reach },
    { name: "Cliques", value: perfTotals.clicks },
    { name: conversionLabel, value: perfResultTotal },
    { name: "Engajamento", value: perfTotals.engagement },
  ].filter((s) => s.value > 0);

  const funnelCtr = perfTotals.impressions > 0 ? (perfTotals.clicks / perfTotals.impressions) * 100 : 0;
  const funnelCpc = perfTotals.clicks > 0 ? perfTotals.cost / perfTotals.clicks : 0;
  const funnelCpm = perfTotals.impressions > 0 ? (perfTotals.cost / perfTotals.impressions) * 1000 : 0;
  const funnelPalette = ["#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];
  const funnelMax = Math.max(...funnelData.map((s) => Number(s.value || 0)), 1);
  const funnelStages = funnelData.map((stage, index) => {
    const prevValue = index === 0 ? null : Number(funnelData[index - 1]?.value || 0);
    const stageValue = Number(stage.value || 0);
    const conversionRate = prevValue && prevValue > 0 ? (stageValue / prevValue) * 100 : null;
    const dropRate = conversionRate !== null ? Math.max(0, 100 - conversionRate) : null;
    const barWidth = Math.max(18, Math.round((stageValue / funnelMax) * 100));
    return {
      ...stage,
      prevValue,
      conversionRate,
      dropRate,
      barWidth,
      color: funnelPalette[index] || "#93C5FD",
    };
  });

  const campaignBarDataFiltered = filteredCampaigns.slice(0, 10).map((c: any) => ({
    label: String(c.campaignName || "").substring(0, 24) + (String(c.campaignName || "").length > 24 ? "..." : ""),
    value: Number(c.cost || 0),
  }));
  const adSetBarDataFiltered = filteredAdSets.slice(0, 10).map((a: any) => ({
    label: String(a.adSetName || "").substring(0, 24) + (String(a.adSetName || "").length > 24 ? "..." : ""),
    value: Number(a.cost || 0),
  }));
  const adBarDataFiltered = filteredAds.slice(0, 10).map((a: any) => ({
    label: String(a.adName || "").substring(0, 24) + (String(a.adName || "").length > 24 ? "..." : ""),
    value: Number(a.cost || 0),
  }));

  return (
    <DashboardPageShell title={pageTitle} subtitle={pageSubtitle}>
      {!isDedicatedMetaRoute && isMetaS4X && objectiveOptions.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <div className="dashboard-objective-wrap" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Objetivo:</span>
            <select
              value={activeObjective}
              onChange={(e) => setSelectedObjective(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, background: "white", color: "#0F172A", minWidth: 170 }}
            >
              {objectiveOptions.map((objective) => (
                <option key={objective} value={objective}>
                  {getMetaObjectiveLabel(objective)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {!isDedicatedMetaRoute && <KpiGrid metrics={kpis} columns={isMetaS4X ? 3 : 3} />}

      {!isDedicatedMetaRoute && (
      <div className="dashboard-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Evolução Temporal" subtitle={`Gasto vs. ${conversionLabel}`} height={320}>
          {isMetaS4X ? (
            <LineChartWidget 
              data={dailySeries} 
              lines={[
                ...(hasMetric("cost") ? [{ key: "cost", label: "Investimento", color: "#1877F2" }] : []),
                ...((resultMetric === "postEngagement" ? hasMetric("postEngagement") : resultMetric === "clicks" ? hasMetric("clicks") : resultMetric === "reach" ? hasMetric("reach") : hasMetric("conversions")) ? [{ key: resultValueKey, label: conversionLabel, color: "#10B981" }] : []),
                ...(hasMetric("clicks") ? [{ key: "clicks", label: "Cliques", color: "#F59E0B" }] : [])
              ]} 
              xKey="date" 
              formatValue={(v) => typeof v === "number" && v > 50 ? formatCurrency(v, true) : String(v)} 
              height={290} 
            />
          ) : (
            <LineChartWidget 
              data={dailySeries} 
              lines={[{ key: "Investimento", label: "Investimento", color: "#1877F2" }]} 
              xKey="date" 
              formatValue={(v) => formatCurrency(v, true)} 
              height={290} 
            />
          )}
        </ChartCard>
        <ChartCard title="Investimento por Campanha" subtitle="Maiores orçamentos aplicados (Top 10)" height={320}>
          <HorizontalBarChartWidget data={campaignBarData} formatValue={(v) => formatCurrency(v, true)} height={290} />
        </ChartCard>
      </div>
      )}

      {isMetaS4X ? (
        <div className="card" style={{ padding: 24, backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          {!isDedicatedMetaRoute && (
          <div className="dashboard-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", margin: 0 }}>Detalhamento da Performance</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0 0" }}>Analise o desempenho em múltiplos níveis de granularidade</p>
            </div>
            
            <div className="dashboard-tab-buttons-wrap" style={{ 
              display: "flex", 
              backgroundColor: "#F1F5F9", 
              padding: "4px", 
              borderRadius: "8px",
              border: "1px solid #E2E8F0"
            }}>
              {tabButton("campaigns", "Campanhas")}
              {tabButton("adSets", "Conjuntos de Anúncios")}
              {tabButton("ads", "Anúncios")}
              {tabButton("performance", "Funil/Performance")}
              {tabButton("engagement", "Engajamento")}
            </div>
          </div>
          )}

          {activeTab === "campaigns" && (
            <DataTableWidget
              data={metaCampaigns as unknown as Record<string, unknown>[]}
              columns={[
                { key: "campaignName", label: "Campanha", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 280, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                ...(hasMetric("impressions") ? [{ key: "impressions", label: "Impressões", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...(hasMetric("reach") ? [{ key: "reach", label: "Alcance", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...((hasMetric("frequency") || (hasMetric("reach") && hasMetric("impressions"))) ? [{ key: "frequency", label: "Frequência", align: "right", render: (v: any) => `${Number(v).toFixed(2)}x` }] : []),
                ...(hasMetric("cost") ? [{ key: "cost", label: "Custo", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                ...((resultMetric === "postEngagement" ? hasMetric("postEngagement") : resultMetric === "clicks" ? hasMetric("clicks") : resultMetric === "reach" ? hasMetric("reach") : hasMetric("conversions")) ? [{ key: resultValueKey, label: conversionLabel, align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ...(hasMetric("cost") ? [{ key: costPerResultColumnKey, label: costLabel, align: "right", render: (v: any) => v ? formatCurrency(Number(v)) : "-" }] : []),
              ] as any}
            />
          )}

          {activeTab === "adSets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="dashboard-filter-row" style={{ display: "flex", justifyContent: "flex-end" }}>
                <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}>
                  <option value="all">Todas as campanhas</option>
                  {campaignsOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <DataTableWidget
                data={filteredAdSets as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "adSetName", label: "Conjunto de Anúncios", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                  { key: "campaignName", label: "Campanha", render: (v: unknown) => <span style={{ color: "#64748B", maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                  ...(hasMetric("impressions") ? [{ key: "impressions", label: "Impressões", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...(hasMetric("reach") ? [{ key: "reach", label: "Alcance", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...((hasMetric("frequency") || (hasMetric("reach") && hasMetric("impressions"))) ? [{ key: "frequency", label: "Frequência", align: "right", render: (v: any) => `${Number(v).toFixed(2)}x` }] : []),
                  ...(hasMetric("cost") ? [{ key: "cost", label: "Custo", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                  ...((resultMetric === "postEngagement" ? hasMetric("postEngagement") : resultMetric === "clicks" ? hasMetric("clicks") : resultMetric === "reach" ? hasMetric("reach") : hasMetric("conversions")) ? [{ key: resultValueKey, label: conversionLabel, align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                  ...(hasMetric("postEngagement") ? [{ key: "postEngagement", label: "Engajamento", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...(hasMetric("cost") ? [{ key: costPerResultColumnKey, label: costLabel, align: "right", render: (v: any) => v ? formatCurrency(Number(v)) : "-" }] : []),
                ] as any}
              />
            </div>
          )}

          {activeTab === "ads" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="dashboard-filter-row" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <select value={campaignFilter} onChange={(e) => { setCampaignFilter(e.target.value); setAdSetFilter("all"); }} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}>
                  <option value="all">Todas as campanhas</option>
                  {campaignsOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={adSetFilter} onChange={(e) => setAdSetFilter(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}>
                  <option value="all">Todos os conjuntos</option>
                  {adSetOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <DataTableWidget
                data={filteredAds as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "adName", label: "Anúncio", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                  { key: "adSetName", label: "Conjunto", render: (v: unknown) => <span style={{ color: "#64748B", maxWidth: 160, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                  ...(hasMetric("impressions") ? [{ key: "impressions", label: "Impressões", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...(hasMetric("reach") ? [{ key: "reach", label: "Alcance", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...((hasMetric("frequency") || (hasMetric("reach") && hasMetric("impressions"))) ? [{ key: "frequency", label: "Frequência", align: "right", render: (v: any) => `${Number(v).toFixed(2)}x` }] : []),
                  ...(hasMetric("cost") ? [{ key: "cost", label: "Custo", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                  ...((resultMetric === "postEngagement" ? hasMetric("postEngagement") : resultMetric === "clicks" ? hasMetric("clicks") : resultMetric === "reach" ? hasMetric("reach") : hasMetric("conversions")) ? [{ key: resultValueKey, label: conversionLabel, align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                  ...(hasMetric("postEngagement") ? [{ key: "postEngagement", label: "Engajamento", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...(hasMetric("cost") ? [{ key: costPerResultColumnKey, label: costLabel, align: "right", render: (v: any) => v ? formatCurrency(Number(v)) : "-" }] : []),
                ] as any}
              />
            </div>
          )}

          {activeTab === "performance" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <div className="dashboard-filter-row" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <select value={campaignFilter} onChange={(e) => { setCampaignFilter(e.target.value); setAdSetFilter("all"); }} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}>
                  <option value="all">Todas as campanhas</option>
                  {campaignsOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={adSetFilter} onChange={(e) => setAdSetFilter(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}>
                  <option value="all">Todos os conjuntos</option>
                  {adSetOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <ChartCard title="Funil Diário" subtitle={`Investimento, Cliques e ${conversionLabel}`} height={300}>
                <LineChartWidget
                  data={dailySeries}
                  lines={[
                    ...(hasMetric("cost") ? [{ key: "cost", label: "Investimento", color: "#1877F2" }] : []),
                    ...(hasMetric("clicks") ? [{ key: "clicks", label: "Cliques", color: "#F59E0B" }] : []),
                    ...((resultMetric === "postEngagement" ? hasMetric("postEngagement") : resultMetric === "clicks" ? hasMetric("clicks") : resultMetric === "reach" ? hasMetric("reach") : hasMetric("conversions")) ? [{ key: resultValueKey, label: conversionLabel, color: "#10B981" }] : []),
                  ]}
                  xKey="date"
                  formatValue={(v) => typeof v === "number" && v > 50 ? formatCurrency(v, true) : String(v)}
                  height={260}
                />
              </ChartCard>
              <ChartCard title="Funil de Performance" subtitle={`Impressões > Alcance > Cliques > ${conversionLabel} > Engajamento`} height={420}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 304 }}>
                  {funnelStages.length === 0 ? (
                    <div style={{ height: 228, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
                      Sem dados para montar o funil no período selecionado.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                      {funnelStages.map((stage) => (
                        <div key={stage.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                            <span style={{ color: "#0F172A", fontWeight: 700 }}>{stage.name}</span>
                            <span style={{ color: "#0F172A", fontWeight: 700 }}>{formatNumber(stage.value, true)}</span>
                          </div>
                          <div style={{ width: "100%", height: 20, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${stage.barWidth}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: `linear-gradient(90deg, ${stage.color}, ${stage.color}CC)`,
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          {stage.conversionRate !== null && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B" }}>
                              <span>Conversão vs etapa anterior: <strong style={{ color: "#0F172A" }}>{stage.conversionRate.toFixed(1)}%</strong></span>
                              <span>Perda: <strong style={{ color: "#0F172A" }}>{stage.dropRate?.toFixed(1)}%</strong></span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="dashboard-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                  <div style={{ padding: 8, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>CTR: <strong style={{ color: "#0F172A" }}>{funnelCtr.toFixed(2)}%</strong></div>
                  <div style={{ padding: 8, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>CPC: <strong style={{ color: "#0F172A" }}>{formatCurrency(funnelCpc)}</strong></div>
                  <div style={{ padding: 8, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>CPM: <strong style={{ color: "#0F172A" }}>{formatCurrency(funnelCpm)}</strong></div>
                </div>
              </ChartCard>
              <div className="dashboard-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <ChartCard title="Campanhas" subtitle="Investimento por campanha" height={280}>
                  <HorizontalBarChartWidget data={campaignBarDataFiltered} formatValue={(v) => formatCurrency(v, true)} height={230} />
                </ChartCard>
                <ChartCard title="Conjuntos" subtitle="Investimento por conjunto" height={280}>
                  <HorizontalBarChartWidget data={adSetBarDataFiltered} formatValue={(v) => formatCurrency(v, true)} height={230} />
                </ChartCard>
                <ChartCard title="Anúncios" subtitle="Investimento por anúncio" height={280}>
                  <HorizontalBarChartWidget data={adBarDataFiltered} formatValue={(v) => formatCurrency(v, true)} height={230} />
                </ChartCard>
              </div>
            </div>
          )}

          {activeTab === "engagement" && (
            <DataTableWidget
              data={engagementCampaigns as unknown as Record<string, unknown>[]}
              columns={[
                { key: "campaignName", label: "Campanha", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 280, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                ...(hasMetric("postEngagement") ? [{ key: "postEngagement", label: "Engajamento", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...(hasMetric("postReactions") ? [{ key: "postReactions", label: "Reações", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ...(hasMetric("postComments") ? [{ key: "postComments", label: "Comentários", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ...(hasMetric("postShares") ? [{ key: "postShares", label: "Compart.", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
              ] as any}
            />
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 20, backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Campanhas Meta Ads</h3>
          <DataTableWidget
            data={metaCampaigns as unknown as Record<string, unknown>[]}
            columns={[
              { key: "campaign_name", label: "Campanha", render: (v: unknown) => <span style={{ fontWeight: 500, maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
              { key: "impressions", label: "Impressões", align: "right", render: (v: unknown) => formatNumber(Number(v), true) },
              { key: "clicks", label: "Cliques", align: "right", render: (v: unknown) => formatNumber(Number(v)) },
              { key: "ctr", label: "CTR", align: "right", render: (v: unknown) => `${Number(v).toFixed(2)}%` },
              { key: "cost", label: "Custo", align: "right", render: (v: unknown) => formatCurrency(Number(v)) },
              { key: "cpa", label: "CPA", align: "right", render: (v: unknown) => formatCurrency(Number(v)) },
              { key: "roas", label: "ROAS", align: "right", render: (v: unknown) => <span style={{ fontWeight: 600, color: Number(v) >= 4 ? "#16A34A" : "#DC2626" }}>{Number(v).toFixed(2)}x</span> },
            ]}
          />
        </div>
      )}
    </DashboardPageShell>
  );
}


