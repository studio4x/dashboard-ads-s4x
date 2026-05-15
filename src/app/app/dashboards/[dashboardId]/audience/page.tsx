"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DonutChartWidget } from "@/components/dashboard/DonutChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { formatCurrency } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";

import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function AudiencePage() {
  const { data } = useDashboard();

  if (!data) return null;

  const hasData = data.audience && data.audience.length > 0;
  
  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Público e Origem" subtitle="Dados demográficos e canais de aquisição">
        <TemplateEmptyState 
          title="Dados de Público"
          description="Ainda não foram encontrados dados de público. Verifique a integração na planilha."
        />
      </DashboardPageShell>
    );
  }

  const channelData = data.audience.map((r: any) => ({
    label: r.dimension_value,
    value: r.sessions,
  }));

  return (
    <DashboardPageShell title="Público e Origem" subtitle="Dados demográficos e canais de aquisição">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Sessões por Canal" subtitle="Origem do tráfego" height={320}>
          <HorizontalBarChartWidget data={channelData} height={300} />
        </ChartCard>

        <ChartCard title="Receita por Canal" subtitle="Fontes mais rentáveis" height={320}>
          <DonutChartWidget 
            data={data.audience.map((r: any) => ({ name: r.dimension_value, value: r.revenue }))} 
            height={300} 
            formatValue={(v) => formatCurrency(v, true)}
          />
        </ChartCard>
      </div>
    </DashboardPageShell>
  );
}
