"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Search, X } from "lucide-react";
import type { DashboardMetricFilterOptions, DashboardMetricFilters, DashboardMetricPlatform } from "@/lib/dashboard/metric-filters";

type Props = {
  dashboard: { id: string; name: string };
  onClose: () => void;
  onSaved: (filters: DashboardMetricFilters) => void;
};

const EMPTY: DashboardMetricFilters = { campaignNames: [], campaignStatuses: [], platforms: [] };
const EMPTY_OPTIONS: DashboardMetricFilterOptions = { campaignNames: [], campaignStatuses: [], platforms: [] };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa", ENABLED: "Ativa", PAUSED: "Pausada", ARCHIVED: "Arquivada",
  DELETED: "Excluída", REMOVED: "Removida", WITH_ISSUES: "Com problemas",
  CAMPAIGN_PAUSED: "Campanha pausada", ADSET_PAUSED: "Conjunto pausado",
};

const PLATFORM_LABELS: Record<DashboardMetricPlatform, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function DashboardMetricFiltersModal({ dashboard, onClose, onSaved }: Props) {
  const [filters, setFilters] = useState<DashboardMetricFilters>(EMPTY);
  const [options, setOptions] = useState<DashboardMetricFilterOptions>(EMPTY_OPTIONS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/dashboards/${dashboard.id}/metric-filters`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Não foi possível carregar os filtros.");
        if (!active) return;
        setFilters(body.filters || EMPTY);
        setOptions(body.options || EMPTY_OPTIONS);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Não foi possível carregar os filtros."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [dashboard.id]);

  const visibleCampaigns = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term ? options.campaignNames.filter((name) => name.toLocaleLowerCase("pt-BR").includes(term)) : options.campaignNames;
  }, [options.campaignNames, search]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/dashboards/${dashboard.id}/metric-filters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar os filtros.");
      onSaved(body.filters);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar os filtros.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = filters.campaignNames.length + filters.campaignStatuses.length + filters.platforms.length;
  const checkboxRow = (label: string, checked: boolean, onChange: () => void) => (
    <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: checked ? "1px solid #A5B4FC" : "1px solid #E2E8F0", background: checked ? "#EEF2FF" : "#FFFFFF", cursor: "pointer", fontSize: 13, color: "#334155" }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={saving} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="metric-filters-title" style={{ position: "fixed", inset: 0, zIndex: 1000, padding: 20, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 24px 60px rgba(15,23,42,.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="metric-filters-title" style={{ fontSize: 18, fontWeight: 750, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}><Filter size={20} color="#4F46E5" /> Filtros de métricas</h2>
            <p style={{ marginTop: 4, color: "#64748B", fontSize: 13 }}>{dashboard.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", display: "grid", placeItems: "center", cursor: "pointer" }}><X size={18} /></button>
        </header>

        <main style={{ padding: 20, overflowY: "auto" }}>
          {loading ? <div style={{ minHeight: 180, display: "grid", placeItems: "center", color: "#64748B" }}><Loader2 className="animate-spin" size={24} /></div> : (
            <div style={{ display: "grid", gap: 20 }}>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>As seleções serão aplicadas aos indicadores, tabelas, análises, PDFs, automações e links compartilhados. Sem seleção, todos os dados são exibidos.</p>

              {options.platforms.length > 1 && <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 9 }}>Plataforma</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>{options.platforms.map((platform) => checkboxRow(PLATFORM_LABELS[platform], filters.platforms.includes(platform), () => setFilters((current) => ({ ...current, platforms: toggle(current.platforms, platform) as DashboardMetricPlatform[] }))))}</div>
              </section>}

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 9 }}>Status da campanha</h3>
                {options.campaignStatuses.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>{options.campaignStatuses.map((status) => checkboxRow(STATUS_LABELS[status] || status, filters.campaignStatuses.includes(status), () => setFilters((current) => ({ ...current, campaignStatuses: toggle(current.campaignStatuses, status) }))))}</div> : <p style={{ padding: 12, borderRadius: 8, background: "#FFFBEB", color: "#92400E", fontSize: 12 }}>O status ainda não está disponível no snapshot atual. Sincronize novamente a fonte para carregar essa informação.</p>}
              </section>

              <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Nome da campanha</h3>
                  {filters.campaignNames.length > 0 && <span style={{ fontSize: 12, color: "#4F46E5" }}>{filters.campaignNames.length} selecionada(s)</span>}
                </div>
                <label style={{ height: 38, border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, padding: "0 11px", marginBottom: 9 }}><Search size={15} color="#64748B" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar campanha" style={{ border: 0, outline: 0, width: "100%", fontSize: 13 }} /></label>
                {options.campaignNames.length ? <div style={{ display: "grid", gap: 7, maxHeight: 240, overflowY: "auto", paddingRight: 3 }}>{visibleCampaigns.map((name) => checkboxRow(name, filters.campaignNames.includes(name), () => setFilters((current) => ({ ...current, campaignNames: toggle(current.campaignNames, name) }))))}{visibleCampaigns.length === 0 && <p style={{ color: "#64748B", fontSize: 12 }}>Nenhuma campanha encontrada.</p>}</div> : <p style={{ color: "#64748B", fontSize: 12 }}>Nenhuma campanha disponível no snapshot atual.</p>}
              </section>

              {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13 }}>{error}</div>}
            </div>
          )}
        </main>

        <footer style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => setFilters(EMPTY)} disabled={loading || saving || selectedCount === 0} style={{ padding: "9px 13px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", fontSize: 13, fontWeight: 650, cursor: "pointer", opacity: selectedCount === 0 ? .5 : 1 }}>Limpar filtros</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#475569", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>Cancelar</button>
            <button type="button" onClick={save} disabled={loading || saving} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #4F46E5", background: "#4F46E5", color: "#FFFFFF", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: loading || saving ? .6 : 1 }}>{saving ? <Loader2 className="animate-spin" size={14} /> : <Filter size={14} />} Salvar filtros</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
