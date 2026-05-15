"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Search, Filter, Layers, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";

export default function AdsAssetsPage() {
  const { data } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  if (!data) return null;

  const adsAndAssets = data.adsAndAssets || [];
  const hasData = adsAndAssets.length > 0;

  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Anúncios e Recursos" subtitle="Performance dos criativos">
        <TemplateEmptyState 
          title="Dados de Anúncios e Recursos"
          description="Nenhum anúncio ou recurso encontrado. Importe uma planilha Google Ads S4X válida para visualizar esta seção."
        />
      </DashboardPageShell>
    );
  }

  // Filtros
  const typeOptions = useMemo(() => Array.from(new Set(adsAndAssets.map(a => a.assetType))).sort(), [adsAndAssets]);

  const filteredAds = adsAndAssets.filter(a => {
    const matchesSearch = (a.assetText || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || a.assetType === selectedType;
    return matchesSearch && matchesType;
  });

  const sortedAds = [...filteredAds].sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // KPIs da Página (Contagens)
  const totalAssets = adsAndAssets.length;
  const uniqueCampaigns = new Set(adsAndAssets.map(a => a.campaignName)).size;
  const uniqueGroups = new Set(adsAndAssets.map(a => a.adGroupName)).size;
  const activeAssets = adsAndAssets.filter(a => a.adStatus === "ENABLED").length;

  const kpis = [
    { label: "Total de Recursos", value: totalAssets, formatted_value: formatNumber(totalAssets), change_percent: 0, change_direction: "neutral" as const },
    { label: "Campanhas", value: uniqueCampaigns, formatted_value: formatNumber(uniqueCampaigns), change_percent: 0, change_direction: "neutral" as const },
    { label: "Grupos", value: uniqueGroups, formatted_value: formatNumber(uniqueGroups), change_percent: 0, change_direction: "neutral" as const },
    { label: "Recursos Ativos", value: activeAssets, formatted_value: formatNumber(activeAssets), change_percent: 0, change_direction: "neutral" as const },
  ];

  return (
    <DashboardPageShell title="Anúncios e Recursos" subtitle="Performance dos criativos">
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-amber-600 mt-0.5" size={18} />
        <div>
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-tight">Nota sobre as métricas</h4>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            As métricas abaixo são específicas de cada recurso/anúncio. Um mesmo recurso pode aparecer em múltiplos grupos. 
            A soma total nesta página não deve ser utilizada como o investimento consolidado da conta.
          </p>
        </div>
      </div>

      <KpiGrid metrics={kpis} columns={4} />

      <div className="card mt-6" style={{ padding: 0 }}>
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={16} />
            <h3 className="text-sm font-semibold text-slate-900">Listagem de Recursos e Anúncios</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white font-medium"
              >
                <option value="all">Todos os Tipos</option>
                {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input 
                type="text" 
                placeholder="Buscar recurso ou campanha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <DataTableWidget
          data={sortedAds as unknown as Record<string, unknown>[]}
          columns={[
            { 
              key: "assetText", 
              label: "Recurso / Conteúdo", 
              render: (v) => <span className="font-bold text-slate-900 truncate block max-w-[250px]" title={String(v)}>{String(v) || "—"}</span> 
            },
            { 
              key: "assetType", 
              label: "Tipo", 
              render: (v) => <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">{String(v)}</span> 
            },
            { 
              key: "adStatus", 
              label: "Status", 
              render: (v) => (
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter",
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
