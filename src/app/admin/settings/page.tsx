import type { Metadata } from "next";
import { AISettingsPanel } from "@/components/admin/AISettingsPanel";

export const metadata: Metadata = { title: "Configurações" };

const staticSections = [
  {
    title: "Geral",
    fields: [
      { label: "Nome da Plataforma", value: "Dashboard ADS S4X" },
      { label: "URL Base", value: "https://dashboard-ads-s4x.vercel.app" },
    ],
  },
  {
    title: "Autenticação",
    fields: [
      { label: "Provider", value: "Supabase Auth (Fase 3)" },
      { label: "MFA", value: "Não configurado" },
    ],
  },
  {
    title: "Banco de Dados",
    fields: [
      { label: "Provider", value: "Supabase PostgreSQL (Fase 4)" },
      { label: "Status", value: "Usando dados mock (MVP)" },
    ],
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 920 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Configurações</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Configurações gerais da plataforma</p>
      </div>

      {staticSections.map((section) => (
        <div key={section.title} className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>{section.title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {section.fields.map((field) => (
              <div key={field.label}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 4 }}>{field.label}</label>
                <input
                  readOnly
                  defaultValue={field.value}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    fontSize: 14,
                    color: "#475569",
                    background: "#FAFBFC",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <AISettingsPanel />
    </div>
  );
}
