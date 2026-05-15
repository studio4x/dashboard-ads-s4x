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
    <div className="py-2">
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 0", scrollbarWidth: "none" }} className="no-scrollbar">
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
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                isActive 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-sm"
              )}
            >
              <Icon size={14} strokeWidth={2.4} />
              {page.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
