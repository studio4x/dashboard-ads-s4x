"use client";

import { AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsightRow } from "@/types/sheet-rows";

interface InsightCardProps {
  insight: InsightRow;
  className?: string;
}

const typeConfig = {
  positive: {
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-200",
    iconColor: "#16A34A",
    titleColor: "#15803D",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "#D97706",
    titleColor: "#B45309",
  },
  alert: {
    icon: AlertCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "#DC2626",
    titleColor: "#B91C1C",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "#2563EB",
    titleColor: "#1D4ED8",
  },
};

export function InsightCard({ insight, className }: InsightCardProps) {
  const config = typeConfig[insight.insight_type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 animate-fade-in",
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">
          <Icon size={18} color={config.iconColor} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: config.titleColor }}>
            {insight.title}
          </p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
}

interface InsightsListProps {
  insights: InsightRow[];
  maxItems?: number;
}

export function InsightsList({ insights, maxItems = 5 }: InsightsListProps) {
  const sorted = [...insights]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxItems);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((insight, i) => (
        <InsightCard key={i} insight={insight} />
      ))}
    </div>
  );
}
