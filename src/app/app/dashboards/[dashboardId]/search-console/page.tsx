"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatNumber } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";

import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function SearchConsolePage() {
  const { data } = useDashboard();

  if (!data) return null;

  const hasData = data.search_console && data.search_console.length > 0;
  
  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Search Console" subtitle="Desempenho orgânico e termos de pesquisa">
        <TemplateEmptyState 
          title="Dados Orgânicos"
          description="Ainda não foram encontrados dados do Search Console. Verifique a integração na planilha."
        />
      </DashboardPageShell>
    );
  }

  const queryData = data.search_console.slice(0, 10).map((r: any) => ({
    label: r.query,
    value: r.clicks,
  }));

  return (
    <DashboardPageShell title="Search Console" subtitle="Desempenho orgânico e termos de pesquisa">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Cliques por Query" subtitle="Top 10 termos orgânicos" height={320}>
          <HorizontalBarChartWidget data={queryData} height={300} />
        </ChartCard>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Queries Detalhadas</h3>
          <DataTableWidget
            data={data.search_console as any}
            columns={[
              { key: "query", label: "Termo de Pesquisa" },
              { key: "clicks", label: "Cliques", align: "right" },
              { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
              { key: "position", label: "Posição", align: "right", render: (v) => Number(v).toFixed(1) },
            ]}
          />
        </div>
      </div>
    </DashboardPageShell>
  );
}
