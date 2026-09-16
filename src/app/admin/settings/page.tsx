import type { Metadata } from "next";
import { AISettingsPanel } from "@/components/admin/AISettingsPanel";
import { BrandingSettingsPanel } from "@/components/admin/BrandingSettingsPanel";
import { AdminNotificationSettingsPanel } from "@/components/admin/AdminNotificationSettingsPanel";
import { SettingsPageShell } from "@/components/admin/SettingsPageShell";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <SettingsPageShell>
      <AdminNotificationSettingsPanel />
      <BrandingSettingsPanel />
      <AISettingsPanel />
    </SettingsPageShell>
  );
}
