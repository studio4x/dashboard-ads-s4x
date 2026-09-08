"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3, LayoutDashboard, Search, MessageSquare, Target, Users, Globe, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_PAGES } from "@/lib/constants";
import { useDashboard } from "./DashboardDataContext";
import { getVisiblePages } from "@/lib/dashboard/templates";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Search, Facebook: MessageSquare, Target, Users, Globe, X,
};

interface DashboardTabsProps {
  dashboardId: string;
  showPerformanceAnalysis?: boolean;
}

export function DashboardTabs({ dashboardId, showPerformanceAnalysis = false }: DashboardTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading } = useDashboard();

  if (loading || !data) {
    return <div style={{ minHeight: 36 }} aria-hidden="true" />;
  }

  const visiblePageKeys = data?.templatePageKeys?.length ? data.templatePageKeys : getVisiblePages(data?.templateId);
  const filteredPages = DASHBOARD_PAGES.filter(p => visiblePageKeys.includes(p.key));
  const paramsString = searchParams.toString();

  return (
    <div
      className="dashboard-tabs-strip"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "0 4px",
        scrollbarWidth: "none",
      }}
    >
      {filteredPages.map((page) => {
        const basePath = `/app/dashboards/${dashboardId}/${page.key}`;
        const isActive = pathname === basePath;
        const href = paramsString ? `${basePath}?${paramsString}` : basePath;
        const Icon = iconMap[page.icon] || LayoutDashboard;

        return (
          <Link
            key={page.key}
            href={href}
            className={cn("dashboard-tab", isActive && "active")}
          >
            <Icon size={14} />
            {page.label}
          </Link>
        );
      })}

      {showPerformanceAnalysis && (() => {
        const basePath = `/app/dashboards/${dashboardId}/performance-analysis`;
        const href = paramsString ? `${basePath}?${paramsString}` : basePath;
        return (
          <Link
            href={href}
            className={cn("dashboard-tab", pathname === basePath && "active")}
            title="Diagnóstico e plano de ação com dados granulares do Google Ads"
          >
            <BarChart3 size={14} />
            Análise de Performance
          </Link>
        );
      })()}
    </div>
  );
}
