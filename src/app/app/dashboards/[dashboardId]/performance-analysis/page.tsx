import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleAdsPerformanceAnalysis } from "@/components/admin/GoogleAdsPerformanceAnalysis";
import {
  GoogleAdsClientSummary,
  GoogleAdsClientSummarySkeleton,
} from "@/components/admin/GoogleAdsClientSummary";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPerformanceAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ dashboardId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { dashboardId } = await params;
  const query = await searchParams;
  const profile = await getSessionProfile();

  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    notFound();
  }

  const supabase = await createAdminClient();
  const { data: source } = await supabase
    .from("data_sources")
    .select("id")
    .eq("dashboard_id", dashboardId)
    .eq("type", "google_ads")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!source?.id) {
    notFound();
  }

  const from = single(query.from);
  const to = single(query.to);

  return (
    <>
      <GoogleAdsPerformanceAnalysis
        sourceId={source.id}
        from={from}
        to={to}
        embedded
      />
      <div style={{ maxWidth: 1280, padding: "0 clamp(14px, 3vw, 32px)", marginTop: -8 }}>
        <Suspense fallback={<GoogleAdsClientSummarySkeleton />}>
          <GoogleAdsClientSummary sourceId={source.id} from={from} to={to} />
        </Suspense>
      </div>
    </>
  );
}
