import type { Metadata } from "next";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { BarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { mockGa4Events, mockGa4Kpis, mockGa4Pages } from "@/data/mock-sheet-ga4-events";
import { formatNumber, formatPercent, formatDuration } from "@/lib/formatters";
import type { KpiSummary } from "@/types/entities";
import { CHART_COLORS } from "@/lib/constants";

export const metadata: Metadata = { title: "Conversões e Comportamento" };

const kpis: KpiSummary[] = [
  { label: "Sessões", value: mockGa4Kpis.total_sessions, formatted_value: formatNumber(mockGa4Kpis.total_sessions), change_percent: ((mockGa4Kpis.total_sessions - mockGa4Kpis.prev_total_sessions) / mockGa4Kpis.prev_total_sessions) * 100, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Usuários", value: mockGa4Kpis.total_users, formatted_value: formatNumber(mockGa4Kpis.total_users), change_percent: ((mockGa4Kpis.total_users - mockGa4Kpis.prev_total_users) / mockGa4Kpis.prev_total_users) * 100, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Novos Usuários", value: mockGa4Kpis.new_users, formatted_value: formatNumber(mockGa4Kpis.new_users), change_percent: 8.4, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Conversões", value: mockGa4Kpis.total_conversions, formatted_value: formatNumber(mockGa4Kpis.total_conversions), change_percent: 11.2, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Taxa de Conversão", value: mockGa4Kpis.conversion_rate, formatted_value: `${mockGa4Kpis.conversion_rate.toFixed(2)}%`, change_percent: 0.4, change_direction: "up", unit: "percent", description: "vs. período anterior" },
  { label: "Duração Média", value: mockGa4Kpis.avg_session_duration, formatted_value: formatDuration(mockGa4Kpis.avg_session_duration), change_percent: 4.2, change_direction: "up", unit: "number", description: "vs. período anterior" },
];

export default function ConversionsPage() {
  const eventsBarData = mockGa4Events.map((e) => ({
    date: e.event_name,
    Ocorrências: e.event_count,
  }));

  return (
    <DashboardPageShell title="Conversões e Comportamento" subtitle="Eventos GA4, páginas mais visitadas e funil de conversão">
      <KpiGrid metrics={kpis} columns={3} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Eventos GA4" subtitle="Ocorrências por tipo de evento" height={300}>
          <BarChartWidget data={eventsBarData} dataKey="Ocorrências" xKey="date" color={CHART_COLORS.ga4} formatValue={(v) => formatNumber(v)} height={280} />
        </ChartCard>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Funil de Conversão</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Visualizações de Produto", value: 8420, pct: 100 },
              { label: "Adições ao Carrinho", value: 1842, pct: 21.9 },
              { label: "Início do Checkout", value: 684, pct: 8.1 },
              { label: "Compras Concluídas", value: 297, pct: 3.5 },
            ].map((step, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>{step.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{step.value.toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ height: 8, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${step.pct}%`, height: "100%", background: `hsl(${220 - i * 30}, 85%, ${50 + i * 5}%)`, borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{step.pct}% do topo do funil</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Páginas Mais Visitadas</h3>
        <DataTableWidget
          data={mockGa4Pages as unknown as Record<string, unknown>[]}
          columns={[
            { key: "page_path", label: "Página", render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#2563EB" }}>{String(v)}</span> },
            { key: "sessions", label: "Sessões", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "users", label: "Usuários", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "page_views", label: "Page Views", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "avg_session_duration", label: "Duração Média", align: "right", render: (v) => formatDuration(Number(v)) },
            { key: "bounce_rate", label: "Rejeição", align: "right", render: (v) => <span style={{ color: Number(v) > 60 ? "#DC2626" : Number(v) > 40 ? "#D97706" : "#16A34A" }}>{Number(v).toFixed(1)}%</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
