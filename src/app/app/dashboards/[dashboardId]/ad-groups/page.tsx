"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";

export default function AdGroupsPage() {
  const { data } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  if (!data) return null;

  const adGroups = data.adGroups || [];
  const hasData = adGroups.length > 0;

  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Grupos de Anúncios" subtitle="Performance por grupo de anúncios">
        <TemplateEmptyState 
          title="Dados de Grupos de Anúncios"
          description="Nenhum grupo de anúncios encontrado. Importe uma planilha Google Ads S4X válida para visualizar esta seção."
        />
      </DashboardPageShell>
    );
  }

  // Opções de filtro de campanha
  const campaignOptions = useMemo(() => {
    const names = Array.from(new Set(adGroups.map(ag => ag.campaignName)));
    return names.sort();
  }, [adGroups]);

  // Filtros
  const filteredAdGroups = adGroups.filter(ag => {
    const matchesSearch = ag.adGroupName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         ag.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampaign = selectedCampaign === "all" || ag.campaignName === selectedCampaign;
    return matchesSearch && matchesCampaign;
  });

  // Ordenação padrão: Custo Desc
  const sortedAdGroups = [...filteredAdGroups].sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // KPIs da Página
  const stats = sortedAdGroups.reduce((acc, curr) => ({
    impressions: acc.impressions + (curr.impressions || 0),
    clicks: acc.clicks + (curr.clicks || 0),
    cost: acc.cost + (curr.cost || 0),
    conversions: acc.conversions + (curr.conversions || 0),
    revenue: acc.revenue + (curr.conversionValue || 0),
  }), { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 });

  const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
  const cpa = stats.conversions > 0 ? stats.cost / stats.conversions : 0;
  const roas = stats.cost > 0 ? stats.revenue / stats.cost : 0;

  const kpis = [
    { label: "Grupos Totais", value: adGroups.length, formatted_value: formatNumber(adGroups.length), change_percent: 0, change_direction: "neutral" as const },
    { label: "Investimento", value: stats.cost, formatted_value: formatCurrency(stats.cost, true), change_percent: 0, change_direction: "neutral" as const },
    { label: "Conversões", value: stats.conversions, formatted_value: formatNumber(stats.conversions), change_percent: 0, change_direction: "neutral" as const },
    { label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: 0, change_direction: "neutral" as const },
    { label: "CPA Médio", value: cpa, formatted_value: formatCurrency(cpa), change_percent: 0, change_direction: "neutral" as const },
    { label: "ROAS", value: roas, formatted_value: `${roas.toFixed(2)}x`, change_percent: 0, change_direction: "neutral" as const },
  ];

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtro de Campanha */}
      <div className="relative" style={{ width: "160px" }}>
        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
        <select 
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full pl-8 pr-4 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white font-medium text-slate-600 cursor-pointer"
          style={{ height: "30px" }}
        >
          <option value="all">Campanhas</option>
          {campaignOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Busca */}
      <div className="relative" style={{ width: "160px" }}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
        <input 
          type="text" 
          placeholder="Buscar grupo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ height: "30px" }}
        />
      </div>
    </div>
  );

  return (
    <DashboardPageShell 
      title="Grupos de Anúncios" 
      subtitle="Performance por grupo de anúncios"
      headerActions={headerActions}
    >
      <KpiGrid metrics={kpis} columns={3} />

      <div className="card mt-6" style={{ padding: 0 }}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Listagem de Grupos</h3>
        </div>

        <DataTableWidget
          data={sortedAdGroups as unknown as Record<string, unknown>[]}
          columns={[
            { 
              key: "campaignName", 
              label: "Campanha", 
              render: (v) => <span className="text-slate-500 text-[11px] font-medium truncate block max-w-[150px]" title={String(v)}>{String(v)}</span> 
            },
            { 
              key: "adGroupName", 
              label: "Grupo de Anúncios", 
              render: (v) => <span className="font-semibold text-slate-900 truncate block max-w-[180px]" title={String(v)}>{String(v)}</span> 
            },
            { 
              key: "adGroupStatus", 
              label: "Status", 
              render: (v) => (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider",
                  v === "ENABLED" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                )}>
                  {v === "ENABLED" ? "ATIVO" : "PAUSADO"}
                </span>
              )
            },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => v !== null ? `${Number(v).toFixed(2)}%` : "—" },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "cpa", label: "CPA", align: "right", render: (v) => v !== null ? formatCurrency(Number(v)) : "—" },
            { key: "roas", label: "ROAS", align: "right", render: (v) => v !== null ? `${Number(v).toFixed(2)}x` : "—" },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
