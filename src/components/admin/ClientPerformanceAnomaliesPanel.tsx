"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";

type DashboardSetting = {
  dashboardId: string;
  dashboardName: string;
  platform: string | null;
  enabled: boolean;
  recentDays: number;
  baselineDays: number;
  cpaIncreasePct: number;
  ctrDropPct: number;
  conversionsDropPct: number;
  spendIncreasePct: number;
  zeroResultsDays: number;
  minBaselineSpend: number;
  repeatIntervalHours: number;
  lastCheckedAt: string | null;
};

export function ClientPerformanceAnomaliesPanel({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<DashboardSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const endpoint = `/api/admin/clients/${clientId}/performance-anomalies`;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível carregar as anomalias.");
      setItems(Array.isArray(json.dashboards) ? json.dashboards : []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar configurações de anomalia." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]);

  function patch(index: number, value: Partial<DashboardSetting>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item));
  }

  async function save(item: DashboardSetting) {
    setSavingId(item.dashboardId);
    setMessage(null);
    try {
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Não foi possível salvar a configuração.");
      setMessage({ type: "ok", text: `Detecção de anomalias de ${item.dashboardName} salva.` });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar anomalias." });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}><Activity size={19} color="#DC2626" /> Anomalias de desempenho</h2>
        <p style={{ marginTop: 5, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Detecta automaticamente aumento de CPA, queda de CTR/resultados, investimento subindo com piora de resultado, ausência de conversões e interrupção de entrega. A decisão é estatística e determinística.</p>
      </div>

      {message && <div style={{ marginBottom: 12, display: "flex", gap: 7, alignItems: "center", padding: "9px 11px", borderRadius: 8, background: message.type === "ok" ? "#F0FDF4" : "#FEF2F2", color: message.type === "ok" ? "#166534" : "#991B1B", fontSize: 12 }}>{message.type === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{message.text}</div>}

      {loading ? <div style={{ padding: 24, textAlign: "center" }}><Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} /></div> : items.length === 0 ? (
        <div style={{ padding: 16, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#64748B", fontSize: 12 }}>Nenhum dashboard ativo encontrado.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item, index) => {
            const expanded = expandedId === item.dashboardId;
            return <div key={item.dashboardId} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, background: "#FFF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.dashboardName}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: "#64748B" }}>{item.lastCheckedAt ? `Última análise: ${new Date(item.lastCheckedAt).toLocaleString("pt-BR")}` : "Ainda não analisado"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#334155" }}><input type="checkbox" checked={item.enabled} onChange={(event) => patch(index, { enabled: event.target.checked })} /> Ativar</label>
                  <button type="button" onClick={() => setExpandedId(expanded ? null : item.dashboardId)} style={{ border: "1px solid #CBD5E1", background: "#FFF", borderRadius: 7, padding: "6px 9px", fontSize: 10, fontWeight: 700, color: "#475569", cursor: "pointer" }}>{expanded ? "Ocultar ajustes" : "Ajustes"}</button>
                </div>
              </div>

              {expanded && <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                {[
                  ["recentDays", "Janela atual (dias)", 1, 14],
                  ["baselineDays", "Referência (dias)", 7, 60],
                  ["cpaIncreasePct", "Alertar CPA + (%)", 5, 500],
                  ["ctrDropPct", "Alertar CTR - (%)", 5, 100],
                  ["conversionsDropPct", "Alertar resultados - (%)", 5, 100],
                  ["spendIncreasePct", "Investimento + (%)", 5, 500],
                  ["zeroResultsDays", "Dias sem resultado", 1, 14],
                  ["minBaselineSpend", "Investimento mínimo histórico", 0, 100000],
                  ["repeatIntervalHours", "Repetir alerta após (h)", 1, 720],
                ].map(([key, label, min, max]) => <label key={String(key)} style={{ fontSize: 10, color: "#475569" }}><span style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>{String(label)}</span><input type="number" min={Number(min)} max={Number(max)} disabled={!item.enabled} value={Number((item as any)[key])} onChange={(event) => patch(index, { [key]: Number(event.target.value) } as Partial<DashboardSetting>)} style={{ width: "100%", padding: 7, border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 11 }} /></label>)}
              </div>}

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" disabled={savingId === item.dashboardId} onClick={() => void save(item)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 7, padding: "8px 11px", background: savingId === item.dashboardId ? "#94A3B8" : "#2563EB", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{savingId === item.dashboardId ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar</button>
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
