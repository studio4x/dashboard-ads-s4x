"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Search, Filter, AlertCircle, Zap, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

export default function KeywordsPage() {
  const { data } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState("all");

  if (!data) return null;

  const keywords = data.keywords || [];
  const hasData = keywords.length > 0;

  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Palavras-Chave" subtitle="Termos com melhor performance">
        <TemplateEmptyState 
          title="Dados de Palavras-Chave"
          description="Nenhuma palavra-chave encontrada. Importe uma planilha Google Ads S4X válida para visualizar esta seção."
        />
      </DashboardPageShell>
    );
  }

  // Filtros
  const campaignOptions = useMemo(() => Array.from(new Set(keywords.map(k => k.campaignName))).sort(), [keywords]);
  const matchOptions = useMemo(() => Array.from(new Set(keywords.map(k => k.matchType))).sort(), [keywords]);

  const filteredKeywords = keywords.filter(k => {
    const matchesSearch = k.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampaign = selectedCampaign === "all" || k.campaignName === selectedCampaign;
    const matchesMatch = selectedMatch === "all" || k.matchType === selectedMatch;
    return matchesSearch && matchesCampaign && matchesMatch;
  });

  const sortedKeywords = [...filteredKeywords].sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // KPIs
  const stats = sortedKeywords.reduce((acc, curr) => ({
    cost: acc.cost + (curr.cost || 0),
    conversions: acc.conversions + (curr.conversions || 0),
    revenue: acc.revenue + (curr.conversionValue || 0),
    clicks: acc.clicks + (curr.clicks || 0),
    impressions: acc.impressions + (curr.impressions || 0),
  }), { cost: 0, conversions: 0, revenue: 0, clicks: 0, impressions: 0 });

  const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
  const roas = stats.cost > 0 ? stats.revenue / stats.cost : 0;

  const kpis = [
    { label: "Palavras-Chave", value: keywords.length, formatted_value: formatNumber(keywords.length), change_percent: 0, change_direction: "neutral" as const },
    { label: "Investimento", value: stats.cost, formatted_value: formatCurrency(stats.cost, true), change_percent: 0, change_direction: "neutral" as const },
    { label: "Conversões", value: stats.conversions, formatted_value: formatNumber(stats.conversions), change_percent: 0, change_direction: "neutral" as const },
    { label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: 0, change_direction: "neutral" as const },
    { label: "ROAS Médio", value: roas, formatted_value: `${roas.toFixed(2)}x`, change_percent: 0, change_direction: "neutral" as const },
  ];

  // Destaques
  const zeroConvHighCost = sortedKeywords.filter(k => (k.conversions || 0) === 0 && (k.cost || 0) > 0).slice(0, 3);
  const topRoas = [...sortedKeywords].sort((a, b) => (b.roas || 0) - (a.roas || 0)).filter(k => (k.conversions || 0) > 0).slice(0, 3);

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

      {/* Filtro de Correspondência */}
      <div className="relative" style={{ width: "150px" }}>
        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        <select 
          value={selectedMatch}
          onChange={(e) => setSelectedMatch(e.target.value)}
          className="w-full pr-4 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white font-medium text-slate-600 cursor-pointer"
          style={{ height: "30px", paddingLeft: "30px" }}
        >
          <option value="all">Correspondência</option>
          {matchOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Busca */}
      <div className="relative" style={{ width: "180px" }}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        <input 
          type="text" 
          placeholder="Buscar palavra..."
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
      title="Palavras-Chave" 
      subtitle="Termos com melhor performance"
      headerActions={headerActions}
    >
      <KpiGrid metrics={kpis} columns={3} />

      {/* Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="card p-4 border-l-4 border-red-500 bg-red-50/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-red-600" size={18} />
            <h4 className="text-sm font-bold text-red-900 uppercase tracking-tight">Oportunidade de Otimização</h4>
          </div>
          <p className="text-xs text-red-700 mb-3 font-medium">Palavras com maior custo e zero conversão no período:</p>
          <div className="space-y-2">
            {zeroConvHighCost.map((k, i) => (
              <div key={i} className="flex justify-between items-center text-[11px] bg-white p-2 rounded border border-red-100 shadow-sm">
                <span className="font-bold text-slate-700 truncate max-w-[180px]">{k.keyword}</span>
                <span className="font-bold text-red-600">{formatCurrency(k.cost || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 border-l-4 border-green-500 bg-green-50/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-green-600" size={18} />
            <h4 className="text-sm font-bold text-green-900 uppercase tracking-tight">Melhor ROAS</h4>
          </div>
          <p className="text-xs text-green-700 mb-3 font-medium">Palavras mais eficientes com conversões:</p>
          <div className="space-y-2">
            {topRoas.map((k, i) => (
              <div key={i} className="flex justify-between items-center text-[11px] bg-white p-2 rounded border border-green-100 shadow-sm">
                <span className="font-bold text-slate-700 truncate max-w-[180px]">{k.keyword}</span>
                <span className="font-bold text-green-600">{k.roas?.toFixed(2)}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-6" style={{ padding: 0 }}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Análise de Palavras-Chave</h3>
        </div>

        <DataTableWidget
          data={sortedKeywords as unknown as Record<string, unknown>[]}
          columns={[
            { key: "keyword", label: "Palavra-chave", render: (v) => <span className="font-bold text-slate-900">{String(v)}</span> },
            { 
              key: "matchType", 
              label: "Tipo", 
              render: (v) => <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{String(v)}</span> 
            },
            { 
              key: "qualityScore", 
              label: "QS", 
              align: "center",
              render: (v) => (
                <span className={cn(
                  "font-bold text-xs",
                  Number(v) >= 8 ? "text-green-600" : Number(v) >= 5 ? "text-amber-600" : "text-red-600"
                )}>
                  {v !== null ? `${v}/10` : "—"}
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
