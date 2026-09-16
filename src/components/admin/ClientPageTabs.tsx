import Link from "next/link";
import { Activity, FileClock, LayoutDashboard } from "lucide-react";

export const CLIENT_PAGE_TABS = [
  { slug: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
  { slug: "alertas-monitoramento", label: "Alertas e monitoramento", Icon: Activity },
  { slug: "automacoes", label: "Automações", Icon: FileClock },
] as const;

export type ClientPageTab = (typeof CLIENT_PAGE_TABS)[number]["slug"];

export function ClientPageTabs({
  clientId,
  activeTab,
}: {
  clientId: string;
  activeTab: ClientPageTab;
}) {
  return (
    <nav
      aria-label="Seções do cliente"
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        borderBottom: "1px solid #E2E8F0",
        marginBottom: 24,
      }}
    >
      {CLIENT_PAGE_TABS.map(({ slug, label, Icon }) => {
        const selected = activeTab === slug;

        return (
          <Link
            key={slug}
            href={`/admin/clients/${clientId}/${slug}`}
            aria-current={selected ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 13px",
              borderBottom: selected ? "2px solid #2563EB" : "2px solid transparent",
              color: selected ? "#1D4ED8" : "#64748B",
              fontSize: 13,
              fontWeight: 700,
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
