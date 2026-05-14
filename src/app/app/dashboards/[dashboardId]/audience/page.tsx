import type { Metadata } from "next";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DonutChartWidget } from "@/components/dashboard/DonutChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { mockAudienceAge, mockAudienceGender, mockAudienceChannel } from "@/data/mock-sheet-audience";
import { formatNumber } from "@/lib/formatters";
import type { KpiSummary } from "@/types/entities";

export const metadata: Metadata = { title: "Público e Origem" };

const totalSessions = mockAudienceChannel.reduce((s, r) => s + r.sessions, 0);
const totalConversions = mockAudienceChannel.reduce((s, r) => s + r.conversions, 0);
const totalRevenue = mockAudienceChannel.reduce((s, r) => s + (r.revenue || 0), 0);

const kpis: KpiSummary[] = [
  { label: "Total de Sessões", value: totalSessions, formatted_value: formatNumber(totalSessions), change_percent: 14.5, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Total de Usuários", value: 22840, formatted_value: formatNumber(22840), change_percent: 16.5, change_direction: "up", unit: "number", description: "vs. período anterior" },
  { label: "Canais Ativos", value: mockAudienceChannel.length, formatted_value: String(mockAudienceChannel.length), change_percent: 0, change_direction: "neutral", unit: "number", description: "fontes de tráfego" },
  { label: "Total de Conversões", value: totalConversions, formatted_value: formatNumber(totalConversions), change_percent: 12.1, change_direction: "up", unit: "number", description: "vs. período anterior" },
];

export default function AudiencePage() {
  const ageDonut = mockAudienceAge.map((r) => ({ name: r.dimension_value, value: r.sessions }));
  const genderDonut = mockAudienceGender.map((r) => ({ name: r.dimension_value, value: r.sessions }));
  const channelBar = mockAudienceChannel.map((r) => ({ label: r.dimension_value, value: r.sessions }));
  const revenueBar = mockAudienceChannel.map((r) => ({ label: r.dimension_value, value: r.revenue || 0 }));

  return (
    <DashboardPageShell title="Público e Origem" subtitle="Demografias, canais de tráfego e fontes de sessões">
      <KpiGrid metrics={kpis} columns={4} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Sessões por Faixa Etária" subtitle="Distribuição de audiência" height={300}>
          <DonutChartWidget data={ageDonut} formatValue={(v) => formatNumber(v)} height={280} />
        </ChartCard>

        <ChartCard title="Sessões por Gênero" subtitle="Distribuição de audiência" height={300}>
          <DonutChartWidget data={genderDonut} formatValue={(v) => formatNumber(v)} height={280} innerRadius={65} outerRadius={100} />
        </ChartCard>

        <ChartCard title="Sessões por Canal" subtitle="Origem do tráfego" height={300}>
          <HorizontalBarChartWidget data={channelBar} formatValue={(v) => formatNumber(v)} height={280} />
        </ChartCard>

        <ChartCard title="Receita por Canal" subtitle="Atribuição de receita por origem" height={300}>
          <HorizontalBarChartWidget data={revenueBar} formatValue={(v) => `R$ ${(v / 1000).toFixed(1)}k`} height={280} />
        </ChartCard>
      </div>
    </DashboardPageShell>
  );
}
