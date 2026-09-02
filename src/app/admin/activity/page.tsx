"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FileClock, Loader2, RefreshCw, Search, XCircle } from "lucide-react";

type Item = {
  id: string;
  clientId: string | null;
  clientName: string;
  dashboardId: string | null;
  dashboardName: string | null;
  type: string;
  status: "success" | "info" | "warning" | "error";
  title: string;
  description: string;
  occurredAt: string;
};

const typeLabels: Record<string, string> = {
  import: "Sincronização",
  financial_alert: "Financeiro",
  stale_data: "Dados atrasados",
  performance_anomaly: "Anomalia",
  automation: "Automação",
  configuration: "Configuração",
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function Status({ value }: { value: Item["status"] }) {
  const map = {
    success: { label: "Sucesso", bg: "#F0FDF4", color: "#15803D", Icon: CheckCircle2 },
    warning: { label: "Atenção", bg: "#FFF7ED", color: "#B45309", Icon: AlertTriangle },
    error: { label: "Erro", bg: "#FEF2F2", color: "#B91C1C", Icon: XCircle },
    info: { label: "Informativo", bg: "#EFF6FF", color: "#1D4ED8", Icon: FileClock },
  } as const;
  const item = map[value];
  return <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "3px 7px", borderRadius: 99, background: item.bg, color: item.color, fontSize: 9, fontWeight: 800 }}><item.Icon size={10} />{item.label}</span>;
}

export default function ActivityPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/activity?limit=1000", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.error || "Falha ao carregar atividade.");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar atividade.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) if (item.clientId) map.set(item.clientId, item.clientName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (clientId && item.clientId !== clientId) return false;
      if (type && item.type !== type) return false;
      if (status && item.status !== status) return false;
      if (!query) return true;
      return [item.clientName, item.dashboardName, item.title, item.description].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [items, clientId, type, status, search]);

  return <div className="admin-page" style={{ padding: "clamp(14px,3vw,32px)", maxWidth: 1280 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
      <div><h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", display: "flex", gap: 8, alignItems: "center" }}><FileClock size={22} color="#7C3AED" /> Atividade Operacional</h1><p style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Linha do tempo de sincronizações, automações, alertas, anomalias e configurações por cliente.</p></div>
      <button onClick={() => void load()} disabled={loading} style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "8px 11px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFF", fontSize: 11, fontWeight: 700, color: "#334155" }}>{loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Atualizar</button>
    </div>

    {error && <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, background: "#FEF2F2", color: "#991B1B", fontSize: 11 }}>{error}</div>}

    <div className="card" style={{ padding: 12, marginBottom: 14 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 260px" }}><Search size={14} color="#94A3B8" style={{ position: "absolute", left: 10, top: 9 }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, dashboard ou evento..." style={{ width: "100%", padding: "7px 9px 7px 31px", border: "1px solid #CBD5E1", borderRadius: 7, fontSize: 11 }} /></div>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ padding: "7px 9px", border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", fontSize: 11 }}><option value="">Todos os clientes</option>{clients.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "7px 9px", border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", fontSize: 11 }}><option value="">Todos os tipos</option>{Object.entries(typeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "7px 9px", border: "1px solid #CBD5E1", borderRadius: 7, background: "#FFF", fontSize: 11 }}><option value="">Todos os status</option><option value="success">Sucesso</option><option value="warning">Atenção</option><option value="error">Erro</option><option value="info">Informativo</option></select>
    </div></div>

    <div className="card" style={{ overflow: "hidden" }}>
      {loading && items.length === 0 ? <div style={{ padding: 42, textAlign: "center", color: "#64748B" }}><Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 7px" }} />Carregando...</div> : filtered.length === 0 ? <div style={{ padding: 42, textAlign: "center", color: "#64748B" }}>Nenhum evento encontrado.</div> : filtered.map((item,index) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr) auto", gap: 12, padding: "13px 15px", borderBottom: index === filtered.length - 1 ? "none" : "1px solid #F1F5F9" }}>
        <div style={{ fontSize: 9, color: "#64748B" }}>{dateLabel(item.occurredAt)}</div>
        <div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><strong style={{ fontSize: 11, color: "#0F172A" }}>{item.title}</strong><span style={{ padding: "2px 6px", borderRadius: 99, background: "#F1F5F9", color: "#64748B", fontSize: 8, fontWeight: 700 }}>{typeLabels[item.type] || item.type}</span><Status value={item.status} /></div><p style={{ marginTop: 4, fontSize: 10, lineHeight: 1.45, color: "#475569" }}>{item.description}</p><p style={{ marginTop: 4, fontSize: 9, color: "#94A3B8" }}><strong style={{ color: "#64748B" }}>{item.clientName}</strong>{item.dashboardName ? ` · ${item.dashboardName}` : ""}</p></div>
        <div style={{ display: "flex", gap: 5 }}>{item.clientId && <Link href={`/admin/clients/${item.clientId}`} title="Abrir cliente" style={{ color: "#64748B" }}><ExternalLink size={12} /></Link>}{item.dashboardId && <Link href={`/app/dashboards/${item.dashboardId}/executive-summary`} target="_blank" title="Abrir dashboard" style={{ color: "#2563EB" }}><ExternalLink size={12} /></Link>}</div>
      </div>)}
    </div>
  </div>;
}
