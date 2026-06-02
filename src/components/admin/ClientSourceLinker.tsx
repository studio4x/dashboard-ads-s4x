"use client";

import { useMemo, useState } from "react";
import { Link2, Loader2, Plus, Save, X } from "lucide-react";

type DashboardItem = {
  id: string;
  name?: string | null;
  title?: string | null;
};

type SourceItem = {
  dashboard_id?: string | null;
};

interface ClientSourceLinkerProps {
  clientId: string;
  dashboards: DashboardItem[];
  dataSources: SourceItem[];
  presetDashboardId?: string;
  triggerLabel: string;
  triggerVariant?: "primary" | "secondary";
  serviceAccountEmail?: string;
}

export function ClientSourceLinker({
  clientId,
  dashboards,
  dataSources,
  presetDashboardId,
  triggerLabel,
  triggerVariant = "secondary",
  serviceAccountEmail,
}: ClientSourceLinkerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    dashboardId: presetDashboardId || "",
    name: "",
    spreadsheetId: "",
  });

  const dashboardIdsWithSource = useMemo(() => {
    return new Set(
      dataSources
        .map((source) => String(source.dashboard_id || "").trim())
        .filter(Boolean)
    );
  }, [dataSources]);

  const availableDashboards = useMemo(() => {
    return dashboards.filter((dashboard) => !dashboardIdsWithSource.has(dashboard.id));
  }, [dashboards, dashboardIdsWithSource]);

  function getDashboardLabel(id: string) {
    const dashboard = dashboards.find((item) => item.id === id);
    return dashboard?.name || dashboard?.title || "Dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const selectedDashboardId = formData.dashboardId || presetDashboardId || "";
      const selectedDashboardName = getDashboardLabel(selectedDashboardId);
      const sourceName = formData.name.trim() || `Planilha - ${selectedDashboardName}`;

      const response = await fetch("/api/admin/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          dashboardId: selectedDashboardId,
          name: sourceName,
          spreadsheetId: formData.spreadsheetId.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        setMessage({ type: "error", text: result?.error || "Falha ao vincular a fonte." });
        return;
      }

      setMessage({ type: "ok", text: "Fonte vinculada com sucesso." });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor." });
    } finally {
      setIsSaving(false);
    }
  }

  const triggerStyle =
    triggerVariant === "primary"
      ? {
          fontSize: 13,
          padding: "6px 12px",
          background: "#EFF6FF",
          color: "#2563EB",
          borderRadius: 6,
          border: "1px solid #BFDBFE",
          cursor: "pointer",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }
      : {
          fontSize: 12,
          padding: "6px 10px",
          background: "#FFF7ED",
          color: "#EA580C",
          borderRadius: 6,
          border: "1px solid #FED7AA",
          cursor: "pointer",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={triggerStyle}
      >
        {triggerVariant === "primary" ? <Plus size={14} /> : <Link2 size={13} />}
        {triggerLabel}
      </button>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>Vincular Fonte Google Sheets</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 18, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Dashboard</label>
                <select
                  required
                  value={formData.dashboardId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dashboardId: e.target.value }))}
                  disabled={Boolean(presetDashboardId)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                >
                  <option value="">Selecione um dashboard...</option>
                  {(presetDashboardId ? dashboards.filter((d) => d.id === presetDashboardId) : availableDashboards).map((dashboard) => (
                    <option key={dashboard.id} value={dashboard.id}>
                      {dashboard.name || dashboard.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Nome da Conexão</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Planilha - Cliente X"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>ID da Planilha (Google Sheets)</label>
                <input
                  required
                  value={formData.spreadsheetId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, spreadsheetId: e.target.value }))}
                  placeholder="Cole o ID da planilha"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ borderRadius: 8, border: "1px solid #DBEAFE", background: "#EFF6FF", padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#1E3A8A" }}>E-mail da service account</p>
                  {serviceAccountEmail ? (
                    <code style={{ fontSize: 12, color: "#1E3A8A", background: "#fff", border: "1px solid #BFDBFE", borderRadius: 6, padding: "5px 8px", wordBreak: "break-all" }}>
                      {serviceAccountEmail}
                    </code>
                  ) : (
                    <span style={{ fontSize: 12, color: "#64748B" }}>Configure a variável `NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL` para exibir o e-mail aqui.</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#1E3A8A", lineHeight: 1.5 }}>
                  <strong>Observação:</strong> adicione este e-mail como <strong>Editor</strong> na planilha para permitir leitura e sincronização dos dados.
                </div>
              </div>

              {message && (
                <div
                  style={{
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 12,
                    border: message.type === "ok" ? "1px solid #BBF7D0" : "1px solid #FECACA",
                    background: message.type === "ok" ? "#F0FDF4" : "#FEF2F2",
                    color: message.type === "ok" ? "#166534" : "#991B1B",
                  }}
                >
                  {message.text}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 2 }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #2563EB", background: "#2563EB", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: isSaving ? 0.7 : 1 }}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Salvar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
