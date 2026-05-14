import type { Metadata } from "next";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { BarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { mockSearchConsoleKpis, mockSearchConsoleQueries } from "@/data/mock-sheet-search-console";
import { formatNumber, formatDateShort } from "@/lib/formatters";
import type { KpiSummary } from "@/types/entities";
import { CHART_COLORS } from "@/lib/constants";

export const metadata: Metadata = { title: "Search Console" };

const kpis: KpiSummary[] = [
  { label: "Impressões Orgânicas", value: mockSearchConsoleKpis.total_impressions, formatted_value: formatNumber(mockSearchConsoleKpis.total_impressions, true), change_percent: ((mockSearchConsoleKpis.total_impressions - mockSearchConsoleKpis.prev_total_impressions) / mockSearchConsoleKpis.prev_total_impressions) * 100, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Cliques Orgânicos", value: mockSearchConsoleKpis.total_clicks, formatted_value: formatNumber(mockSearchConsoleKpis.total_clicks, true), change_percent: ((mockSearchConsoleKpis.total_clicks - mockSearchConsoleKpis.prev_total_clicks) / mockSearchConsoleKpis.prev_total_clicks) * 100, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "CTR Médio", value: mockSearchConsoleKpis.avg_ctr, formatted_value: `${mockSearchConsoleKpis.avg_ctr.toFixed(2)}%`, change_percent: ((mockSearchConsoleKpis.avg_ctr - mockSearchConsoleKpis.prev_avg_ctr) / mockSearchConsoleKpis.prev_avg_ctr) * 100, change_direction: "up", unit: "percent", description: "vs. período anterior" },
  { label: "Posição Média", value: mockSearchConsoleKpis.avg_position, formatted_value: mockSearchConsoleKpis.avg_position.toFixed(1), change_percent: ((mockSearchConsoleKpis.prev_avg_position - mockSearchConsoleKpis.avg_position) / mockSearchConsoleKpis.prev_avg_position) * 100, change_direction: "up", unit: "number", description: "vs. período anterior (menor = melhor)" },
];

export default function SearchConsolePage() {
  const impressionsData = mockSearchConsoleQueries.slice(0, 8).map((r) => ({
    date: r.query.substring(0, 16),
    Impressões: r.impressions,
  }));

  const clicksData = mockSearchConsoleQueries.slice(0, 8).map((r) => ({
    date: r.query.substring(0, 16),
    Cliques: r.clicks,
  }));

  return (
    <DashboardPageShell title="Search Console" subtitle="Desempenho orgânico — impressões, cliques, CTR e posições">
      <KpiGrid metrics={kpis} columns={4} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Impressões por Query" subtitle="Top 8 queries por volume" height={300}>
          <BarChartWidget data={impressionsData} dataKey="Impressões" xKey="date" color={CHART_COLORS.sc} formatValue={(v) => formatNumber(v, true)} height={280} />
        </ChartCard>
        <ChartCard title="Cliques por Query" subtitle="Top 8 queries por cliques" height={300}>
          <BarChartWidget data={clicksData} dataKey="Cliques" xKey="date" color={CHART_COLORS.info} formatValue={(v) => formatNumber(v)} height={280} />
        </ChartCard>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Queries de Pesquisa</h3>
        <DataTableWidget
          data={mockSearchConsoleQueries as unknown as Record<string, unknown>[]}
          columns={[
            { key: "query", label: "Query", render: (v) => <span style={{ fontWeight: 500, color: "#1E293B" }}>{String(v)}</span> },
            { key: "device", label: "Dispositivo", render: (v) => <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{String(v)}</span> },
            { key: "impressions", label: "Impressões", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => <span style={{ color: Number(v) >= 5 ? "#16A34A" : "#D97706" }}>{Number(v).toFixed(2)}%</span> },
            { key: "position", label: "Posição", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) <= 3 ? "#16A34A" : Number(v) <= 10 ? "#D97706" : "#94A3B8" }}>{Number(v).toFixed(1)}</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
