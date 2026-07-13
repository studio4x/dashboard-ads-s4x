import type { Metadata } from "next";
import { AISettingsPanel } from "@/components/admin/AISettingsPanel";
import { BrandingSettingsPanel } from "@/components/admin/BrandingSettingsPanel";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 920 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Configurações</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Credenciais das APIs de IA utilizadas pela plataforma</p>
      </div>

      <BrandingSettingsPanel />
      <AISettingsPanel />
    </div>
  );
}
