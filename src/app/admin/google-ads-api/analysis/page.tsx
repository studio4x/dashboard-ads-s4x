import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Análises Google Ads" };

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export default async function GoogleAdsAnalysisIndexPage() {
  await requireAdmin();
  const supabase = await createAdminClient();
  const { data: sources } = await supabase
    .from("data_sources")
    .select("id,name,status,clients(name),dashboards(name,title),google_ads_sources(customer_id,customer_name,last_import_at,last_import_status,last_error)")
    .eq("type", "google_ads")
    .order("created_at", { ascending: false });

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Link href="/admin/google-ads-api" style={{ width: 40, height: 40, borderRadius: 9, background: "#F1F5F9", color: "#475569", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={19} /></Link>
        <div><h1 style={{ fontSize: 24, fontWeight: 760, color: "#0F172A" }}>Análises de Performance · Google Ads</h1><p style={{ marginTop: 4, fontSize: 14, color: "#64748B" }}>Visão administrativa com diagnóstico, leilão, keywords, termos, anúncios e plano de ação.</p></div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {!sources?.length ? <div className="card" style={{ padding: 24, color: "#64748B", fontSize: 13 }}>Nenhuma fonte Google Ads API vinculada.</div> : sources.map((source) => {
          const google = relation(source.google_ads_sources);
          const client = relation(source.clients);
          const dashboard = relation(source.dashboards);
          const healthy = google?.last_import_status === "success" || google?.last_import_status === "success_with_warnings";
          return <Link key={source.id} href={`/admin/google-ads-api/analysis/${source.id}`} className="card" style={{ padding: 16, textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#EFF6FF", color: "#2563EB", flex: "0 0 auto" }}><BarChart3 size={21} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong style={{ fontSize: 14, color: "#0F172A" }}>{client?.name || source.name}</strong><span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 7px", background: healthy ? "#ECFDF5" : "#FEF2F2", color: healthy ? "#047857" : "#B91C1C" }}>{google?.last_import_status || "sem sync"}</span></div><p style={{ marginTop: 3, fontSize: 11, color: "#64748B" }}>{google?.customer_name || "Conta Google Ads"} ({google?.customer_id || "ID n/d"}) · {dashboard?.title || dashboard?.name || "Dashboard"}</p>{google?.last_error ? <p style={{ marginTop: 3, fontSize: 11, color: "#B91C1C" }}>{google.last_error}</p> : null}</div>
            <ChevronRight size={18} color="#94A3B8" />
          </Link>;
        })}
      </div>
    </div>
  );
}
