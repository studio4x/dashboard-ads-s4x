"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiSummary } from "@/types/entities";

interface MetricCardProps {
  metric: KpiSummary;
  className?: string;
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const isPositive = metric.change_direction === "up";
  const isNegative = metric.change_direction === "down";
  const isNeutral = metric.change_direction === "neutral" || metric.change_percent === 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor = isPositive ? "text-green-700" : isNegative ? "text-red-700" : "text-slate-500";
  const trendBadgeBg = isPositive
    ? "bg-green-50 text-green-700"
    : isNegative
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-500";

  const changePrefix = isPositive ? "+" : "";

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
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
            trendBadgeBg
          )}
        >
          <TrendIcon size={11} />
          {changePrefix}
          {metric.change_percent.toFixed(1)}%
        </span>
      </div>

      <div className="mt-2">
        <p className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">
          {metric.formatted_value}
        </p>
        <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-semibold", trendColor)}>
          {!isNeutral && <TrendIcon size={13} />}
          <span>
            {changePrefix}
            {metric.change_percent.toFixed(1)}%
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
