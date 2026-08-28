"use client";

import Link from "next/link";
import { BarChart3, CheckCircle2, Database, FileSpreadsheet, Loader2, Share2, X } from "lucide-react";

type DashboardSourceOption = {
  id: string;
  name: string;
  type: string;
};

type DashboardSourceModalProps = {
  dashboard: {
    id: string;
    name: string;
    client_id: string;
    dashboard_type?: string | null;
    metrics_source_id?: string | null;
  };
  sources: DashboardSourceOption[];
  selectedSourceId: string;
  saving: boolean;
  onSelect: (sourceId: string) => void;
  onConfirm: () => void;
  onConfigureGoogleSheets: () => void;
  onClose: () => void;
};

function getSourceTypeLabel(type: string) {
  if (type === "meta_ads") return "Meta Marketing API";
  if (type === "google_ads") return "Google Ads API";
  if (type === "google_sheets") return "Google Sheets";
  if (type === "ga4") return "GA4";
  if (type === "search_console") return "Search Console";
  return "Fonte de dados";
}

export function DashboardSourceModal({
  dashboard,
  sources,
  selectedSourceId,
  saving,
  onSelect,
  onConfirm,
  onConfigureGoogleSheets,
  onClose,
}: DashboardSourceModalProps) {
  const hasCurrentSource = sources.some((source) => source.id === dashboard.metrics_source_id);
  const title = hasCurrentSource ? "Editar fonte" : "Conectar fonte";
  const dashboardType = String(dashboard.dashboard_type || "");
  const supportsMetaAds = dashboardType.includes("meta");
  const supportsGoogleAds = dashboardType.includes("google");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-source-modal-title"
      style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div style={{ width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", background: "#FFFFFF", borderRadius: 14, boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)", border: "1px solid #E2E8F0" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="dashboard-source-modal-title" style={{ fontSize: 18, fontWeight: 750, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={20} color="#2563EB" /> {title}
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: "#64748B" }}>{dashboard.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Fontes disponíveis para este dashboard</h3>
            <p style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Escolha qual fonte ativa fornecerá as métricas e os próximos relatórios.</p>

            {sources.length === 0 ? (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 9, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E", fontSize: 13 }}>
                Ainda não há uma fonte configurada para este dashboard. Escolha abaixo o tipo de fonte que deseja configurar.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 9 }}>
                {sources.map((source) => {
                  const selected = selectedSourceId === source.id;
                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => onSelect(source.id)}
                      disabled={saving}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 9, border: selected ? "1px solid #60A5FA" : "1px solid #E2E8F0", background: selected ? "#EFF6FF" : "#FFFFFF", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", cursor: "pointer" }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source.name}</strong>
                        <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "#64748B" }}>{getSourceTypeLabel(source.type)}</span>
                      </span>
                      {selected ? <CheckCircle2 size={19} color="#2563EB" /> : <span style={{ width: 18, height: 18, borderRadius: 999, border: "1px solid #CBD5E1", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ borderTop: "1px solid #E2E8F0", paddingTop: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Configurar uma nova fonte</h3>
            <p style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>A nova fonte será configurada para este cliente e dashboard.</p>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 9 }}>
              <button type="button" onClick={onConfigureGoogleSheets} disabled={saving} style={{ padding: "12px", borderRadius: 9, border: "1px solid #BBF7D0", background: "#F0FDF4", color: "#166534", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <FileSpreadsheet size={17} /> Google Sheets
              </button>
              {supportsMetaAds ? (
                <Link href={`/admin/meta-marketing?clientId=${dashboard.client_id}&dashboardId=${dashboard.id}`} onClick={onClose} style={{ padding: "12px", borderRadius: 9, border: "1px solid #C7D2FE", background: "#EEF2FF", color: "#4338CA", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  <Share2 size={17} /> Meta Marketing API
                </Link>
              ) : null}
              {supportsGoogleAds ? (
                <Link href={`/admin/google-ads-api?clientId=${dashboard.client_id}&dashboardId=${dashboard.id}`} onClick={onClose} style={{ padding: "12px", borderRadius: 9, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  <BarChart3 size={17} /> Google Ads API
                </Link>
              ) : null}
            </div>
          </section>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={saving || !selectedSourceId || selectedSourceId === dashboard.metrics_source_id} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #2563EB", background: "#2563EB", color: "#FFFFFF", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: saving || !selectedSourceId || selectedSourceId === dashboard.metrics_source_id ? 0.55 : 1 }}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}
            {hasCurrentSource ? "Salvar alteração" : "Conectar fonte"}
          </button>
        </div>
      </div>
    </div>
  );
}
