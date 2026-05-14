"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { BarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatNumber } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";

export default function ConversionsPage() {
  const { data } = useDashboard();

  if (!data) return null;

  const eventData = data.ga4_events.map((e: any) => ({
    label: e.event_name,
    value: e.event_count,
  }));

  const kpis = [
    { label: "Sessões Totais", value: 12450, formatted_value: "12.450", change_percent: 5.2, change_direction: "up", unit: "number", description: "GA4" },
    { label: "Usuários Ativos", value: 8900, formatted_value: "8.900", change_percent: 3.8, change_direction: "up", unit: "number", description: "GA4" },
    { label: "Taxa de Engajamento", value: 68.4, formatted_value: "68,4%", change_percent: 1.2, change_direction: "up", unit: "percent", description: "Média" },
  ];

  return (
    <DashboardPageShell title="Conversões e Comportamento" subtitle="Eventos de conversão GA4 e funil de comportamento">
      <KpiGrid metrics={kpis as any} columns={3} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Eventos por Nome" subtitle="Top 10 eventos disparados" height={300}>
          <BarChartWidget data={eventData.slice(0, 10)} dataKey="value" height={280} color="#10B981" />
        </ChartCard>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Principais Páginas (Sessões)</h3>
          <DataTableWidget
            data={data.ga4_events as any}
            columns={[
              { key: "event_name", label: "Evento" },
              { key: "event_count", label: "Contagem", align: "right", render: (v) => formatNumber(Number(v)) },
              { key: "users", label: "Usuários", align: "right", render: (v) => formatNumber(Number(v)) },
            ]}
          />
        </div>
      </div>
    </DashboardPageShell>
  );
}
