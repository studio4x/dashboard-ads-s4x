"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Save } from "lucide-react";

type SourceItem = {
  dataSourceId: string;
  dashboardId: string;
  dashboardName: string;
  sourceName: string;
  sourceType: string;
  enabled: boolean;
  staleAfterMinutes: number;
  repeatIntervalHours: number;
  lastState: string;
  lastCheckedAt: string | null;
  currentFreshAt: string | null;
  currentAgeMinutes: number | null;
  currentImportStatus: string | null;
};

function typeLabel(type: string) {
  if (type === "google_ads") return "Google Ads";
  if (type === "meta_ads") return "Meta Ads";
  if (type === "google_sheets") return "Google Sheets";
  return type;
}

function ageLabel(minutes: number | null) {
  if (minutes === null) return "Nunca atualizada";
  if (minutes < 60) return `${minutes} min atrás`;
  if (minutes < 1440) return `${(minutes / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h atrás`;
  return `${(minutes / 1440).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias atrás`;
}

export function ClientSourceMonitoringPanel({ clientId }: { clientId: string }) {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const endpoint = `/api/admin/clients/${clientId}/source-monitoring`;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar o monitoramento de dados.");
      setSources(Array.isArray(json.sources) ? json.sources : []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar monitoramento." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]);

  function patch(index: number, value: Partial<SourceItem>) {
    setSources((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item));
  }

  async function save(item: SourceItem) {
    setSavingId(item.dataSourceId);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSourceId: item.dataSourceId,
          enabled: item.enabled,
          staleAfterMinutes: Number(item.staleAfterMinutes),
          repeatIntervalHours: Number(item.repeatIntervalHours || 24),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível salvar o monitoramento.");
      setMessage({ type: "ok", text: `Monitoramento de ${item.sourceName} salvo.` });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar monitoramento." });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", gap: 8, alignItems: "center" }}><Clock3 size={19} color="#7C3AED" /> Monitoramento de dados</h2>
        <p style={{ marginTop: 5, fontSize: 12, lineHeight: 1.5, color: "#64748B" }}>Notifica o administrador quando uma fonte fica sem atualização por mais tempo que o limite definido.</p>
      </div>

      {message && <div style={{ marginBottom: 12, display: "flex", gap: 7, alignItems: "center", padding: "9px 11px", borderRadius: 8, background: message.type === "ok" ? "#F0FDF4" : "#FEF2F2", color: message.type === "ok" ? "#166534" : "#991B1B", fontSize: 12 }}>{message.type === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{message.text}</div>}

      {loading ? <div style={{ padding: 24, textAlign: "center" }}><Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} /></div> : sources.length === 0 ? (
        <div style={{ padding: 16, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#64748B", fontSize: 12 }}>Nenhuma fonte ativa encontrada.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sources.map((item, index) => {
            const staleNow = item.currentAgeMinutes === null || item.currentAgeMinutes > item.staleAfterMinutes;
            return (
              <div key={item.dataSourceId} style={{ padding: 14, border: `1px solid ${staleNow ? "#FBBF24" : "#E2E8F0"}`, borderRadius: 10, background: staleNow ? "#FFFBEB" : "#FFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#1D4ED8", background: "#EFF6FF", padding: "3px 7px", borderRadius: 99 }}>{typeLabel(item.sourceType)}</span>
                      {staleNow && <span style={{ fontSize: 10, fontWeight: 800, color: "#B45309" }}>⚠ Dados atrasados</span>}
                    </div>
                    <div style={{ marginTop: 7, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.sourceName}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{item.dashboardName} · {ageLabel(item.currentAgeMinutes)}</div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "#334155" }}><input type="checkbox" checked={item.enabled} onChange={(event) => patch(index, { enabled: event.target.checked })} /> Ativar alerta</label>
                </div>
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(160px,1fr) minmax(140px,.8fr) auto", gap: 10, alignItems: "end" }}>
                  <label style={{ fontSize: 11, color: "#475569" }}><span style={{ display: "block", marginBottom: 5, fontWeight: 700 }}>Alertar após (minutos)</span><input type="number" min={30} max={10080} disabled={!item.enabled} value={item.staleAfterMinutes} onChange={(event) => patch(index, { staleAfterMinutes: Number(event.target.value) })} style={{ width: "100%", padding: 8, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 12 }} /></label>
                  <label style={{ fontSize: 11, color: "#475569" }}><span style={{ display: "block", marginBottom: 5, fontWeight: 700 }}>Repetir após (h)</span><input type="number" min={1} max={720} disabled={!item.enabled} value={item.repeatIntervalHours} onChange={(event) => patch(index, { repeatIntervalHours: Number(event.target.value) })} style={{ width: "100%", padding: 8, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 12 }} /></label>
                  <button type="button" onClick={() => void save(item)} disabled={savingId === item.dataSourceId} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 11px", border: 0, borderRadius: 7, background: savingId === item.dataSourceId ? "#94A3B8" : "#2563EB", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{savingId === item.dataSourceId ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
