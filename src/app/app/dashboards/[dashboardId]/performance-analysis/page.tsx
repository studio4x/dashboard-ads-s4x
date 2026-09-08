import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import AdminGoogleAdsAnalysisPage from "@/app/admin/google-ads-api/analysis/[sourceId]/page";

export default async function DashboardPerformanceAnalysisPage({
  params,
}: {
  params: Promise<{ dashboardId: string }>;
}) {
  const { dashboardId } = await params;
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

  return <AdminGoogleAdsAnalysisPage params={Promise.resolve({ sourceId: source.id })} />;
}
