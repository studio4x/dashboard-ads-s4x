"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Search, Filter, HelpCircle, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";

export default function SearchTermsPage() {
  const { data } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  if (!data) return null;

  const searchTerms = data.searchTerms || [];
  const hasData = searchTerms.length > 0;

  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Termos de Pesquisa" subtitle="O que os usuários pesquisaram">
        <TemplateEmptyState 
          title="Dados de Termos de Pesquisa"
          description="Nenhum termo de pesquisa encontrado. Importe uma planilha Google Ads S4X válida para visualizar esta seção."
        />
      </DashboardPageShell>
    );
  }

  // Filtros
  const campaignOptions = useMemo(() => Array.from(new Set(searchTerms.map(st => st.campaignName))).sort(), [searchTerms]);

  const filteredTerms = searchTerms.filter(st => {
    const matchesSearch = st.searchTerm.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampaign = selectedCampaign === "all" || st.campaignName === selectedCampaign;
    return matchesSearch && matchesCampaign;
  });

  const sortedTerms = [...filteredTerms].sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // KPIs
  const stats = sortedTerms.reduce((acc, curr) => ({
    cost: acc.cost + (curr.cost || 0),
    conversions: acc.conversions + (curr.conversions || 0),
    clicks: acc.clicks + (curr.clicks || 0),
    impressions: acc.impressions + (curr.impressions || 0),
  }), { cost: 0, conversions: 0, clicks: 0, impressions: 0 });

  const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
  const cpa = stats.conversions > 0 ? stats.cost / stats.conversions : 0;

  const kpis = [
    { label: "Termos Únicos", value: searchTerms.length, formatted_value: formatNumber(searchTerms.length), change_percent: 0, change_direction: "neutral" as const },
    { label: "Investimento", value: stats.cost, formatted_value: formatCurrency(stats.cost, true), change_percent: 0, change_direction: "neutral" as const },
    { label: "Conversões", value: stats.conversions, formatted_value: formatNumber(stats.conversions), change_percent: 0, change_direction: "neutral" as const },
    { label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: 0, change_direction: "neutral" as const },
    { label: "CPA Médio", value: cpa, formatted_value: formatCurrency(cpa), change_percent: 0, change_direction: "neutral" as const },
  ];

  // Destaques: Termos com conversões
  const termsWithConversions = sortedTerms.filter(st => (st.conversions || 0) > 0).slice(0, 5);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtro de Campanha */}
      <div className="relative" style={{ width: "220px" }}>
        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        <select 
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full pr-4 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white font-medium text-slate-600 cursor-pointer"
          style={{ height: "30px", paddingLeft: "30px" }}
        >
          <option value="all">Campanhas</option>
          {campaignOptions.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {/* Busca */}
      <div className="relative" style={{ width: "180px" }}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        <input 
          type="text" 
          placeholder="Buscar termo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ height: "30px", paddingLeft: "30px" }}
        />
      </div>
    </div>
  );

  return (
    <DashboardPageShell 
      title="Termos de Pesquisa" 
      subtitle="O que os usuários pesquisaram"
      headerActions={headerActions}
    >
      <KpiGrid metrics={kpis} columns={3} />

      {/* Destaques de Intenção */}
      <div className="card mt-6 border-l-4 border-blue-500 bg-blue-50/20 p-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="text-blue-600" size={18} />
          <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight">Termos com Alta Intenção</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {termsWithConversions.map((st, i) => (
            <div key={i} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-bold text-slate-800 line-clamp-2 mb-2 min-h-[30px]" title={st.searchTerm}>
                {st.searchTerm}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{st.termStatus}</span>
                <span className="text-[11px] font-bold text-blue-600">{st.conversions} conv.</span>
              </div>
            </div>
          ))}
          {termsWithConversions.length === 0 && (
            <p className="text-xs text-slate-500 italic col-span-full">Nenhum termo com conversão encontrado no período.</p>
          )}
        </div>
      </div>

      <div className="card mt-6" style={{ padding: 0 }}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Relatório de Termos</h3>
            <div className="group relative">
              <HelpCircle size={14} className="text-slate-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                Mostra o que o usuário realmente digitou antes de clicar no seu anúncio.
              </div>
            </div>
          </div>
        </div>

        <DataTableWidget
          data={sortedTerms as unknown as Record<string, unknown>[]}
          columns={[
            { 
              key: "searchTerm", 
              label: "Termo de Pesquisa", 
              render: (v) => <span className="font-bold text-slate-900 truncate block max-w-[250px]" title={String(v)}>{String(v)}</span> 
            },
            { 
              key: "termStatus", 
              label: "Status", 
              render: (v) => (
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter",
                  v === "ADDED" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                )}>
                  {v === "ADDED" ? "ADICIONADO" : "NÃO ADIC."}
                </span>
              )
            },
            { key: "termMatchType", label: "Correspondência", render: (v) => <span className="text-[10px] text-slate-400 uppercase font-medium">{String(v)}</span> },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => v !== null ? `${Number(v).toFixed(2)}%` : "—" },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "cpa", label: "CPA", align: "right", render: (v) => v !== null ? formatCurrency(Number(v)) : "—" },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
