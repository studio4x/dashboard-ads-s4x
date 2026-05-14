"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { generateGoogleAdsKpis } from "@/lib/dashboard/kpi-generator";

export default function GoogleAdsPage() {
  const { data } = useDashboard();

  if (!data) return null;

  const kpis = generateGoogleAdsKpis(data.google_ads);

  const dailySeries = data.google_ads.map((r: any) => ({
    date: formatDateShort(r.date),
    Investimento: r.value,
  }));

  const googleCampaigns = data.campaigns.filter((c: any) => c.platform?.toLowerCase().includes("google"));

  const campaignBarData = googleCampaigns.slice(0, 10).map((c: any) => ({
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

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Campanhas</h3>
        <DataTableWidget
          data={googleCampaigns as unknown as Record<string, unknown>[]}
          columns={[
            { key: "campaign_name", label: "Campanha", render: (v) => <span style={{ fontWeight: 500, color: "#1E293B", maxWidth: 220, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span> },
            { key: "impressions", label: "Impressões", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => `${Number(v).toFixed(2)}%` },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "roas", label: "ROAS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 4 ? "#16A34A" : "#DC2626" }}>{Number(v).toFixed(2)}x</span> },
            { key: "status", label: "Status", render: (v) => <span style={{ padding: "2px 8px", borderRadius: 99, background: v === "active" ? "#DCFCE7" : "#FEE2E2", color: v === "active" ? "#16A34A" : "#DC2626", fontSize: 11, fontWeight: 500 }}>{v === "active" ? "Ativa" : "Pausada"}</span> },
          ]}
        />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Palavras-chave com Melhor Desempenho</h3>
        <DataTableWidget
          data={data.keywords as unknown as Record<string, unknown>[]}
          columns={[
            { key: "keyword", label: "Palavra-chave", render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
            { key: "match_type", label: "Tipo", render: (v) => <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{String(v)}</span> },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "quality_score", label: "QS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 8 ? "#16A34A" : Number(v) >= 5 ? "#D97706" : "#DC2626" }}>{String(v)}/10</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
