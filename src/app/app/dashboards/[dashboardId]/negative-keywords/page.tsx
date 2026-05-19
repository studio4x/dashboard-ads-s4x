"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatNumber } from "@/lib/formatters";
import { Search, Filter, ShieldAlert, FileX } from "lucide-react";
import { useState, useMemo } from "react";

export default function NegativeKeywordsPage() {
  const { data } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");

  if (!data) return null;

  const negativeKeywords = data.negativeKeywords || [];
  const hasData = negativeKeywords.length > 0;

  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Palavras-Chave Negativas" subtitle="Filtros de exclusão de tráfego">
        <TemplateEmptyState 
          title="Dados de Palavras Negativas"
          description="Nenhuma palavra-chave negativa encontrada. Importe uma planilha Google Ads S4X válida para visualizar esta seção."
        />
      </DashboardPageShell>
    );
  }

  // Filtros
  const sourceOptions = useMemo(() => Array.from(new Set(negativeKeywords.map(nk => nk.negativeOrigin || "N/A"))).sort(), [negativeKeywords]);

  const filteredNegatives = negativeKeywords.filter(nk => {
    const matchesSearch = nk.negativeKeyword.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         nk.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = selectedSource === "all" || nk.negativeOrigin === selectedSource;
    return matchesSearch && matchesSource;
  });

  // KPIs
  const totalNegatives = negativeKeywords.length;
  const uniqueCampaigns = new Set(negativeKeywords.map(nk => nk.campaignName)).size;
  const sharedLists = negativeKeywords.filter(nk => nk.negativeOrigin === "CAMPAIGN_LIST").length;
  const directNegatives = negativeKeywords.filter(nk => nk.negativeOrigin === "CAMPAIGN").length;

  const kpis = [
    { label: "Total Negativas", value: totalNegatives, formatted_value: formatNumber(totalNegatives), change_percent: 0, change_direction: "neutral" as const, icon: "FileX" },
    { label: "Campanhas Protegidas", value: uniqueCampaigns, formatted_value: formatNumber(uniqueCampaigns), change_percent: 0, change_direction: "neutral" as const },
    { label: "Listas Compartilhadas", value: sharedLists, formatted_value: formatNumber(sharedLists), change_percent: 0, change_direction: "neutral" as const },
    { label: "Negativas Diretas", value: directNegatives, formatted_value: formatNumber(directNegatives), change_percent: 0, change_direction: "neutral" as const },
  ];

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtro de Origem */}
      <div className="relative" style={{ width: "160px" }}>
        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
        <select 
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="w-full pl-8 pr-4 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white font-medium text-slate-600 cursor-pointer"
          style={{ height: "30px" }}
        >
          <option value="all">Todas as Origens</option>
          {sourceOptions.map(src => (
            <option key={src} value={src}>
              {src === "CAMPAIGN_LIST" ? "Lista Compartilhada" : src === "CAMPAIGN" ? "Campanha" : src}
            </option>
          ))}
        </select>
      </div>

      {/* Busca */}
      <div className="relative" style={{ width: "185px" }}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
        <input 
          type="text" 
          placeholder="Buscar palavra ou campanha..."
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
      title="Palavras-Chave Negativas" 
      subtitle="Filtros de exclusão de tráfego"
      headerActions={headerActions}
    >
      <KpiGrid metrics={kpis} columns={4} />

      <div className="card mt-6" style={{ padding: 0 }}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={16} />
            <h3 className="text-sm font-semibold text-slate-900">Listagem de Exclusões</h3>
          </div>
        </div>

        <DataTableWidget
          data={filteredNegatives as unknown as Record<string, unknown>[]}
          columns={[
            { 
              key: "negativeKeyword", 
              label: "Palavra-Chave Negativa", 
              render: (v) => <span className="font-bold text-red-600 truncate block max-w-[250px]" title={String(v)}>{String(v)}</span> 
            },
            { 
              key: "matchType", 
              label: "Correspondência", 
              render: (v) => <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{String(v)}</span> 
            },
            { 
              key: "negativeOrigin", 
              label: "Origem", 
              render: (v) => <span className="text-[10px] text-slate-500 uppercase font-medium">{String(v) === "CAMPAIGN_LIST" ? "Lista Compartilhada" : "Campanha"}</span> 
            },
            { key: "campaignName", label: "Campanha / Escopo", render: (v) => <span className="text-slate-500 text-[11px] truncate block max-w-[200px]" title={String(v)}>{String(v) || "—"}</span> },
            { key: "negativeList", label: "Nome da Lista", render: (v) => <span className="text-slate-400 text-[11px] truncate block max-w-[150px]" title={String(v)}>{String(v) || "—"}</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
