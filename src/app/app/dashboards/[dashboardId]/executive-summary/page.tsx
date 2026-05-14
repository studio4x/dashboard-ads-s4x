"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { DonutChartWidget } from "@/components/dashboard/DonutChartWidget";
import { InsightsList } from "@/components/dashboard/InsightCard";
import { mockKpiSummary, mockOverviewRows } from "@/data/mock-sheet-overview";
import { mockInsights } from "@/data/mock-sheet-insights";
import { mockAudienceChannel } from "@/data/mock-sheet-audience";
import { formatCurrency, formatDateShort } from "@/lib/formatters";

export const metadata: Metadata = { title: "Resumo Executivo" };

export default function ExecutiveSummaryPage() {
  // Série para gráfico de evolução do investimento (Google + Meta)
  const spendSeries = mockOverviewRows.map((row) => ({
    date: formatDateShort(row.date),
    "Google Ads": row.google_ads_spend,
    "Meta Ads": row.meta_ads_spend,
  }));

  // Receita vs Investimento
  const revenueSeries = mockOverviewRows.map((row) => ({
    date: formatDateShort(row.date),
    "Receita": row.total_revenue,
    "Investimento": row.total_spend,
  }));

  // Canal para donut
  const channelDonut = mockAudienceChannel.map((r) => ({
    name: r.dimension_value,
    value: r.sessions,
  }));

  return (
    <DashboardPageShell
      title="Resumo Executivo"
      subtitle="Visão consolidada de todas as fontes de tráfego — últimos 30 dias"
    >
      {/* KPIs */}
      <KpiGrid metrics={mockKpiSummary} columns={3} />

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard
          title="Evolução do Investimento"
          subtitle="Google Ads vs. Meta Ads — por dia"
          height={280}
        >
          <LineChartWidget
            data={spendSeries}
            lines={[
              { key: "Google Ads", label: "Google Ads", color: "#4285F4" },
              { key: "Meta Ads", label: "Meta Ads", color: "#1877F2" },
            ]}
            xKey="date"
            formatValue={(v) => formatCurrency(v, true)}
            height={260}
          />
        </ChartCard>

        <ChartCard
          title="Receita vs. Investimento"
          subtitle="Total diário consolidado"
          height={280}
        >
          <LineChartWidget
            data={revenueSeries}
            lines={[
              { key: "Receita", label: "Receita", color: "#16A34A" },
              { key: "Investimento", label: "Investimento", color: "#2563EB" },
            ]}
            xKey="date"
            formatValue={(v) => formatCurrency(v, true)}
            height={260}
          />
        </ChartCard>

        <ChartCard title="Sessões por Canal" subtitle="Distribuição dos últimos 30 dias" height={300}>
          <DonutChartWidget
            data={channelDonut}
            formatValue={(v) => v.toLocaleString("pt-BR")}
            height={280}
          />
        </ChartCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>
            💡 Insights e Recomendações
          </h3>
          <InsightsList insights={mockInsights} maxItems={4} />
        </div>
      </div>
    </DashboardPageShell>
  );
}
