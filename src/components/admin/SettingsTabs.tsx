"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, FileClock, LayoutTemplate, Settings2 } from "lucide-react";

const tabs = [
  { href: "/admin/settings", label: "Geral", icon: Settings2, exact: true },
  { href: "/admin/settings/automations", label: "Automações", icon: BellRing, exact: false },
  { href: "/admin/settings/templates", label: "Templates", icon: LayoutTemplate, exact: false },
  { href: "/admin/settings/import-logs", label: "Logs de importação", icon: FileClock, exact: false },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Abas de configurações"
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: 5,
        marginBottom: 24,
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        background: "#F8FAFC",
      }}
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 12px",
              borderRadius: 8,
              border: active ? "1px solid #BFDBFE" : "1px solid transparent",
              background: active ? "#EFF6FF" : "transparent",
              color: active ? "#1D4ED8" : "#475569",
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              textDecoration: "none",
            }}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
