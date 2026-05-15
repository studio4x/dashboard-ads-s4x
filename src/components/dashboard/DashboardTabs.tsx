"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, MessageSquare, Target, Users, Globe, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_PAGES } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Search, Facebook: MessageSquare, Target, Users, Globe, X,
};

interface DashboardTabsProps {
  dashboardId: string;
}

export function DashboardTabs({ dashboardId }: DashboardTabsProps) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        padding: "0 4px",
        scrollbarWidth: "none",
      }}
    >
      {DASHBOARD_PAGES.map((page) => {
        const href = `/app/dashboards/${dashboardId}/${page.key}`;
        const isActive = pathname === href;
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
