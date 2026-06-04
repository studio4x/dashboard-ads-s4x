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
  Users,
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
import { getMetaConversionLabel, getMetaCostLabel, getMetaCostMetric, getMetaResultMetric, resolveMetaObjectivePresentation } from "@/lib/meta-ads/objectives";
import { applyTemplateMetricConfigToKpis, getDefaultTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";
import type { KpiSummary } from "@/types/entities";

// Cores da referência
const BLUE = "#2563EB";
const BLUE_LIGHT = "#BFDBFE";
const GREEN = "#16A34A";
const RED = "#DC2626";
const TEXT = "#111827";
const MUTED = "#6B7280";

function Card({ children, className = "", style = {}, title }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; title?: string }) {
  return (
    <div 
      className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden", className)}
      title={title}
      style={{ padding: "24px", ...style }}
    >
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
  description = "vs. anterior",
  tooltip = ""
}: any) {
  const DeltaIcon = positive ? TrendingUp : TrendingDown;
  const deltaColor = positive ? GREEN : RED;
  const isNeutral = delta === "0.0%" || delta === "0%";

  return (
    <Card 
      title={tooltip || label}
      style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "135px" }} 
      className="transition-all hover:shadow-md"
    >
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
  const isAdminView = data.viewerRole === "admin" || data.viewerRole === "owner";
  const current = summary?.current || {};
  const changes = summary?.change || {};
  const objectives = Array.isArray(data.metaObjectives) ? data.metaObjectives : [];
  const templateConfig = data.templateConfig || getDefaultTemplateMetricConfig(data.templateId || "google_ads_s4x", objectives as any, data.metaPrimaryObjective as any);
  const availableMetrics = data?.diagnostics?.availableMetrics?.fields || null;
  const resolvedObjectivePresentation = resolveMetaObjectivePresentation({
    primaryObjective: data.metaPrimaryObjective,
    objectives,
    availableFields: availableMetrics,
    dailyRows: Array.isArray(data.dailyPerformance) ? data.dailyPerformance : [],
  });
  const conversionLabel = resolvedObjectivePresentation?.conversionLabel || getMetaConversionLabel(data.metaPrimaryObjective);
  const costLabel = resolvedObjectivePresentation?.costLabel || getMetaCostLabel(data.metaPrimaryObjective);
  const costMetric = resolvedObjectivePresentation?.costMetric || getMetaCostMetric(data.metaPrimaryObjective);
  const resultMetric = resolvedObjectivePresentation?.resultMetric || getMetaResultMetric(data.metaPrimaryObjective);
  const resultCurrentValue =
    resultMetric === "postEngagement" ? Number(current.postEngagement || current.total_engagement || 0)
      : resultMetric === "clicks" ? Number(current.total_clicks || 0)
      : resultMetric === "reach" ? Number(current.total_reach || current.reach || 0)
      : Number(current.total_conversions || 0);
  const resultChangeValue =
    resultMetric === "postEngagement" ? (changes.postEngagement || changes.engagement || 0)
      : resultMetric === "clicks" ? (changes.total_clicks || changes.clicks || 0)
      : resultMetric === "reach" ? (changes.reach || 0)
      : (changes.total_conversions || changes.conversions || 0);
  const hasMetric = (metric: string) => {
    if (!availableMetrics) return true;
    return Boolean(availableMetrics[metric]);
  };

  // Mapeamento de KPIs (7 principais da referência)
  const kpis = [
    {
      metricKey: "cost",
      label: "Investimento",
      value: formatCurrency(current.total_spend || 0),
      delta: `${(changes.total_spend || 0).toFixed(1)}%`,
      positive: (changes.total_spend || 0) <= 0,
      icon: DollarSign,
      tooltip: "Valor total investido em mídia paga no período selecionado.",
    },
    {
      metricKey: "impressions",
      label: "Impressões",
      value: formatNumber(current.total_impressions || 0),
      delta: `${(changes.total_impressions || 0).toFixed(1)}%`,
      positive: (changes.total_impressions || 0) >= 0,
      icon: Eye,
      tooltip: "Quantidade total de vezes que os anúncios foram exibidos.",
    },
    {
      metricKey: "reach",
      label: "Alcance",
      value: formatNumber(current.total_reach || current.reach || 0),
      delta: `${(changes.reach || 0).toFixed(1)}%`,
      positive: (changes.reach || 0) >= 0,
      icon: Users,
      tooltip: "Número de pessoas únicas impactadas pelos anúncios.",
    },
    {
      metricKey: "clicks",
      label: "Cliques",
      value: formatNumber(current.total_clicks || 0),
      delta: `${(changes.total_clicks || 0).toFixed(1)}%`,
      positive: (changes.total_clicks || 0) >= 0,
      icon: MousePointerClick,
      tooltip: "Quantidade de cliques recebidos nos anúncios.",
    },
    {
      metricKey: "ctr",
      label: "CTR",
      value: `${(current.ctr || 0).toFixed(2)}%`,
      delta: `${(changes.ctr || 0).toFixed(1)}%`,
      positive: (changes.ctr || 0) >= 0,
      icon: Percent,
      tooltip: "Taxa de cliques: percentual de impressões que viraram clique.",
    },
    {
      metricKey: "cpc",
      label: "CPC médio",
      value: formatCurrency(current.cpc || 0),
      delta: `${(changes.cpc || 0).toFixed(1)}%`,
      positive: (changes.cpc || 0) <= 0,
      icon: DollarSign,
      tooltip: "Custo médio pago por clique no período.",
    },
    {
      metricKey: resultMetric === "postEngagement" ? "postEngagement" : resultMetric === "clicks" ? "clicks" : resultMetric === "reach" ? "reach" : "conversions",
      label: conversionLabel,
      value: formatNumber(resultCurrentValue),
      delta: `${resultChangeValue.toFixed(1)}%`,
      positive: resultChangeValue >= 0,
      icon: Target,
      tooltip: "Quantidade total de conversões (resultado principal da campanha).",
    },
    {
      metricKey: "postEngagement",
      label: "Engajamentos",
      value: formatNumber(current.postEngagement || current.total_engagement || 0),
      delta: `${(changes.postEngagement || changes.engagement || 0).toFixed(1)}%`,
      positive: (changes.postEngagement || changes.engagement || 0) >= 0,
      icon: BarChart3,
    },
    {
      metricKey: costMetric === "cpc" ? "cpc" : costMetric === "cpm" ? "cpm" : "cpa",
      label: costLabel,
      value: formatCurrency(costMetric === "cpc" ? (current.cpc || 0) : costMetric === "cpm" ? (current.avgCpm || current.cpm || 0) : (current.cpa || 0)),
      delta: `${(costMetric === "cpc" ? (changes.cpc || 0) : costMetric === "cpm" ? (changes.avgCpm || changes.cpm || 0) : (changes.cpa || 0)).toFixed(1)}%`,
      positive: (costMetric === "cpc" ? (changes.cpc || 0) : costMetric === "cpm" ? (changes.avgCpm || changes.cpm || 0) : (changes.cpa || 0)) <= 0,
      icon: DollarSign,
      tooltip: "Custo médio para gerar o resultado principal da campanha.",
    },
  ];

  const filteredKpis = kpis.filter((kpi) => {
    if (kpi.label === "Investimento") return hasMetric("cost");
    if (kpi.label === "Impressões") return hasMetric("impressions");
    if (kpi.label === "Alcance") return hasMetric("reach");
    if (kpi.label === "Cliques") return hasMetric("clicks");
    if (kpi.label === "CTR") return hasMetric("ctr");
    if (kpi.label === "CPC médio") return hasMetric("cpc");
    if (kpi.label === conversionLabel) {
      if (resultMetric === "postEngagement") return hasMetric("postEngagement");
      if (resultMetric === "clicks") return hasMetric("clicks");
      if (resultMetric === "reach") return hasMetric("reach");
      return hasMetric("conversions");
    }
    if (kpi.label === "Engajamentos") return hasMetric("postEngagement");
    if (kpi.label === costLabel) {
      if (costMetric === "cpc") return hasMetric("cost") && hasMetric("clicks");
      if (costMetric === "cpm") return hasMetric("cost") && hasMetric("impressions");
      if (resultMetric === "postEngagement") return hasMetric("cost") && hasMetric("postEngagement");
      if (resultMetric === "clicks") return hasMetric("cost") && hasMetric("clicks");
      if (resultMetric === "reach") return hasMetric("cost") && hasMetric("reach");
      return hasMetric("cost") && hasMetric("conversions");
    }
    return true;
  });

  const configuredKpis = applyTemplateMetricConfigToKpis(
    filteredKpis,
    templateConfig,
    "executive-summary",
    data.templateId || "google_ads_s4x",
    data.metaPrimaryObjective as any
  ) as KpiSummary[];

  const deduplicatedKpis = configuredKpis.filter((kpi, index, arr) => {
    const label = String(kpi.label || "").trim().toLowerCase();
    return arr.findIndex((item) => String(item.label || "").trim().toLowerCase() === label) === index;
  });

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
    {
      metrica: conversionLabel,
      atual: resultCurrentValue,
      anterior: resultMetric === "postEngagement"
        ? Number(summary?.previous?.postEngagement || summary?.previous?.total_engagement || 0)
        : resultMetric === "clicks"
          ? Number(summary?.previous?.total_clicks || 0)
          : resultMetric === "reach"
            ? Number(summary?.previous?.reach || 0)
            : Number(summary?.previous?.total_conversions || 0),
    },
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

  const fallbackInsights = insights.length > 0 ? insights.map((i: any) => ({ type: i.type || "neutral", text: i.text || i.description || "" })) : [];
  const dynamicInsights = [
    ...(hasMetric("impressions") && (changes.total_impressions || 0) < -5
      ? [{ type: "negative", text: "O volume de impressões caiu no período. Avalie orçamento, público e competitividade do leilão." }]
      : []),
    ...(hasMetric("ctr") && (changes.ctr || 0) > 3
      ? [{ type: "positive", text: "O CTR evoluiu positivamente, indicando melhora de relevância entre criativo, oferta e público." }]
      : []),
    ...(hasMetric("cpc") && (changes.cpc || 0) < -3
      ? [{ type: "positive", text: "O CPC médio reduziu, aumentando eficiência de tráfego para o mesmo nível de investimento." }]
      : []),
    ...(hasMetric("conversions") && Number(current.total_conversions || 0) <= 0
      ? [{ type: "negative", text: "Não houve conversões no período. Revise objetivo, evento de conversão e proposta da campanha." }]
      : []),
    ...(hasMetric("cost") && (changes.total_spend || 0) > 10
      ? [{ type: "neutral", text: "O investimento subiu no período. Monitore se o ganho de volume veio com manutenção de eficiência." }]
      : []),
  ];
  const displayInsights = (fallbackInsights.length > 0 ? fallbackInsights : dynamicInsights).filter(i => i.text).slice(0, 4);

  const nextSteps = [
    ...(hasMetric("conversions") ? ["Revisar campanhas e conjuntos com baixo volume de conversões para redistribuir orçamento."] : []),
    ...(hasMetric("ctr") ? ["Priorizar criativos com CTR superior e pausar variações com baixa taxa de clique."] : []),
    ...(hasMetric("cpc") ? ["Ajustar segmentação e posicionamentos para reduzir CPC em grupos menos eficientes."] : []),
    ...(hasMetric("frequency") ? ["Controlar frequência em públicos saturados para reduzir desgaste e queda de resposta."] : []),
    ...(hasMetric("postEngagement") ? ["Usar peças com maior engajamento como base para novas variações de anúncio."] : []),
  ].slice(0, 5);

  const adminRecommendations = [
    ...(hasMetric("cost") && hasMetric("conversions") ? ["Rebalancear orçamento entre campanhas por custo por resultado e tendência de volume."] : []),
    ...(hasMetric("ctr") && hasMetric("cpc") ? ["Rodar teste A/B contínuo de criativos para elevar CTR e reduzir CPC de forma sustentada."] : []),
    ...(hasMetric("frequency") ? ["Implementar rotina de renovação criativa quando frequência ultrapassar limite de fadiga."] : []),
    ...(hasMetric("reach") ? ["Separar prospecting e remarketing com metas de alcance e eficiência independentes."] : []),
    ...(hasMetric("postEngagement") ? ["Cruzar engajamento com resultados de negócio para evitar escalar campanhas vaidosas."] : []),
  ].slice(0, 5);
  const splitIndex = Math.ceil(deduplicatedKpis.length / 2);
  const firstRowKpis = deduplicatedKpis.slice(0, splitIndex);
  const secondRowKpis = deduplicatedKpis.slice(splitIndex);

  return (
    <DashboardPageShell
      title="Resumo Executivo"
      subtitle="Visão consolidada de todas as fontes de tráfego"
      hideHeader
    >
      <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-[1680px] mx-auto">
        {/* KPIs Grid */}
        <div className="hidden md:flex flex-col gap-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.max(firstRowKpis.length, 1)}, minmax(0, 1fr))` }}
          >
            {firstRowKpis.map((kpi, idx) => (
              <div key={`kpi-row-1-${idx}`} className="min-w-0">
                <KpiCard {...kpi} />
              </div>
            ))}
          </div>
          {secondRowKpis.length > 0 && (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(secondRowKpis.length, 1)}, minmax(0, 1fr))` }}
            >
              {secondRowKpis.map((kpi, idx) => (
                <div key={`kpi-row-2-${idx}`} className="min-w-0">
                  <KpiCard {...kpi} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex md:hidden flex-wrap justify-center gap-4">
          {deduplicatedKpis.map((kpi, idx) => (
            <div key={`kpi-mobile-${idx}`} className="w-[160px] sm:w-[170px]">
              <KpiCard {...kpi} />
            </div>
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
              {(nextSteps.length > 0 ? nextSteps : ["Conecte mais métricas na planilha para recomendações mais precisas."]).map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 group">
                  <CheckCircle2 size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[15px] font-medium text-slate-700">{step}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {isAdminView && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                <ClipboardCheck size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Recomendações para Gestor de Tráfego</h2>
            </div>
            <div className="space-y-3">
              {(adminRecommendations.length > 0 ? adminRecommendations : ["Sem métricas suficientes para recomendações avançadas neste período."]).map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0">
                  <CheckCircle2 size={24} className="text-slate-800" />
                  <span className="text-[15px] font-medium text-slate-700">{step}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardPageShell>
  );
}
