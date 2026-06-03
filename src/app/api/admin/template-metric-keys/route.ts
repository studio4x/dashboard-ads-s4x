import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { createAdminClient } from "@/lib/supabase/server";
import {
  collectMetricKeysFromPayload,
  mergeMetricKeySuggestions,
  type MetricKeySuggestion,
} from "@/lib/dashboard/metric-key-catalog";

function getSourceRoleLabel(source: any) {
  const role = Array.isArray(source?.google_sheet_sources)
    ? source?.google_sheet_sources?.[0]?.source_role
    : source?.google_sheet_sources?.source_role;

  if (role === "google_ads") return "Google Ads";
  if (role === "meta_ads") return "Meta Ads";

  const dashboardType = Array.isArray(source?.dashboards)
    ? source?.dashboards?.[0]?.dashboard_type
    : source?.dashboards?.dashboard_type;

  if (dashboardType === "google_meta_ads_s4x") return "Google + Meta";
  if (dashboardType === "google_ads_s4x") return "Google Ads";
  if (dashboardType === "meta_ads_s4x") return "Meta Ads";
  return "Sistema";
}

async function getLatestSnapshotForSource(supabase: Awaited<ReturnType<typeof createAdminClient>>, sourceId: string, dashboardId: string) {
  const bySource = await supabase
    .from("dashboard_data_snapshots")
    .select("id, imported_at, payload_json")
    .eq("data_source_id", sourceId)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bySource.data) return bySource.data;

  const byDashboard = await supabase
    .from("dashboard_data_snapshots")
    .select("id, imported_at, payload_json")
    .eq("dashboard_id", dashboardId)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byDashboard.data || null;
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabase = await createAdminClient();
    const { data: sources, error } = await supabase
      .from("data_sources")
      .select(`
        id,
        name,
        dashboard_id,
        status,
        created_at,
        google_sheet_sources(spreadsheet_id, source_role),
        dashboards(name, dashboard_type)
      `)
      .eq("type", "google_sheets")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const discoveredMap = new Map<string, MetricKeySuggestion>();

    await Promise.all(
      (sources || []).map(async (source: any) => {
        const dashboardId = source.dashboard_id;
        if (!dashboardId) return;

        const snapshot = await getLatestSnapshotForSource(supabase, source.id, dashboardId);
        if (!snapshot?.payload_json) return;

        const discovered = collectMetricKeysFromPayload(snapshot.payload_json);
        const sourceRoleLabel = getSourceRoleLabel(source);
        const sourceRole = Array.isArray(source?.google_sheet_sources)
          ? source?.google_sheet_sources?.[0]?.source_role
          : source?.google_sheet_sources?.source_role;

        discovered.forEach((item) => {
          const current = discoveredMap.get(item.key);
          discoveredMap.set(item.key, {
            ...item,
            sourceCount: (current?.sourceCount || 0) + (item.sourceCount || 0),
            sourceRoles: Array.from(new Set([...(current?.sourceRoles || []), sourceRole || "unknown"])),
            sourceLabels: Array.from(new Set([...(current?.sourceLabels || []), sourceRoleLabel])),
          });
        });
      })
    );

    const discovered = Array.from(discoveredMap.values());
    const suggestions = mergeMetricKeySuggestions(discovered);

    return NextResponse.json({
      success: true,
      suggestions,
      canonicalSuggestions: suggestions.filter((item) => item.origin === "canonical"),
      discoveredSuggestions: suggestions.filter((item) => item.origin === "discovered"),
      sourcesCount: sources?.length || 0,
    });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
