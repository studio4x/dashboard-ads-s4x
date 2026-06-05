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
import { applyTemplateMetricConfigToKpis, getDefaultTemplateMetricConfig, getTemplateSectionWidgets, getTemplateMetricSection, getMetricLabel, type TemplateWidgetItem } from "@/lib/dashboard/template-metric-config";
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

  const { summary, overview, audience, insights, google_ads_summary: googleAdsSummary, meta_ads_summary: metaAdsSummary } = data;
  const isAdminView = data.viewerRole === "admin" || data.viewerRole === "owner";
  const current = summary?.current || {};
  const changes = summary?.change || {};
  const objectives = Array.isArray(data.metaObjectives) ? data.metaObjectives : [];
  const templateConfig = data.templateConfig || getDefaultTemplateMetricConfig(data.templateId || "google_ads_s4x", objectives as any, data.metaPrimaryObjective as any);
  const executiveSummaryWidgets = getTemplateSectionWidgets(templateConfig, "executive-summary");
  const executiveSummaryMetrics = getTemplateMetricSection(templateConfig, "executive-summary")?.metrics || [];
  const resolvedExecutiveWidgets = executiveSummaryWidgets
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.order - b.order);
  const executiveWidgetRows = (() => {
    const rows: TemplateWidgetItem[][] = [];
    let currentRow: TemplateWidgetItem[] = [];
    let currentSum = 0;
    resolvedExecutiveWidgets.forEach((widget) => {
      const width = Math.max(10, Math.min(100, widget.widthPercent ?? 100));
      const nextSum = currentSum + width;
      if (currentRow.length > 0 && nextSum > 100.01) {
        rows.push(currentRow);
        currentRow = [widget];
        currentSum = width;
        return;
      }
      currentRow.push(widget);
      currentSum = nextSum;
      if (currentSum >= 99.5) {
        rows.push(currentRow);
        currentRow = [];
        currentSum = 0;
      }
    });
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  })();
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
  const currentFrequency = Number(
    current.frequency
    || (current.total_impressions && current.reach ? current.total_impressions / current.reach : 0)
    || 0
  );
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
    if (metric.startsWith("google_")) return Boolean(googleAdsSummary?.current);
    if (metric.startsWith("meta_")) return Boolean(metaAdsSummary?.current);
    if (["cost", "cost_total", "revenue", "impressions", "reach", "clicks", "ctr", "cpc", "conversions", "postEngagement", "cpa", "roas", "frequency"].includes(metric)) {
      return Boolean(summary?.current || overview.length > 0);
    }
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
      metricKey: "cost_total",
      label: "Investimento Total",
      value: formatCurrency(current.total_spend || 0),
      delta: `${(changes.total_spend || 0).toFixed(1)}%`,
      positive: (changes.total_spend || 0) <= 0,
      icon: DollarSign,
      tooltip: "Investimento consolidado de todas as fontes no período selecionado.",
    },
    {
      metricKey: "revenue",
      label: "Receita",
      value: formatCurrency(current.total_revenue || current.conversionValue || 0),
      delta: `${(changes.total_revenue || changes.conversionValue || 0).toFixed(1)}%`,
      positive: (changes.total_revenue || changes.conversionValue || 0) >= 0,
      icon: TrendingUp,
      tooltip: "Receita total atribuída no período selecionado.",
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
      metricKey: "frequency",
      label: "Frequência",
      value: `${currentFrequency.toFixed(2)}x`,
      delta: `${(changes.frequency || 0).toFixed(1)}%`,
      positive: (changes.frequency || 0) >= 0,
      icon: BarChart3,
      tooltip: "Frequência média de exposição dos anúncios no período.",
    },
    {
      metricKey: "roas",
      label: "ROAS",
      value: `${Number(current.roas || 0).toFixed(2)}x`,
      delta: `${(changes.roas || 0).toFixed(1)}%`,
      positive: (changes.roas || 0) >= 0,
      icon: TrendingUp,
      tooltip: "Retorno sobre o investimento em mídia paga no período.",
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
    ...(googleAdsSummary?.current ? [
      {
        metricKey: "google_cost",
        label: "Investimento Google Ads",
        value: formatCurrency(Number(googleAdsSummary.current.total_spend || 0)),
        delta: `${Number(googleAdsSummary.change?.total_spend || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.total_spend || 0) <= 0,
        icon: DollarSign,
        description: "Google Ads",
        tooltip: "Investimento somente da fonte Google Ads.",
      },
      {
        metricKey: "google_clicks",
        label: "Cliques Google Ads",
        value: formatNumber(Number(googleAdsSummary.current.total_clicks || 0)),
        delta: `${Number(googleAdsSummary.change?.total_clicks || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.total_clicks || 0) >= 0,
        icon: MousePointerClick,
        description: "Google Ads",
        tooltip: "Cliques somente da fonte Google Ads.",
      },
      {
        metricKey: "google_conversions",
        label: "Conversões Google Ads",
        value: formatNumber(Number(googleAdsSummary.current.total_conversions || 0)),
        delta: `${Number(googleAdsSummary.change?.total_conversions || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.total_conversions || 0) >= 0,
        icon: Target,
        description: "Google Ads",
        tooltip: "Conversões somente da fonte Google Ads.",
      },
      {
        metricKey: "google_impressions",
        label: "Impressões Google Ads",
        value: formatNumber(Number(googleAdsSummary.current.total_impressions || 0)),
        delta: `${Number(googleAdsSummary.change?.total_impressions || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.total_impressions || 0) >= 0,
        icon: Eye,
        description: "Google Ads",
        tooltip: "Impressões somente da fonte Google Ads.",
      },
      {
        metricKey: "google_ctr",
        label: "CTR Google Ads",
        value: `${Number(googleAdsSummary.current.ctr || 0).toFixed(2)}%`,
        delta: `${Number(googleAdsSummary.change?.ctr || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.ctr || 0) >= 0,
        icon: Percent,
        description: "Google Ads",
        tooltip: "CTR somente da fonte Google Ads.",
      },
      {
        metricKey: "google_cpc",
        label: "CPC Google Ads",
        value: formatCurrency(Number(googleAdsSummary.current.cpc || 0)),
        delta: `${Number(googleAdsSummary.change?.cpc || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.cpc || 0) <= 0,
        icon: DollarSign,
        description: "Google Ads",
        tooltip: "CPC somente da fonte Google Ads.",
      },
      {
        metricKey: "google_cpa",
        label: "CPA Google Ads",
        value: formatCurrency(Number(googleAdsSummary.current.cpa || 0)),
        delta: `${Number(googleAdsSummary.change?.cpa || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.cpa || 0) <= 0,
        icon: DollarSign,
        description: "Google Ads",
        tooltip: "CPA somente da fonte Google Ads.",
      },
      {
        metricKey: "google_roas",
        label: "ROAS Google Ads",
        value: `${Number(googleAdsSummary.current.roas || 0).toFixed(2)}x`,
        delta: `${Number(googleAdsSummary.change?.roas || 0).toFixed(1)}%`,
        positive: Number(googleAdsSummary.change?.roas || 0) >= 0,
        icon: TrendingUp,
        description: "Google Ads",
        tooltip: "ROAS somente da fonte Google Ads.",
      },
    ] : []),
    ...(metaAdsSummary?.current ? [
      {
        metricKey: "meta_cost",
        label: "Investimento Meta Ads",
        value: formatCurrency(Number(metaAdsSummary.current.total_spend || 0)),
        delta: `${Number(metaAdsSummary.change?.total_spend || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.total_spend || 0) <= 0,
        icon: DollarSign,
        description: "Meta Ads",
        tooltip: "Investimento somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_reach",
        label: "Alcance Meta Ads",
        value: formatNumber(Number(metaAdsSummary.current.reach || metaAdsSummary.current.total_reach || 0)),
        delta: `${Number(metaAdsSummary.change?.reach || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.reach || 0) >= 0,
        icon: Users,
        description: "Meta Ads",
        tooltip: "Alcance somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_clicks",
        label: "Cliques Meta Ads",
        value: formatNumber(Number(metaAdsSummary.current.total_clicks || 0)),
        delta: `${Number(metaAdsSummary.change?.total_clicks || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.total_clicks || 0) >= 0,
        icon: MousePointerClick,
        description: "Meta Ads",
        tooltip: "Cliques somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_conversions",
        label: "Conversões Meta Ads",
        value: formatNumber(Number(metaAdsSummary.current.total_conversions || 0)),
        delta: `${Number(metaAdsSummary.change?.total_conversions || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.total_conversions || 0) >= 0,
        icon: Target,
        description: "Meta Ads",
        tooltip: "Conversões somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_impressions",
        label: "Impressões Meta Ads",
        value: formatNumber(Number(metaAdsSummary.current.total_impressions || 0)),
        delta: `${Number(metaAdsSummary.change?.total_impressions || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.total_impressions || 0) >= 0,
        icon: Eye,
        description: "Meta Ads",
        tooltip: "Impressões somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_ctr",
        label: "CTR Meta Ads",
        value: `${Number(metaAdsSummary.current.ctr || 0).toFixed(2)}%`,
        delta: `${Number(metaAdsSummary.change?.ctr || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.ctr || 0) >= 0,
        icon: Percent,
        description: "Meta Ads",
        tooltip: "CTR somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_cpc",
        label: "CPC Meta Ads",
        value: formatCurrency(Number(metaAdsSummary.current.cpc || 0)),
        delta: `${Number(metaAdsSummary.change?.cpc || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.cpc || 0) <= 0,
        icon: DollarSign,
        description: "Meta Ads",
        tooltip: "CPC somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_cpa",
        label: "CPA Meta Ads",
        value: formatCurrency(Number(metaAdsSummary.current.cpa || 0)),
        delta: `${Number(metaAdsSummary.change?.cpa || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.cpa || 0) <= 0,
        icon: DollarSign,
        description: "Meta Ads",
        tooltip: "CPA somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_cpm",
        label: "CPM Meta Ads",
        value: formatCurrency(Number(metaAdsSummary.current.avgCpm || metaAdsSummary.current.cpm || 0)),
        delta: `${Number(metaAdsSummary.change?.avgCpm || metaAdsSummary.change?.cpm || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.avgCpm || metaAdsSummary.change?.cpm || 0) <= 0,
        icon: DollarSign,
        description: "Meta Ads",
        tooltip: "CPM somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_frequency",
        label: "Frequência Meta Ads",
        value: `${Number(metaAdsSummary.current.frequency || 0).toFixed(2)}x`,
        delta: `${Number(metaAdsSummary.change?.frequency || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.frequency || 0) >= 0,
        icon: BarChart3,
        description: "Meta Ads",
        tooltip: "Frequência somente da fonte Meta Ads.",
      },
      {
        metricKey: "meta_postEngagement",
        label: "Engajamentos Meta Ads",
        value: formatNumber(Number(metaAdsSummary.current.postEngagement || metaAdsSummary.current.total_engagement || 0)),
        delta: `${Number(metaAdsSummary.change?.postEngagement || metaAdsSummary.change?.engagement || 0).toFixed(1)}%`,
        positive: Number(metaAdsSummary.change?.postEngagement || metaAdsSummary.change?.engagement || 0) >= 0,
        icon: BarChart3,
        description: "Meta Ads",
        tooltip: "Engajamentos somente da fonte Meta Ads.",
      },
    ] : []),
  ];

  const filteredKpis = kpis.filter((kpi) => {
    switch (kpi.metricKey) {
      case "cost":
        return hasMetric("cost");
      case "cost_total":
        return hasMetric("cost_total") || (hasMetric("cost") && hasMetric("google_cost") && hasMetric("meta_cost"));
      case "revenue":
        return hasMetric("revenue");
      case "impressions":
        return hasMetric("impressions");
      case "reach":
        return hasMetric("reach");
      case "clicks":
        return hasMetric("clicks");
      case "ctr":
        return hasMetric("ctr");
      case "cpc":
        return hasMetric("cpc");
      case "frequency":
        return hasMetric("frequency");
      case "roas":
        return hasMetric("roas");
      case resultMetric === "postEngagement" ? "postEngagement" : resultMetric === "clicks" ? "clicks" : resultMetric === "reach" ? "reach" : "conversions":
        if (resultMetric === "postEngagement") return hasMetric("postEngagement");
        if (resultMetric === "clicks") return hasMetric("clicks");
        if (resultMetric === "reach") return hasMetric("reach");
        return hasMetric("conversions");
      case "postEngagement":
        return hasMetric("postEngagement");
      case costMetric === "cpc" ? "cpc" : costMetric === "cpm" ? "cpm" : "cpa":
        if (costMetric === "cpc") return hasMetric("cost") && hasMetric("clicks");
        if (costMetric === "cpm") return hasMetric("cost") && hasMetric("impressions");
        if (resultMetric === "postEngagement") return hasMetric("cost") && hasMetric("postEngagement");
        if (resultMetric === "clicks") return hasMetric("cost") && hasMetric("clicks");
        if (resultMetric === "reach") return hasMetric("cost") && hasMetric("reach");
        return hasMetric("cost") && hasMetric("conversions");
      default:
        return true;
    }
  });

  const configuredKpis = applyTemplateMetricConfigToKpis(
    filteredKpis,
    templateConfig,
    "executive-summary",
    data.templateId || "google_ads_s4x",
    data.metaPrimaryObjective as any
  ) as KpiSummary[];

  const normalizeMetricAlias = (key?: string | null) => String(key || "").trim().toLowerCase().replace(/^(google_|meta_)/, "");
  const executiveSummaryMetricOrder = new Map(
    executiveSummaryMetrics.map((metric, index) => [String(metric.key || "").trim().toLowerCase(), index])
  );
  const executiveSummaryExactMetricKeys = new Set(executiveSummaryMetrics.map((metric) => String(metric.key || "").trim().toLowerCase()));
  const deduplicatedKpis = Array.from(
    configuredKpis.reduce((groups, kpi) => {
      const alias = normalizeMetricAlias(kpi.metricKey || kpi.label);
      const group = groups.get(alias) || [];
      group.push(kpi);
      groups.set(alias, group);
      return groups;
    }, new Map<string, KpiSummary[]>()).entries()
  )
    .map(([_, group]) => {
      const exactMatches = group.filter((item) => executiveSummaryExactMetricKeys.has(String(item.metricKey || "").trim().toLowerCase()));
      if (exactMatches.length > 0) {
        return exactMatches.sort((a, b) => {
          const orderA = executiveSummaryMetricOrder.get(String(a.metricKey || "").trim().toLowerCase()) ?? 999;
          const orderB = executiveSummaryMetricOrder.get(String(b.metricKey || "").trim().toLowerCase()) ?? 999;
          return orderA - orderB;
        })[0];
      }

      const genericMetric = group.find((item) => {
        const key = String(item.metricKey || "").trim().toLowerCase();
        return key && !key.startsWith("google_") && !key.startsWith("meta_");
      });
      if (genericMetric) return genericMetric;

      return group.sort((a, b) => {
        const orderA = executiveSummaryMetricOrder.get(String(a.metricKey || "").trim().toLowerCase()) ?? 999;
        const orderB = executiveSummaryMetricOrder.get(String(b.metricKey || "").trim().toLowerCase()) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return normalizeMetricAlias(a.metricKey || a.label).localeCompare(normalizeMetricAlias(b.metricKey || b.label));
      })[0];
    })
    .sort((a, b) => {
      const orderA = executiveSummaryMetricOrder.get(String(a.metricKey || "").trim().toLowerCase()) ?? 999;
      const orderB = executiveSummaryMetricOrder.get(String(b.metricKey || "").trim().toLowerCase()) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return normalizeMetricAlias(a.metricKey || a.label).localeCompare(normalizeMetricAlias(b.metricKey || b.label));
    });

  // Gráfico de Evolução (Investimento e Cliques)
  const resolveExecutiveMetricValue = (key?: string | null, row?: any) => {
    if (!key) return 0;
    const sourceRow = row || current;
    if (key.startsWith("google_")) {
      const googleCurrent = googleAdsSummary?.current || {};
      switch (key) {
        case "google_cost":
          return Number(googleCurrent.total_spend || googleCurrent.cost || 0);
        case "google_revenue":
          return Number(googleCurrent.total_revenue || googleCurrent.conversionValue || 0);
        case "google_impressions":
          return Number(googleCurrent.total_impressions || 0);
        case "google_clicks":
          return Number(googleCurrent.total_clicks || 0);
        case "google_ctr":
          return Number(googleCurrent.ctr || 0);
        case "google_cpc":
          return Number(googleCurrent.cpc || 0);
        case "google_cpa":
          return Number(googleCurrent.cpa || 0);
        case "google_roas":
          return Number(googleCurrent.roas || 0);
        case "google_conversions":
          return Number(googleCurrent.total_conversions || 0);
        default:
          return Number(googleCurrent[key.replace(/^google_/, "")] || 0);
      }
    }
    if (key.startsWith("meta_")) {
      const metaCurrent = metaAdsSummary?.current || {};
      switch (key) {
        case "meta_cost":
          return Number(metaCurrent.total_spend || metaCurrent.cost || 0);
        case "meta_revenue":
          return Number(metaCurrent.total_revenue || metaCurrent.conversionValue || 0);
        case "meta_impressions":
          return Number(metaCurrent.total_impressions || 0);
        case "meta_reach":
          return Number(metaCurrent.reach || metaCurrent.total_reach || 0);
        case "meta_clicks":
          return Number(metaCurrent.total_clicks || 0);
        case "meta_ctr":
          return Number(metaCurrent.ctr || 0);
        case "meta_cpc":
          return Number(metaCurrent.cpc || 0);
        case "meta_cpa":
          return Number(metaCurrent.cpa || 0);
        case "meta_cpm":
          return Number(metaCurrent.avgCpm || metaCurrent.cpm || 0);
        case "meta_frequency":
          return Number(metaCurrent.frequency || 0);
        case "meta_postEngagement":
          return Number(metaCurrent.postEngagement || metaCurrent.total_engagement || 0);
        case "meta_conversions":
          return Number(metaCurrent.total_conversions || 0);
        default:
          return Number(metaCurrent[key.replace(/^meta_/, "")] || 0);
      }
    }
    switch (key) {
      case "cost":
      case "cost_total":
        return Number(sourceRow.total_spend || sourceRow.cost || sourceRow.value || 0);
      case "revenue":
        return Number(sourceRow.total_revenue || sourceRow.conversionValue || sourceRow.revenue || 0);
      case "impressions":
        return Number(sourceRow.total_impressions || sourceRow.impressions || 0);
      case "reach":
        return Number(sourceRow.total_reach || sourceRow.reach || 0);
      case "clicks":
        return Number(sourceRow.total_clicks || sourceRow.clicks || 0);
      case "ctr":
        return Number(sourceRow.ctr || 0);
      case "cpc":
        return Number(sourceRow.cpc || 0);
      case "cpa":
        return Number(sourceRow.cpa || 0);
      case "roas":
        return Number(sourceRow.roas || 0);
      case "frequency":
        return Number(sourceRow.frequency || 0);
      case "postEngagement":
        return Number(sourceRow.postEngagement || sourceRow.total_engagement || 0);
      default:
        return Number(sourceRow[key] || 0);
    }
  };

  const resolveMetricPreviousValue = (key?: string | null) => {
    if (!key) return 0;
    const currentValue = resolveExecutiveMetricValue(key);
    const changeKey = key.replace(/^google_/, "").replace(/^meta_/, "");
    const changePercent =
      key.startsWith("google_")
        ? Number((googleAdsSummary?.change as any)?.[changeKey] ?? (googleAdsSummary?.change as any)?.[key.replace(/^google_/, "")] ?? 0)
        : key.startsWith("meta_")
          ? Number((metaAdsSummary?.change as any)?.[changeKey] ?? (metaAdsSummary?.change as any)?.[key.replace(/^meta_/, "")] ?? 0)
          : Number((changes as any)?.[changeKey] ?? (changes as any)?.[key] ?? 0);
    if (!Number.isFinite(changePercent) || changePercent === -100) return currentValue;
    const factor = 1 + changePercent / 100;
    if (factor === 0) return currentValue;
    return currentValue / factor;
  };

  const buildWidgetTrendData = (widget: TemplateWidgetItem) => {
    const primaryKey = widget.primaryMetricKey || "cost";
    const secondaryKey = widget.secondaryMetricKey || "clicks";
    return overview.map((row: any) => ({
      date: formatDateShort(row.date),
      primary: resolveExecutiveMetricValue(primaryKey, row),
      secondary: secondaryKey ? resolveExecutiveMetricValue(secondaryKey, row) : 0,
    }));
  };

  const buildWidgetComparisonData = (widget: TemplateWidgetItem) => {
    const metricKeys = [widget.primaryMetricKey, widget.secondaryMetricKey].filter(Boolean) as string[];
    return metricKeys.map((metricKey) => ({
      metrica: getMetricLabel(data.templateId || "google_ads_s4x", metricKey as any, data.metaPrimaryObjective as any),
      atual: resolveExecutiveMetricValue(metricKey),
      anterior: resolveMetricPreviousValue(metricKey),
    }));
  };

  const renderWidgetCard = (widget: TemplateWidgetItem, rowCardCount: number) => {
    const title = widget.label || getMetricLabel(data.templateId || "google_ads_s4x", widget.key, data.metaPrimaryObjective as any);
    const widthPercent = Math.max(10, Math.min(100, widget.widthPercent ?? 100));
    const rowGapPx = 20;
    const rowGapTotal = Math.max(0, rowCardCount - 1) * rowGapPx;
    const wrapperStyle = {
      flex: `0 0 calc((100% - ${rowGapTotal}px) * ${widthPercent / 100})`,
      maxWidth: `calc((100% - ${rowGapTotal}px) * ${widthPercent / 100})`,
      minWidth: 0,
      width: "100%",
    } as const;
    if (widget.kind === "device_donut") {
      return (
        <div key={widget.key} style={wrapperStyle}>
          <Card className="p-6 h-full">
            <h2 className="mb-6 text-lg font-bold text-slate-900">{title}</h2>
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
      );
    }

    if (widget.kind === "comparison_chart") {
      const chartData = buildWidgetComparisonData(widget);
      return (
        <div key={widget.key} style={wrapperStyle}>
          <Card className="p-6 h-full">
            <h2 className="mb-6 text-lg font-bold text-slate-900">{title}</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
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
        </div>
      );
    }

    const trendData = buildWidgetTrendData(widget);
    const primaryLabel = getMetricLabel(data.templateId || "google_ads_s4x", widget.primaryMetricKey || "cost", data.metaPrimaryObjective as any);
    const secondaryLabel = widget.secondaryMetricKey ? getMetricLabel(data.templateId || "google_ads_s4x", widget.secondaryMetricKey, data.metaPrimaryObjective as any) : "Série";
    return (
      <div key={widget.key} style={wrapperStyle}>
        <Card className="p-6 h-full">
          <h2 className="mb-6 text-lg font-bold text-slate-900">{title}</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis yAxisId="left" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 20 }} />
                <Bar yAxisId="left" dataKey="primary" name={primaryLabel} fill={BLUE_LIGHT} radius={[4, 4, 0, 0]} barSize={32} />
                {widget.secondaryMetricKey && (
                  <Line yAxisId="right" type="monotone" dataKey="secondary" name={secondaryLabel} stroke={BLUE} strokeWidth={3} dot={{ r: 4, fill: BLUE }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

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
        {executiveWidgetRows.length > 0 ? (
          <div className="flex flex-col gap-5">
            {executiveWidgetRows.map((row, rowIndex) => (
              <div key={`executive-widget-row-${rowIndex}`} className="flex flex-nowrap gap-5 w-full">
                {row.map((widget) => renderWidgetCard(widget, row.length))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 16, borderRadius: 12, border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: 13 }}>
            Nenhum gráfico configurado no resumo executivo do template.
          </div>
        )}

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

