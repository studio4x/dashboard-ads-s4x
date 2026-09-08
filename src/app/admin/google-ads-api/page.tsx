import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsApiPanel } from "@/components/admin/GoogleAdsApiPanel";

export const metadata: Metadata = { title: "Google Ads API" };

export default async function GoogleAdsApiPage() {
  await requireAdmin();
  return <>
    <div style={{ maxWidth: 1120, padding: "18px clamp(14px, 3vw, 32px) 0" }}>
      <Link href="/admin/google-ads-api/analysis" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, background: "#EEF2FF", color: "#4338CA", textDecoration: "none", fontSize: 12, fontWeight: 750 }}>
        <BarChart3 size={16} /> Abrir análises de performance
      </Link>
    </div>
    <GoogleAdsApiPanel />
  </>;
}
