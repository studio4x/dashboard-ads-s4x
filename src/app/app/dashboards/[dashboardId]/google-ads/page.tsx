"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { BarChartWidget, HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { mockGoogleAdsCampaigns, mockGoogleAdsDaily, mockGoogleAdsKpis, mockKeywords } from "@/data/mock-sheet-google-ads";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import type { KpiSummary } from "@/types/entities";

const kpis: KpiSummary[] = [
  { label: "Investimento", value: mockGoogleAdsKpis.total_spend, formatted_value: formatCurrency(mockGoogleAdsKpis.total_spend, true), change_percent: ((mockGoogleAdsKpis.total_spend - mockGoogleAdsKpis.prev_total_spend) / mockGoogleAdsKpis.prev_total_spend) * 100, change_direction: "up", unit: "currency", description: "vs. período anterior" },
  { label: "Receita", value: mockGoogleAdsKpis.total_revenue, formatted_value: formatCurrency(mockGoogleAdsKpis.total_revenue, true), change_percent: ((mockGoogleAdsKpis.total_revenue - mockGoogleAdsKpis.prev_total_revenue) / mockGoogleAdsKpis.prev_total_revenue) * 100, change_direction: "up", unit: "currency", description: "vs. período anterior" },
  { label: "ROAS", value: mockGoogleAdsKpis.avg_roas, formatted_value: `${mockGoogleAdsKpis.avg_roas.toFixed(2)}x`, change_percent: 3.8, change_direction: "up", unit: "ratio", description: "vs. período anterior" },
  { label: "Conversões", value: mockGoogleAdsKpis.total_conversions, formatted_value: formatNumber(mockGoogleAdsKpis.total_conversions), change_percent: ((mockGoogleAdsKpis.total_conversions - mockGoogleAdsKpis.prev_total_conversions) / mockGoogleAdsKpis.prev_total_conversions) * 100, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "CPA Médio", value: mockGoogleAdsKpis.avg_cpa, formatted_value: formatCurrency(mockGoogleAdsKpis.avg_cpa), change_percent: -2.1, change_direction: "up", unit: "currency", description: "vs. período anterior" },
  { label: "CTR Médio", value: mockGoogleAdsKpis.avg_ctr, formatted_value: `${mockGoogleAdsKpis.avg_ctr.toFixed(2)}%`, change_percent: 1.4, change_direction: "up", unit: "percent", description: "vs. período anterior" },
];

export default function GoogleAdsPage() {
  const dailySeries = mockGoogleAdsDaily.map((r) => ({
    date: formatDateShort(r.date),
    Investimento: r.value,
  }));

  const campaignBarData = mockGoogleAdsCampaigns.map((c) => ({
    label: c.campaign_name.substring(0, 28) + (c.campaign_name.length > 28 ? "..." : ""),
    value: c.cost,
    roas: c.roas,
  }));

  return (
    <DashboardPageShell title="Google Ads" subtitle="Desempenho de campanhas, grupos e palavras-chave">
      <KpiGrid metrics={kpis} columns={3} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Investimento Diário" subtitle="Evolução do gasto — últimos 28 dias" height={280}>
          <LineChartWidget data={dailySeries} lines={[{ key: "Investimento", label: "Investimento", color: "#4285F4" }]} xKey="date" formatValue={(v) => formatCurrency(v, true)} height={260} />
        </ChartCard>

        <ChartCard title="Investimento por Campanha" subtitle="Distribuição do budget" height={280}>
          <HorizontalBarChartWidget data={campaignBarData} formatValue={(v) => formatCurrency(v, true)} height={260} />
        </ChartCard>
      </div>

      {/* Tabela de campanhas */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Campanhas</h3>
        <DataTableWidget
          data={mockGoogleAdsCampaigns as unknown as Record<string, unknown>[]}
          columns={[
            { key: "campaign_name", label: "Campanha", render: (v) => <span style={{ fontWeight: 500, color: "#1E293B", maxWidth: 220, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
            { key: "impressions", label: "Impressões", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => `${Number(v).toFixed(2)}%` },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "cpc", label: "CPC", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "roas", label: "ROAS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 4 ? "#16A34A" : "#DC2626" }}>{Number(v).toFixed(2)}x</span> },
            { key: "status", label: "Status", render: (v) => <span style={{ padding: "2px 8px", borderRadius: 99, background: v === "active" ? "#DCFCE7" : "#FEE2E2", color: v === "active" ? "#16A34A" : "#DC2626", fontSize: 11, fontWeight: 500 }}>{v === "active" ? "Ativa" : "Pausada"}</span> },
          ]}
        />
      </div>

      {/* Palavras-chave */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Palavras-chave com Melhor Desempenho</h3>
        <DataTableWidget
          data={mockKeywords as unknown as Record<string, unknown>[]}
          columns={[
            { key: "keyword", label: "Palavra-chave", render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
            { key: "match_type", label: "Tipo", render: (v) => <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{String(v)}</span> },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => `${Number(v).toFixed(2)}%` },
            { key: "cpc", label: "CPC", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "quality_score", label: "QS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 8 ? "#16A34A" : Number(v) >= 5 ? "#D97706" : "#DC2626" }}>{String(v)}/10</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
