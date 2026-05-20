"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { generateMetaAdsKpis, generateMetaAdsS4XKpis } from "@/lib/dashboard/kpi-generator";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function MetaAdsPage() {
  const { data } = useDashboard();
  const pathname = usePathname();
  const resolveTabFromPath = (path: string): "campaigns" | "adSets" | "ads" | "performance" | "engagement" => {
    if (path.endsWith("/conjuntos")) return "adSets";
    if (path.endsWith("/anuncios")) return "ads";
    if (path.endsWith("/funil")) return "performance";
    if (path.endsWith("/engajamento")) return "engagement";
    return "campaigns";
  };
  const [activeTab, setActiveTab] = useState<"campaigns" | "adSets" | "ads" | "performance" | "engagement">(resolveTabFromPath(pathname));
  useEffect(() => {
    setActiveTab(resolveTabFromPath(pathname));
  }, [pathname]);
  const isDedicatedMetaRoute =
    pathname.endsWith("/campanhas") ||
    pathname.endsWith("/conjuntos") ||
    pathname.endsWith("/anuncios") ||
    pathname.endsWith("/funil") ||
    pathname.endsWith("/engajamento");

  if (!data) return null;

  const isMetaS4X = data.templateId === "meta_ads_s4x";
  const available = data?.diagnostics?.availableMetrics?.fields;
  const hasMetric = (key: string) => {
    if (!isMetaS4X) return true;
    if (!available) return true; // retrocompatibilidade para snapshots antigos
    return Boolean(available[key]);
  };
  const hasData = isMetaS4X 
    ? (data.dailyPerformance && data.dailyPerformance.length > 0)
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
  let kpis = isMetaS4X 
    ? generateMetaAdsS4XKpis(data.dailyPerformance || [], data.meta_ads_summary)
    : generateMetaAdsKpis(data.meta_ads || [], data.meta_ads_summary);

  if (isMetaS4X) {
    kpis = kpis.filter((kpi) => {
      if (kpi.label === "Investimento") return hasMetric("cost");
      if (kpi.label === "Conversas Iniciadas") return hasMetric("conversions");
      if (kpi.label === "Custo por Conversa") return hasMetric("cost") && hasMetric("conversions");
      if (kpi.label === "Alcance") return hasMetric("reach");
      if (kpi.label === "Frequência") return hasMetric("frequency") || (hasMetric("reach") && hasMetric("impressions"));
      if (kpi.label === "Cliques no Link") return hasMetric("clicks");
      return true;
    });
  }

  // 2. Gráfico Diário (Evolução Temporal)
  let dailySeries: any[] = [];
  if (isMetaS4X) {
    const dailyGrouped = (data.dailyPerformance || []).reduce((acc: any, curr: any) => {
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
    const rawData = data.dailyPerformance || [];

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
      return {
        ...item,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
        cpa: conversions > 0 ? cost / conversions : null,
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
      return {
        ...item,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpa: conversions > 0 ? cost / conversions : null,
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
      return {
        ...item,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpa: conversions > 0 ? cost / conversions : null,
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
        marginRight: "8px"
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

  return (
    <DashboardPageShell title={pageTitle} subtitle={pageSubtitle}>
      <KpiGrid metrics={kpis} columns={isMetaS4X ? 3 : 3} />

      {!isDedicatedMetaRoute && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Evolução Temporal" subtitle="Gasto vs. Conversas Iniciadas" height={320}>
          {isMetaS4X ? (
            <LineChartWidget 
              data={dailySeries} 
              lines={[
                ...(hasMetric("cost") ? [{ key: "cost", label: "Investimento", color: "#1877F2" }] : []),
                ...(hasMetric("conversions") ? [{ key: "conversions", label: "Conversas", color: "#10B981" }] : []),
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", margin: 0 }}>Detalhamento da Performance</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0 0" }}>Analise o desempenho em múltiplos níveis de granularidade</p>
            </div>
            
            <div style={{ 
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
                ...(hasMetric("conversions") ? [{ key: "conversions", label: "Conversas", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ...((hasMetric("cost") && hasMetric("conversions")) ? [{ key: "cpa", label: "Custo/Conversa", align: "right", render: (v: any) => v ? formatCurrency(Number(v)) : "-" }] : []),
              ] as any}
            />
          )}

          {activeTab === "adSets" && (
            <DataTableWidget
              data={adSets as unknown as Record<string, unknown>[]}
              columns={[
                { key: "adSetName", label: "Conjunto de Anúncios", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                { key: "campaignName", label: "Campanha", render: (v: unknown) => <span style={{ color: "#64748B", maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                ...(hasMetric("impressions") ? [{ key: "impressions", label: "Impressões", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...(hasMetric("reach") ? [{ key: "reach", label: "Alcance", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...((hasMetric("frequency") || (hasMetric("reach") && hasMetric("impressions"))) ? [{ key: "frequency", label: "Frequência", align: "right", render: (v: any) => `${Number(v).toFixed(2)}x` }] : []),
                ...(hasMetric("cost") ? [{ key: "cost", label: "Custo", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                ...(hasMetric("conversions") ? [{ key: "conversions", label: "Conversas", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ...((hasMetric("cost") && hasMetric("conversions")) ? [{ key: "cpa", label: "Custo/Conversa", align: "right", render: (v: any) => v ? formatCurrency(Number(v)) : "-" }] : []),
              ] as any}
            />
          )}

          {activeTab === "ads" && (
            <DataTableWidget
              data={ads as unknown as Record<string, unknown>[]}
              columns={[
                { key: "adName", label: "Anúncio", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                { key: "adSetName", label: "Conjunto", render: (v: unknown) => <span style={{ color: "#64748B", maxWidth: 160, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                ...(hasMetric("impressions") ? [{ key: "impressions", label: "Impressões", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...(hasMetric("reach") ? [{ key: "reach", label: "Alcance", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                ...((hasMetric("frequency") || (hasMetric("reach") && hasMetric("impressions"))) ? [{ key: "frequency", label: "Frequência", align: "right", render: (v: any) => `${Number(v).toFixed(2)}x` }] : []),
                ...(hasMetric("cost") ? [{ key: "cost", label: "Custo", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                ...(hasMetric("conversions") ? [{ key: "conversions", label: "Conversas", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ...((hasMetric("cost") && hasMetric("conversions")) ? [{ key: "cpa", label: "Custo/Conversa", align: "right", render: (v: any) => v ? formatCurrency(Number(v)) : "-" }] : []),
              ] as any}
            />
          )}

          {activeTab === "performance" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <ChartCard title="Funil Diário" subtitle="Investimento, Cliques e Conversas" height={300}>
                <LineChartWidget
                  data={dailySeries}
                  lines={[
                    ...(hasMetric("cost") ? [{ key: "cost", label: "Investimento", color: "#1877F2" }] : []),
                    ...(hasMetric("clicks") ? [{ key: "clicks", label: "Cliques", color: "#F59E0B" }] : []),
                    ...(hasMetric("conversions") ? [{ key: "conversions", label: "Conversas", color: "#10B981" }] : []),
                  ]}
                  xKey="date"
                  formatValue={(v) => typeof v === "number" && v > 50 ? formatCurrency(v, true) : String(v)}
                  height={260}
                />
              </ChartCard>
              <DataTableWidget
                data={metaCampaigns as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "campaignName", label: "Campanha", render: (v: unknown) => <span style={{ fontWeight: 600, color: "#1E293B", maxWidth: 280, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
                  ...(hasMetric("impressions") ? [{ key: "impressions", label: "Impressões", align: "right", render: (v: any) => formatNumber(Number(v), true) }] : []),
                  ...(hasMetric("clicks") ? [{ key: "clicks", label: "Cliques", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                  ...(hasMetric("ctr") ? [{ key: "ctr", label: "CTR", align: "right", render: (v: any) => `${Number(v).toFixed(2)}%` }] : []),
                  ...(hasMetric("cpc") ? [{ key: "cpc", label: "CPC", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                  ...(hasMetric("cpm") ? [{ key: "cpm", label: "CPM", align: "right", render: (v: any) => formatCurrency(Number(v)) }] : []),
                  ...(hasMetric("conversions") ? [{ key: "conversions", label: "Conversas", align: "right", render: (v: any) => formatNumber(Number(v)) }] : []),
                ] as any}
              />
            </div>
          )}

          {activeTab === "engagement" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <ChartCard title="Top Campanhas por Engajamento" subtitle="Maiores volumes de interação" height={280}>
                <HorizontalBarChartWidget
                  data={engagementCampaigns.slice(0, 10).map((c: any) => ({
                    label: String(c.campaignName || "").substring(0, 24) + (String(c.campaignName || "").length > 24 ? "..." : ""),
                    value: Number(c.postEngagement || 0),
                  }))}
                  formatValue={(v) => formatNumber(Number(v), true)}
                  height={240}
                />
              </ChartCard>
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
            </div>
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
