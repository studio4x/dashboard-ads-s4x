"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Search, MessageSquare, Target, Users, Globe, X
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
}

export function DashboardTabs({ dashboardId }: DashboardTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading } = useDashboard();

  if (loading || !data) {
    return <div style={{ minHeight: 36 }} aria-hidden="true" />;
  }

  const visiblePageKeys = data?.templatePageKeys?.length ? data.templatePageKeys : getVisiblePages(data?.templateId);
  const filteredPages = DASHBOARD_PAGES.filter(p => visiblePageKeys.includes(p.key));

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
        const paramsString = searchParams.toString();
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
    </div>
  );
}
