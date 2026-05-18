"use client";

import React from "react";
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MousePointerClick,
  Eye,
  Target,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Lightbulb,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

// Cores da referência
const BLUE = "#2563EB";
const BLUE_LIGHT = "#BFDBFE";
const GREEN = "#16A34A";
const RED = "#DC2626";
const TEXT = "#111827";
const MUTED = "#6B7280";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

function KpiCard({ 
  label, 
  value, 
  delta, 
  positive, 
  icon: Icon,
  description = "vs. anterior"
}: any) {
  const DeltaIcon = positive ? TrendingUp : TrendingDown;
  const deltaColor = positive ? GREEN : RED;
  const isNeutral = delta === "0.0%" || delta === "0%";

  return (
    <Card className="p-4 flex flex-col justify-between min-h-[135px] h-auto transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase truncate" title={label}>{label}</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
          <Icon size={15} strokeWidth={2.4} />
        </div>
      </div>
      <div className="mt-2">
        <div className="text-xl sm:text-2xl font-extrabold leading-tight text-slate-900 tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap overflow-hidden" style={{ color: isNeutral ? "#64748B" : deltaColor }}>
          {!isNeutral && <DeltaIcon size={13} strokeWidth={3} />}
          <span>{delta}</span>
          <span className="text-[9px] font-medium text-slate-400 truncate max-w-[80px]" title={description}>
            {description}
          </span>
        </div>
      </div>
    </Card>
  );
}

const tooltipFormatter = (value: any, name?: any) => {
  const nameStr = String(name || "");
  if (nameStr.toLowerCase().includes("investimento") || nameStr.toLowerCase().includes("custo") || nameStr.toLowerCase().includes("receita")) {
    return [formatCurrency(value), name];
  }
  return [value, name];
};

