"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { generateMetaAdsKpis } from "@/lib/dashboard/kpi-generator";

export default function MetaAdsPage() {
  const { data } = useDashboard();

  if (!data) return null;

  const kpis = generateMetaAdsKpis(data.meta_ads);

  const dailySeries = data.meta_ads.map((r: any) => ({
    date: formatDateShort(r.date),
    Investimento: r.value,
  }));

  const metaCampaigns = data.campaigns.filter((c: any) => c.platform?.toLowerCase().includes("meta") || c.platform?.toLowerCase().includes("facebook"));

  const campaignBarData = metaCampaigns.slice(0, 10).map((c: any) => ({
    label: c.campaign_name.substring(0, 28) + (c.campaign_name.length > 28 ? "..." : ""),
    value: c.cost,
  }));

  return (
    <DashboardPageShell title="Meta Ads" subtitle="Campanhas, conjuntos de anúncios e desempenho por objetivo">
      <KpiGrid metrics={kpis} columns={3} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Investimento Diário" subtitle="Evolução do gasto — últimos 28 dias" height={280}>
          <LineChartWidget data={dailySeries} lines={[{ key: "Investimento", label: "Investimento", color: "#1877F2" }]} xKey="date" formatValue={(v) => formatCurrency(v, true)} height={260} />
        </ChartCard>
        <ChartCard title="Investimento por Campanha" subtitle="Distribuição do budget" height={280}>
          <HorizontalBarChartWidget data={campaignBarData} formatValue={(v) => formatCurrency(v, true)} height={260} />
        </ChartCard>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Campanhas Meta Ads</h3>
        <DataTableWidget
          data={metaCampaigns as unknown as Record<string, unknown>[]}
          columns={[
            { key: "campaign_name", label: "Campanha", render: (v) => <span style={{ fontWeight: 500, maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
            { key: "impressions", label: "Impressões", align: "right", render: (v) => formatNumber(Number(v), true) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => `${Number(v).toFixed(2)}%` },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "cpa", label: "CPA", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "roas", label: "ROAS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 4 ? "#16A34A" : "#DC2626" }}>{Number(v).toFixed(2)}x</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
