"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { mockMetaAdsCampaigns, mockMetaAdsDaily, mockMetaAdsKpis } from "@/data/mock-sheet-meta-ads";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import type { KpiSummary } from "@/types/entities";

const kpis: KpiSummary[] = [
  { label: "Investimento", value: mockMetaAdsKpis.total_spend, formatted_value: formatCurrency(mockMetaAdsKpis.total_spend, true), change_percent: ((mockMetaAdsKpis.total_spend - mockMetaAdsKpis.prev_total_spend) / mockMetaAdsKpis.prev_total_spend) * 100, change_direction: "up", unit: "currency", description: "vs. período anterior" },
  { label: "Receita", value: mockMetaAdsKpis.total_revenue, formatted_value: formatCurrency(mockMetaAdsKpis.total_revenue, true), change_percent: ((mockMetaAdsKpis.total_revenue - mockMetaAdsKpis.prev_total_revenue) / mockMetaAdsKpis.prev_total_revenue) * 100, change_direction: "up", unit: "currency", description: "vs. período anterior" },
  { label: "ROAS", value: mockMetaAdsKpis.avg_roas, formatted_value: `${mockMetaAdsKpis.avg_roas.toFixed(2)}x`, change_percent: 4.2, change_direction: "up", unit: "ratio", description: "vs. período anterior" },
  { label: "Conversões", value: mockMetaAdsKpis.total_conversions, formatted_value: formatNumber(mockMetaAdsKpis.total_conversions), change_percent: ((mockMetaAdsKpis.total_conversions - mockMetaAdsKpis.prev_total_conversions) / mockMetaAdsKpis.prev_total_conversions) * 100, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "CPA Médio", value: mockMetaAdsKpis.avg_cpa, formatted_value: formatCurrency(mockMetaAdsKpis.avg_cpa), change_percent: -1.8, change_direction: "up", unit: "currency", description: "vs. período anterior" },
  { label: "CTR Médio", value: mockMetaAdsKpis.avg_ctr, formatted_value: `${mockMetaAdsKpis.avg_ctr.toFixed(2)}%`, change_percent: 0.8, change_direction: "up", unit: "percent", description: "vs. período anterior" },
];

export default function MetaAdsPage() {
  const dailySeries = mockMetaAdsDaily.map((r) => ({
    date: formatDateShort(r.date),
    Investimento: r.value,
  }));

  const campaignBarData = mockMetaAdsCampaigns.map((c) => ({
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
          data={mockMetaAdsCampaigns as unknown as Record<string, unknown>[]}
          columns={[
            { key: "campaign_name", label: "Campanha", render: (v) => <span style={{ fontWeight: 500, maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
            { key: "objective", label: "Objetivo", render: (v) => <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{String(v)}</span> },
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
