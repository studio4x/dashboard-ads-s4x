import type { ReactNode } from "react";
import { SettingsTabs } from "@/components/admin/SettingsTabs";

export function SettingsPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1320 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Configurações</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          Branding, notificações, automações, templates e logs da plataforma.
        </p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
