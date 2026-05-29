"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type SourceLike = {
  id: string;
  name?: string | null;
  google_sheet_sources?: any;
};

interface ClientSourceSyncModalButtonProps {
  clientId: string;
  dashboardId: string;
  dashboardName: string;
  source: SourceLike;
  triggerVariant?: "inline" | "card";
}

function getGSheetConfig(source: SourceLike) {
  return Array.isArray(source.google_sheet_sources)
    ? source.google_sheet_sources[0]
    : source.google_sheet_sources;
}

function getValidationLabel(status: string | null | undefined) {
  if (status === "ok") return "Métricas validadas";
  if (status === "missing_metrics") return "Métricas faltantes";
  return "Validação não configurada";
}

export function ClientSourceSyncModalButton({
  clientId,
  dashboardId,
  dashboardName,
  source,
  triggerVariant = "inline",
}: ClientSourceSyncModalButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const config = useMemo(() => getGSheetConfig(source), [source]);

  async function handleSyncNow() {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/google-sheets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          dashboardId,
          spreadsheetId: config?.spreadsheet_id,
          dataSourceId: source.id,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        const msg =
          result?.error ||
          (Array.isArray(result?.errors) && result.errors[0]?.message) ||
          "Falha ao sincronizar.";
        setErrorMessage(msg);
        return;
      }

      toast("Sincronização concluída com sucesso.", "success");
      window.location.reload();
    } catch {
      setErrorMessage("Erro ao conectar com o servidor.");
    } finally {
      setIsSyncing(false);
    }
  }

  const triggerStyle =
    triggerVariant === "card"
      ? {
          fontSize: 13,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #BFDBFE",
          background: "#EFF6FF",
          color: "#1D4ED8",
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }
      : {
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #BBF7D0",
          background: "#F0FDF4",
          color: "#166534",
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        };

  const validationStatus = String(config?.meta_validation_status || "not_configured");
  const validationNotes = (config?.meta_validation_notes || {}) as any;
  const missingByObjective = validationNotes?.missingLabelsByObjective || validationNotes?.missingByObjective || {};
  const hasMissingDetails = Object.keys(missingByObjective).length > 0;

  return (
    <>
      <button onClick={() => setIsOpen(true)} style={triggerStyle}>
        <RefreshCw size={14} />
        Sincronizar
      </button>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 85, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 680, background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", maxHeight: "86vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>Sincronização da Fonte</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 18, display: "grid", gap: 10 }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 12, color: "#475569" }}>Dashboard</p>
                <p style={{ fontSize: 14, color: "#0F172A", fontWeight: 700 }}>{dashboardName}</p>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 12, color: "#475569" }}>Fonte</p>
                <p style={{ fontSize: 14, color: "#0F172A", fontWeight: 700 }}>{source.name || "Fonte Google Sheets"}</p>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 12, color: "#475569" }}>Spreadsheet ID</p>
                <p style={{ fontSize: 13, color: "#0F172A", wordBreak: "break-all" }}>{config?.spreadsheet_id || "-"}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 12, color: "#475569" }}>Última sincronização</p>
                  <p style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>
                    {config?.last_import_at ? new Date(config.last_import_at).toLocaleString("pt-BR") : "Nunca"}
                  </p>
                </div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 12, color: "#475569" }}>Status da importação</p>
                  <p style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>{config?.last_import_status || "pending"}</p>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 8,
                  border: validationStatus === "missing_metrics" ? "1px solid #FDE68A" : validationStatus === "ok" ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                  background: validationStatus === "missing_metrics" ? "#FFFBEB" : validationStatus === "ok" ? "#F0FDF4" : "#F8FAFC",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {validationStatus === "missing_metrics" ? (
                    <AlertTriangle size={15} color="#B45309" />
                  ) : (
                    <CheckCircle2 size={15} color={validationStatus === "ok" ? "#15803D" : "#64748B"} />
                  )}
                  <p style={{ fontSize: 13, fontWeight: 700, color: validationStatus === "missing_metrics" ? "#92400E" : validationStatus === "ok" ? "#166534" : "#475569" }}>
                    {getValidationLabel(validationStatus)}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: "#475569" }}>
                  {validationNotes?.message || "Ainda não há informações de validação para esta fonte."}
                </p>

                {hasMissingDetails && (
                  <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                    {Object.entries(missingByObjective).map(([objective, fields]) => (
                      <p key={objective} style={{ fontSize: 12, color: "#78350F" }}>
                        <strong>{objective}:</strong> {(fields as string[]).join(", ")}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {errorMessage && (
                <div style={{ border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
                  {errorMessage}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #16A34A", background: "#16A34A", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: isSyncing ? 0.7 : 1 }}
                >
                  {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Sincronizar agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