export default function ExecutiveSummaryPage() {
  const { data } = useDashboard();

  if (!data) return null;

  const { summary, overview, audience, insights } = data;
  const current = summary?.current || {};
  const changes = summary?.change || {};

  // Mapeamento de KPIs (7 principais da referência)
  const kpis = [
    {
      label: "Investimento",
      value: formatCurrency(current.total_spend || 0),
      delta: `${(changes.total_spend || 0).toFixed(1)}%`,
      positive: (changes.total_spend || 0) <= 0,
      icon: DollarSign,
    },
    {
      label: "Impressões",
      value: formatNumber(current.total_impressions || 0),
      delta: `${(changes.total_impressions || 0).toFixed(1)}%`,
      positive: (changes.total_impressions || 0) >= 0,
      icon: Eye,
    },
    {
      label: "Cliques",
      value: formatNumber(current.total_clicks || 0),
      delta: `${(changes.total_clicks || 0).toFixed(1)}%`,
      positive: (changes.total_clicks || 0) >= 0,
      icon: MousePointerClick,
    },
    {
      label: "CTR",
      value: `${(current.ctr || 0).toFixed(2)}%`,
      delta: `${(changes.ctr || 0).toFixed(1)}%`,
      positive: (changes.ctr || 0) >= 0,
      icon: Percent,
    },
    {
      label: "CPC médio",
      value: formatCurrency(current.cpc || 0),
      delta: `${(changes.cpc || 0).toFixed(1)}%`,
      positive: (changes.cpc || 0) <= 0,
      icon: DollarSign,
    },
    {
      label: "Conversões",
      value: formatNumber(current.total_conversions || 0),
      delta: `${(changes.total_conversions || 0).toFixed(1)}%`,
      positive: (changes.total_conversions || 0) >= 0,
      icon: Target,
    },
    {
      label: "Custo/conv.",
      value: formatCurrency(current.cpa || 0),
      delta: `${(changes.cpa || 0).toFixed(1)}%`,
      positive: (changes.cpa || 0) <= 0,
      icon: DollarSign,
    },
  ];

  // Gráfico de Evolução (Investimento e Cliques)
  const evolutionData = overview.map((row: any) => ({
    date: formatDateShort(row.date),
    investimento: row.cost || row.total_spend || 0,
    cliques: row.clicks || row.total_clicks || 0,
  }));

  // Gráfico Comparativo (Atual x Anterior)
  const comparisonChartData = [
    { metrica: "Investimento", atual: current.total_spend, anterior: summary?.previous?.total_spend || 0 },
    { metrica: "Impressões", atual: current.total_impressions, anterior: summary?.previous?.total_impressions || 0 },
    { metrica: "Cliques", atual: current.total_clicks, anterior: summary?.previous?.total_clicks || 0 },
    { metrica: "Conversões", atual: current.total_conversions, anterior: summary?.previous?.total_conversions || 0 },
  ];

  // Dispositivos
  const deviceData = audience.length > 0 
    ? audience.filter((a: any) => ["desktop", "mobile", "tablet"].includes(a.dimension_value?.toLowerCase()))
      .map((a: any) => ({
        name: a.dimension_value.charAt(0).toUpperCase() + a.dimension_value.slice(1),
        value: a.sessions || a.clicks || 0
      }))
    : [
      { name: "Desktop", value: 70 },
      { name: "Mobile", value: 30 },
    ];
  
  const totalDeviceValue = deviceData.reduce((acc, curr) => acc + curr.value, 0);

  // Fallback para Insights baseados em regras (Fase 6.5)
  const displayInsights = insights.length > 0 ? insights : [
    ...(changes.total_impressions < 0 ? [{ type: 'negative', text: 'O alcance das campanhas diminuiu em comparação ao período anterior.' }] : []),
    ...(changes.ctr > 5 ? [{ type: 'positive', text: 'A taxa de cliques (CTR) subiu, indicando anúncios mais relevantes para o público.' }] : []),
    ...(current.total_conversions === 0 ? [{ type: 'negative', text: 'Atenção: Nenhuma conversão registrada. Verifique o rastreamento ou a oferta.' }] : []),
    ...(changes.cpc < 0 ? [{ type: 'positive', text: 'O custo por clique (CPC) médio caiu, melhorando a eficiência do investimento.' }] : []),
    ...(insights.length === 0 && overview.length > 0 && changes.total_spend > 0 ? [{ type: 'neutral', text: 'O investimento foi ampliado neste período para buscar maior volume.' }] : [])
  ].slice(0, 3);

  // Fallback para Próximos Passos
  const nextSteps = [
    "Revisar eventos de conversão e rastreamento",
    "Analisar termos de pesquisa para negativar palavras irrelevantes",
    "Ajustar lances em campanhas com melhor CTR",
    "Otimizar a página de destino para dispositivos móveis"
  ];

  return (
    <DashboardPageShell
      title="Resumo Executivo"
      subtitle="Visão consolidada de todas as fontes de tráfego"
      hideHeader
    >
      <div className="flex flex-col gap-6 animate-fade-in pb-10">
        {/* KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {kpis.map((kpi, idx) => (
            <KpiCard key={idx} {...kpi} />
          ))}
        </div>

        {/* Middle Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr_0.9fr] gap-5">
          <Card className="p-6">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Evolução diária de investimento e cliques</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolutionData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: TEXT, fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: MUTED, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: MUTED, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 20 }} />
                  <Bar yAxisId="left" dataKey="investimento" name="Investimento (R$)" fill={BLUE_LIGHT} radius={[4, 4, 0, 0]} barSize={32} />
                  <Line yAxisId="right" type="monotone" dataKey="cliques" name="Cliques" stroke={BLUE} strokeWidth={3} dot={{ r: 4, fill: BLUE }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Comparativo: atual x anterior</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="metrica" tick={{ fill: TEXT, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 20 }} />
                  <Bar dataKey="atual" name="Período atual" fill={BLUE} radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="anterior" name="Anterior" fill={BLUE_LIGHT} radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Sessões por dispositivo</h2>
            <div className="relative h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? BLUE : index === 1 ? BLUE_LIGHT : MUTED} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-slate-900">{totalDeviceValue}</div>
                  <div className="text-xs text-slate-500 uppercase font-medium">Total</div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                 {deviceData.map((d, i) => (
                   <div key={i} className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ background: i === 0 ? BLUE : i === 1 ? BLUE_LIGHT : MUTED }} />
                       <span className="font-medium text-slate-600">{d.name}</span>
                     </div>
                     <span className="font-bold text-slate-900">{((d.value / (totalDeviceValue || 1)) * 100).toFixed(1)}%</span>
                   </div>
                 ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                <Lightbulb size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Resumo de performance</h2>
            </div>
            <div className="space-y-4">
              {displayInsights.length > 0 ? (
                displayInsights.map((insight: any, idx: number) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 items-center">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0",
                      insight.type === 'positive' ? "bg-green-100 text-green-700" : 
                      insight.type === 'negative' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {insight.type === 'positive' ? <TrendingUp size={20} /> : 
                       insight.type === 'negative' ? <AlertTriangle size={20} /> : <BarChart3 size={20} />}
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      {insight.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm italic">Nenhum insight gerado para este período.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                <ClipboardCheck size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Próximos passos sugeridos</h2>
            </div>
            <div className="space-y-3">
              {nextSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 group">
                  <CheckCircle2 size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[15px] font-medium text-slate-700">{step}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardPageShell>
  );
}
