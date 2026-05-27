"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { Search } from "lucide-react";
import { useState } from "react";

export default function CampaignsPage() {
  const { data } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");

  if (!data) return null;

  const baseCampaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const dailyRows = Array.isArray(data.dailyPerformance) ? data.dailyPerformance : [];

  // Map base campaign metadata for status/channel labels.
  const baseCampaignMeta = new Map<string, any>();
  for (const row of baseCampaigns) {
    const key = String(row?.campaignName || "").trim();
    if (!key) continue;
    if (!baseCampaignMeta.has(key)) baseCampaignMeta.set(key, row);
  }

  // Build period-consistent campaigns list from the already filtered dailyPerformance.
  const campaignAgg = new Map<string, any>();
  for (const row of dailyRows) {
    const campaignName = String(row?.campaignName || "").trim();
    if (!campaignName) continue;

    const current = campaignAgg.get(campaignName) || {
      campaignName,
      campaignStatus: baseCampaignMeta.get(campaignName)?.campaignStatus || "PAUSED",
      channelType: baseCampaignMeta.get(campaignName)?.channelType || "SEARCH",
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      avgCpc: 0,
      cpa: 0,
      roas: 0,
    };

    current.impressions += Number(row?.impressions || 0);
    current.clicks += Number(row?.clicks || 0);
    current.cost += Number(row?.cost || row?.total_spend || 0);
    current.conversions += Number(row?.conversions || 0);
    current.conversionValue += Number(row?.conversionValue || row?.total_revenue || 0);
    campaignAgg.set(campaignName, current);
  }

  let campaigns = Array.from(campaignAgg.values());
  campaigns = campaigns.map((item) => {
    const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
    const avgCpc = item.clicks > 0 ? item.cost / item.clicks : 0;
    const cpa = item.conversions > 0 ? item.cost / item.conversions : 0;
    const roas = item.cost > 0 ? item.conversionValue / item.cost : 0;
    return { ...item, ctr, avgCpc, cpa, roas };
  });

  // Fallback for older payloads that may not have dailyPerformance.
  if (campaigns.length === 0 && baseCampaigns.length > 0) {
    campaigns = baseCampaigns;
  }

  const hasData = campaigns.length > 0;

  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Campanhas" subtitle="Performance por campanha detalhada">
        <TemplateEmptyState 
          title="Dados de Campanhas"
          description="Nenhuma campanha encontrada. Importe uma planilha Google Ads S4X válida para visualizar esta seção."
        />
      </DashboardPageShell>
    );
  }

  // Filtro
  const filteredCampaigns = campaigns.filter(c => 
    String(c.campaignName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenação padrão: Custo Desc
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // KPIs da Página
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.campaignStatus === "ENABLED").length;
  
  // Agregações do período (usando o sumário se disponível ou calculando do array atual)
  const stats = sortedCampaigns.reduce((acc, curr) => ({
    impressions: acc.impressions + (curr.impressions || 0),
    clicks: acc.clicks + (curr.clicks || 0),
    cost: acc.cost + (curr.cost || 0),
    conversions: acc.conversions + (curr.conversions || 0),
    revenue: acc.revenue + (curr.conversionValue || 0),
  }), { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 });

  const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
  const cpc = stats.clicks > 0 ? stats.cost / stats.clicks : 0;
  const cpa = stats.conversions > 0 ? stats.cost / stats.conversions : 0;
  const roas = stats.cost > 0 ? stats.revenue / stats.cost : 0;

  const kpis = [
    { label: "Campanhas", value: totalCampaigns, formatted_value: formatNumber(totalCampaigns), change_percent: 0, change_direction: "neutral" as const, description: `${activeCampaigns} ativas agora` },
    { label: "Investimento", value: stats.cost, formatted_value: formatCurrency(stats.cost, true), change_percent: 0, change_direction: "neutral" as const },
    { label: "Conversões", value: stats.conversions, formatted_value: formatNumber(stats.conversions), change_percent: 0, change_direction: "neutral" as const },
    { label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: 0, change_direction: "neutral" as const },
    { label: "CPA Médio", value: cpa, formatted_value: formatCurrency(cpa), change_percent: 0, change_direction: "neutral" as const },
    { label: "ROAS", value: roas, formatted_value: `${roas.toFixed(2)}x`, change_percent: 0, change_direction: "neutral" as const },
  ];

  return (
    <DashboardPageShell title="Campanhas" subtitle="Performance por campanha detalhada">
      <KpiGrid metrics={kpis} columns={3} />

      <div className="card mt-6" style={{ padding: 0 }}>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900">Listagem de Campanhas</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <DataTableWidget
          data={sortedCampaigns as unknown as Record<string, unknown>[]}
          columns={[
            { 
              key: "campaignName", 
              label: "Campanha", 
              render: (v) => <span className="font-medium text-slate-900 truncate block max-w-[200px]" title={String(v)}>{String(v)}</span> 
            },
            { 
              key: "campaignStatus", 
              label: "Status", 
              render: (v) => (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  v === "ENABLED" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                )}>
                  {v === "ENABLED" ? "Ativa" : "Pausada"}
                </span>
              )
            },
            { key: "channelType", label: "Canal", render: (v) => <span className="text-slate-500 text-[11px] font-medium">{String(v)}</span> },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => v !== null ? `${Number(v).toFixed(2)}%` : "—" },
            { key: "avgCpc", label: "CPC", align: "right", render: (v) => v !== null ? formatCurrency(Number(v)) : "—" },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "cpa", label: "CPA", align: "right", render: (v) => Number.isFinite(Number(v)) ? formatCurrency(Number(v)) : "—" },
            { key: "conversionValue", label: "Valor Conv.", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "roas", label: "ROAS", align: "right", render: (v) => v !== null ? `${Number(v).toFixed(2)}x` : "—" },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}

// Helper para classes condicionais (já que cn não está disponível aqui sem import do shadcn utils ou similar)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
