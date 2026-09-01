"use client";

import { useState } from "react";
import { Loader2, Save, Mail, Phone, Building2, Globe } from "lucide-react";
import { ClientFinancialAlertsPanel } from "@/components/admin/ClientFinancialAlertsPanel";

interface ClientContactFormProps {
  clientId: string;
  initialCompanyName?: string | null;
  initialWebsiteUrl?: string | null;
  initialEmail?: string | null;
  initialEmails?: string | null;
  initialWhatsapp?: string | null;
  initialPhones?: string | null;
}

export function ClientContactForm({
  clientId,
  initialCompanyName,
  initialWebsiteUrl,
  initialEmail,
  initialEmails,
  initialWhatsapp,
  initialPhones,
}: ClientContactFormProps) {
  const [formData, setFormData] = useState({
    company_name: initialCompanyName || "",
    website_url: initialWebsiteUrl || "",
    email: initialEmail || "",
    emails: initialEmails || "",
    whatsapp: initialWhatsapp || "",
    phones: initialPhones || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setMessage({ type: "error", text: json?.error || "Falha ao salvar contatos." });
        return;
      }
      setMessage({ type: "ok", text: "Contatos salvos com sucesso." });
    } catch {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>
          Contatos para Automação
        </h3>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 size={13} /> Razão social
            </label>
            <input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Razão social da empresa" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={13} /> URL do site
            </label>
            <input value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://www.exemplo.com" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={13} /> E-mail principal
            </label>
            <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contato@cliente.com" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>E-mails adicionais</label>
            <input value={formData.emails} onChange={(e) => setFormData({ ...formData, emails: e.target.value })} placeholder="financeiro@...; marketing@..." style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={13} /> WhatsApp principal
            </label>
            <input value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="5511999999999" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Telefones adicionais</label>
            <input value={formData.phones} onChange={(e) => setFormData({ ...formData, phones: e.target.value })} placeholder="5511888888888; 5511777777777" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
          </div>

          {message && (
            <div style={{ marginTop: 2, borderRadius: 8, padding: "8px 10px", fontSize: 12, border: message.type === "ok" ? "1px solid #BBF7D0" : "1px solid #FECACA", background: message.type === "ok" ? "#F0FDF4" : "#FEF2F2", color: message.type === "ok" ? "#166534" : "#991B1B" }}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={isSaving} style={{ marginTop: 4, padding: "10px 12px", borderRadius: 8, border: "none", background: "#2563EB", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Salvar Contatos
          </button>
        </form>
      </div>

      <ClientFinancialAlertsPanel clientId={clientId} />
    </>
  );
}
