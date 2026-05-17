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
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function GoogleAdsPage() {
  const { data } = useDashboard();

  if (!data) return null;

  const hasData = data.google_ads && data.google_ads.length > 0;
  
  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Google Ads" subtitle="Desempenho de campanhas, grupos e palavras-chave">
        <TemplateEmptyState 
          title="Dados do Google Ads"
          description="Ainda não foram encontrados dados do Google Ads. Verifique se a planilha conectada segue o modelo S4X."
        />
      </DashboardPageShell>
    );
  }

  const kpis = generateGoogleAdsKpis(data.google_ads, data.google_ads_summary);

  const dailySeries = data.google_ads.map((r: any) => ({
    date: formatDateShort(r.date),
    Investimento: r.cost !== undefined ? r.cost : r.value || 0,
  }));

  const googleCampaigns = data.campaigns.filter((c: any) => 
    (c.platform?.toLowerCase().includes("google")) || (data.templateId === "google_ads_s4x")
  );

  const campaignBarData = googleCampaigns.slice(0, 10).map((c: any) => ({
    label: (c.campaignName || c.campaign_name || "").substring(0, 28) + ((c.campaignName || c.campaign_name || "").length > 28 ? "..." : ""),
    value: c.cost,
    roas: c.roas,
  }));

  return (
    <DashboardPageShell title="Google Ads" subtitle="Desempenho de campanhas, grupos e palavras-chave">
      <KpiGrid metrics={kpis} columns={3} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Investimento Diário" subtitle="Evolução do gasto no período" height={280}>
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
            { key: "campaignName", label: "Campanha", render: (v, row) => <span style={{ fontWeight: 500, color: "#1E293B", maxWidth: 220, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v || row.campaign_name || "")}</span> },
            { key: "impressions", label: "Impressões", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => `${Number(v).toFixed(2)}%` },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "roas", label: "ROAS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 4 ? "#16A34A" : "#DC2626" }}>{Number(v).toFixed(2)}x</span> },
            { key: "campaignStatus", label: "Status", render: (v, row) => {
              const status = v || row.status || row.campaignStatus || "ENABLED";
              const isActive = status === "active" || status === "ENABLED";
              return <span style={{ padding: "2px 8px", borderRadius: 99, background: isActive ? "#DCFCE7" : "#FEE2E2", color: isActive ? "#16A34A" : "#DC2626", fontSize: 11, fontWeight: 500 }}>{isActive ? "Ativa" : "Pausada"}</span> 
            }},
          ]}
        />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Palavras-chave com Melhor Desempenho</h3>
        <DataTableWidget
          data={data.keywords as unknown as Record<string, unknown>[]}
          columns={[
            { key: "keyword", label: "Palavra-chave", render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
            { key: "matchType", label: "Tipo", render: (v, row) => <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{String(v || row.match_type || "")}</span> },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "qualityScore", label: "QS", align: "right", render: (v, row) => <span style={{ fontWeight: 600, color: Number(v || row.quality_score) >= 8 ? "#16A34A" : Number(v || row.quality_score) >= 5 ? "#D97706" : "#DC2626" }}>{String(v || row.quality_score || "—")}/10</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
