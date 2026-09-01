"use client";

import Link from "next/link";
import { BarChart3, CheckCircle2, Database, FileSpreadsheet, Loader2, Share2, X } from "lucide-react";

type DashboardSourceOption = {
  id: string;
  name: string;
  type: string;
  sourceRole?: "google_ads" | "meta_ads" | null;
};

type DashboardSourceModalProps = {
  dashboard: {
    id: string;
    name: string;
    client_id: string;
    dashboard_type?: string | null;
    metrics_source_id?: string | null;
    google_metrics_source_id?: string | null;
    meta_metrics_source_id?: string | null;
  };
  sources: DashboardSourceOption[];
  selectedSourceId: string;
  selectedPlatformSourceIds: {
    googleAdsSourceId: string;
    metaAdsSourceId: string;
  };
  saving: boolean;
  onSelect: (sourceId: string) => void;
  onSelectPlatformSource: (platform: "google_ads" | "meta_ads", sourceId: string) => void;
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
  selectedPlatformSourceIds,
  saving,
  onSelect,
  onSelectPlatformSource,
  onConfirm,
  onConfigureGoogleSheets,
  onClose,
}: DashboardSourceModalProps) {
  const dashboardType = String(dashboard.dashboard_type || "");
  const isIntegrated = dashboardType === "google_meta_ads_s4x";
  const hasCurrentSource = isIntegrated
    ? Boolean(selectedPlatformSourceIds.googleAdsSourceId || selectedPlatformSourceIds.metaAdsSourceId)
    : sources.some((source) => source.id === dashboard.metrics_source_id);
  const title = hasCurrentSource ? "Editar fonte" : "Conectar fonte";
  const supportsMetaAds = dashboardType.includes("meta");
  const supportsGoogleAds = dashboardType.includes("google");
  const getSourceRole = (source: DashboardSourceOption) => {
    if (source.type === "google_ads") return "google_ads";
    if (source.type === "meta_ads") return "meta_ads";
    return source.sourceRole || null;
  };
  const platformSourcesChanged = selectedPlatformSourceIds.googleAdsSourceId !== String(dashboard.google_metrics_source_id || "")
    || selectedPlatformSourceIds.metaAdsSourceId !== String(dashboard.meta_metrics_source_id || "");
  const confirmDisabled = saving || (isIntegrated
    ? !selectedPlatformSourceIds.googleAdsSourceId || !selectedPlatformSourceIds.metaAdsSourceId || !platformSourcesChanged
    : !selectedSourceId || selectedSourceId === dashboard.metrics_source_id);

  const renderSourceOptions = (role?: "google_ads" | "meta_ads") => {
    const availableSources = role ? sources.filter((source) => getSourceRole(source) === role) : sources;
    const selectedId = role === "google_ads"
      ? selectedPlatformSourceIds.googleAdsSourceId
      : role === "meta_ads"
        ? selectedPlatformSourceIds.metaAdsSourceId
        : selectedSourceId;

    if (availableSources.length === 0) {
      return (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 9, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E", fontSize: 12 }}>
          Nenhuma fonte ativa compatível está configurada.
        </div>
      );
    }

    return (
      <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
        {availableSources.map((source) => {
          const selected = selectedId === source.id;
          return (
            <button
              key={`${role || "default"}-${source.id}`}
              type="button"
              onClick={() => role ? onSelectPlatformSource(role, source.id) : onSelect(source.id)}
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
    );
  };

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
          {isIntegrated ? (
            <>
              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Fonte dos dados do Google Ads</h3>
                <p style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Escolha a integração ou planilha que fornecerá as métricas do Google Ads.</p>
                {renderSourceOptions("google_ads")}
              </section>
              <section style={{ borderTop: "1px solid #E2E8F0", paddingTop: 18 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Fonte dos dados do Meta Ads</h3>
                <p style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Escolha a integração ou planilha que fornecerá as métricas do Meta Ads.</p>
                {renderSourceOptions("meta_ads")}
              </section>
            </>
          ) : (
            <section>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Fontes disponíveis para este dashboard</h3>
              <p style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Escolha qual fonte ativa fornecerá as métricas e os próximos relatórios.</p>
              {renderSourceOptions()}
            </section>
          )}

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
          <button type="button" onClick={onConfirm} disabled={confirmDisabled} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #2563EB", background: "#2563EB", color: "#FFFFFF", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: confirmDisabled ? 0.55 : 1 }}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}
            {hasCurrentSource ? "Salvar alteração" : "Conectar fonte"}
          </button>
        </div>
      </div>
    </div>
  );
}
