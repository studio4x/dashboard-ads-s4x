"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutDashboard, Search, MessageSquare, Target, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_PAGES } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Search, Facebook: MessageSquare, Target, Users, Globe,
};

interface SharedDashboardTabsProps {
  token: string;
}

export function SharedDashboardTabs({ token }: SharedDashboardTabsProps) {
  const searchParams = useSearchParams();
  const currentPage = searchParams.get("page") || "executive-summary";
  const period = searchParams.get("period");

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
          {DASHBOARD_PAGES.map((page) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", page.key);
            const href = `/share/${token}?${params.toString()}`;
            
            const isActive = currentPage === page.key;
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
      </div>
    </div>
  );
}
