"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, MessageCircle, Save } from "lucide-react";

export function AdminNotificationSettingsPanel() {
  const [emails, setEmails] = useState("");
  const [phones, setPhones] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/notifications", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar os destinatários.");
      setEmails((json.settings?.emails || []).join("\n"));
      setPhones((json.settings?.phones || []).join("\n"));
      setFromEmail(json.settings?.fromEmail || "");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar destinatários." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, phones, fromEmail }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível salvar os destinatários.");
      setMessage({ type: "ok", text: "Destinatários administrativos salvos com sucesso." });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar destinatários." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Notificações administrativas</h2>
        <p style={{ marginTop: 5, fontSize: 12, color: "#64748B", lineHeight: 1.55 }}>
          Destinatários usados por alertas financeiros, dados desatualizados, testes e anomalias. As variáveis da Vercel continuam funcionando como fallback quando estes campos estiverem vazios.
        </p>
      </div>

      {message && (
        <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 8, background: message.type === "ok" ? "#F0FDF4" : "#FEF2F2", color: message.type === "ok" ? "#166534" : "#991B1B", fontSize: 12 }}>
          {message.type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{message.text}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#64748B" }}><Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} /></div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ fontSize: 12, color: "#475569" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontWeight: 700 }}><Mail size={14} /> E-mails dos administradores</span>
            <textarea value={emails} onChange={(event) => setEmails(event.target.value)} rows={3} placeholder="admin@studio4x.com.br\noutro@studio4x.com.br" style={{ width: "100%", resize: "vertical", padding: 10, border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13 }} />
          </label>
          <label style={{ fontSize: 12, color: "#475569" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontWeight: 700 }}><MessageCircle size={14} /> WhatsApps dos administradores</span>
            <textarea value={phones} onChange={(event) => setPhones(event.target.value)} rows={3} placeholder="5511999999999\n5511888888888" style={{ width: "100%", resize: "vertical", padding: 10, border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13 }} />
          </label>
          <label style={{ fontSize: 12, color: "#475569" }}>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>E-mail remetente</span>
            <input type="email" value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} placeholder="rodolfo.medeiros@studio4x.com.br" style={{ width: "100%", padding: 10, border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13 }} />
          </label>
          <div>
            <button type="button" onClick={() => void save()} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: saving ? "#94A3B8" : "#2563EB", color: "#FFF", padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar destinatários
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
