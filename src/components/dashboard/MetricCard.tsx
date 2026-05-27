"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DollarSign, Eye, Users, MousePointerClick, Percent, Target, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiSummary } from "@/types/entities";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";

interface MetricCardProps {
  metric: KpiSummary;
  className?: string;
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const { data } = useDashboard();
  const summaryChange = data?.google_ads_summary?.change || data?.meta_ads_summary?.change || data?.summary?.change || {};

  const labelKey = String(metric.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const autoChangeMap: Record<string, number | undefined> = {
    investimento: Number(summaryChange.total_spend ?? summaryChange.cost),
    impressoes: Number(summaryChange.total_impressions ?? summaryChange.impressions),
    alcance: Number(summaryChange.reach),
    cliques: Number(summaryChange.total_clicks ?? summaryChange.clicks),
    ctr: Number(summaryChange.ctr),
    "ctr medio": Number(summaryChange.ctr),
    "cpc medio": Number(summaryChange.cpc ?? summaryChange.avgCpc),
    cpc: Number(summaryChange.cpc ?? summaryChange.avgCpc),
    conversoes: Number(summaryChange.total_conversions ?? summaryChange.conversions),
    "taxa de conversoes": Number(summaryChange.conversionRate),
    cpa: Number(summaryChange.cpa ?? summaryChange.costPerConversion),
    "cpa medio": Number(summaryChange.cpa ?? summaryChange.costPerConversion),
    roas: Number(summaryChange.roas),
    engajamentos: Number(summaryChange.postEngagement ?? summaryChange.engagement),
  };

  const metricProvidedChange = Number(metric.change_percent || 0);
  const inferredChange = autoChangeMap[labelKey];
  const effectiveChange = metricProvidedChange !== 0
    ? metricProvidedChange
    : Number.isFinite(inferredChange as number)
      ? Number(inferredChange)
      : 0;

  const isPositive = effectiveChange > 0;
  const isNegative = effectiveChange < 0;
  const isNeutral = effectiveChange === 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor = isPositive ? "text-green-700" : isNegative ? "text-red-700" : "text-slate-500";
  const trendBadgeBg = isPositive
    ? "bg-green-50 text-green-700"
    : isNegative
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-500";

  const changePrefix = isPositive ? "+" : "";
  const iconByLabel: Record<string, LucideIcon> = {
    investimento: DollarSign,
    impressoes: Eye,
    alcance: Users,
    cliques: MousePointerClick,
    ctr: Percent,
    "ctr medio": Percent,
    "cpc medio": DollarSign,
    cpc: DollarSign,
    conversoes: Target,
    "taxa de conversoes": Percent,
    cpa: DollarSign,
    "cpa medio": DollarSign,
    roas: BarChart3,
    engajamentos: BarChart3,
  };
  const Icon = (metric as any).icon || iconByLabel[labelKey] || BarChart3;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col justify-between min-h-[132px] transition-all hover:shadow-md animate-fade-in",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase leading-tight">
          {metric.label}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
            <Icon size={15} strokeWidth={2.4} />
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
              trendBadgeBg
            )}
          >
            <TrendIcon size={11} />
            {changePrefix}
            {effectiveChange.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-2">
        <p className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">
          {metric.formatted_value}
        </p>
        <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-semibold", trendColor)}>
          {!isNeutral && <TrendIcon size={13} />}
          <span>
            {changePrefix}
            {effectiveChange.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            vs. anterior
          </span>
        </div>
      </div>
    </div>
  );
}

// Grid de KPI cards
interface KpiGridProps {
  metrics: KpiSummary[];
  columns?: 2 | 3 | 4 | 6;
}

export function KpiGrid({ metrics, columns = 4 }: KpiGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {metrics.map((metric, i) => (
        <MetricCard key={i} metric={metric} />
      ))}
    </div>
  );
}
