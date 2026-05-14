"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, PieChart, Database,
  FileSpreadsheet, LayoutTemplate, ScrollText, Settings,
  ChevronRight, BarChart3, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Building2, PieChart, Database,
  FileSpreadsheet, LayoutTemplate, ScrollText, Settings,
};

const navItems = [
  { href: "/admin", label: "Visão Geral", icon: "LayoutDashboard", exact: true },
  { href: "/admin/clients", label: "Clientes", icon: "Building2" },
  { href: "/admin/dashboards", label: "Dashboards", icon: "PieChart" },
  { href: "/admin/data-sources", label: "Fontes de Dados", icon: "Database" },
  { href: "/admin/google-sheets", label: "Google Sheets", icon: "FileSpreadsheet" },
  { href: "/admin/templates", label: "Templates", icon: "LayoutTemplate" },
  { href: "/admin/import-logs", label: "Logs de Importação", icon: "ScrollText" },
  { href: "/admin/settings", label: "Configurações", icon: "Settings" },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        background: "white",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #F1F5F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart3 size={18} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
              Dashboard ADS
            </p>
            <p style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>S4X Platform</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: "#94A3B8", cursor: "pointer", background: "none", border: "none" }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Admin label */}
      <div style={{ padding: "12px 20px 4px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Administração
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 12px 12px" }}>
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = iconMap[item.icon] || LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", isActive && "active")}
              style={{ marginBottom: 2 }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9" }}>
        <Link
          href="/app/dashboards"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#EFF6FF",
            color: "#2563EB",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            transition: "background 0.15s",
          }}
        >
          <BarChart3 size={15} />
          Ver como Cliente
        </Link>
      </div>
    </aside>
  );
}
