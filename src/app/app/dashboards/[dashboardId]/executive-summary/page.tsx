"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { DonutChartWidget } from "@/components/dashboard/DonutChartWidget";
import { InsightsList } from "@/components/dashboard/InsightCard";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { generateExecutiveKpis } from "@/lib/dashboard/kpi-generator";

export default function ExecutiveSummaryPage() {
  const { data } = useDashboard();

  if (!data) return null; // O Shell trata loading/error

  // Série para gráfico de evolução do investimento (Google + Meta)
  const spendSeries = data.overview.map((row: any) => ({
    date: formatDateShort(row.date),
    "Google Ads": row.google_ads_spend,
    "Meta Ads": row.meta_ads_spend,
  }));

  // Receita vs Investimento
  const revenueSeries = data.overview.map((row: any) => ({
    date: formatDateShort(row.date),
    "Receita": row.total_revenue,
    "Investimento": row.total_spend,
  }));

  // Canal para donut
  const channelDonut = data.audience.map((r: any) => ({
    name: r.dimension_value,
    value: r.sessions,
  }));

  const kpis = generateExecutiveKpis(data.overview, data.summary);

  return (
    <DashboardPageShell
      title="Resumo Executivo"
      subtitle={`Visão consolidada de todas as fontes de tráfego`}
    >
      {/* KPIs */}
      <KpiGrid metrics={kpis} columns={3} />

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
          <InsightsList insights={data.insights} maxItems={4} />
        </div>
      </div>
    </DashboardPageShell>
  );
}
