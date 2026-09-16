import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import AdminAutomationsPage from "@/app/admin/automations/page";
import FinancialImportLogsPage from "@/app/admin/import-logs/page";
import { TemplatesManager } from "@/components/admin/TemplatesManager";
import { SettingsPageShell } from "@/components/admin/SettingsPageShell";

export const metadata: Metadata = { title: "Configurações" };

type SettingsTab = "automations" | "templates" | "import-logs";

export default async function SettingsTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!["automations", "templates", "import-logs"].includes(tab)) notFound();

  const content: Record<SettingsTab, ReactNode> = {
    automations: <AdminAutomationsPage embedded />,
    templates: <TemplatesManager embedded />,
    "import-logs": <FinancialImportLogsPage embedded />,
  };

  return <SettingsPageShell>{content[tab as SettingsTab]}</SettingsPageShell>;
}
