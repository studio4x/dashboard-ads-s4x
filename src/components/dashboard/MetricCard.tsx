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
  const isNeutral = metric.change_direction === "neutral";

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendClass = isPositive ? "trend-up" : isNegative ? "trend-down" : "trend-neutral";
  const trendBg = isPositive
    ? "bg-green-50 text-green-700"
    : isNegative
    ? "bg-red-50 text-red-700"
    : "bg-slate-100 text-slate-500";

  const changePrefix = isPositive ? "+" : "";

  return (
    <div
      className={cn(
        "card card-hover p-5 flex flex-col gap-3 animate-fade-in",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 leading-tight">
          {metric.label}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
            trendBg
          )}
        >
          <TrendIcon size={11} />
          {changePrefix}
          {metric.change_percent.toFixed(1)}%
        </span>
      </div>

      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none tracking-tight">
          {metric.formatted_value}
        </p>
        {metric.description && (
          <p className="text-xs text-slate-400 mt-1">{metric.description}</p>
        )}
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
