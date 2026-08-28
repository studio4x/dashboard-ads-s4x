import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { DashboardService } from "@/services/dashboard-service";
import { DataSourceService } from "@/services/data-source-service";
import {
  extractDashboardMetricFilterOptions,
  normalizeDashboardMetricFilters,
} from "@/lib/dashboard/metric-filters";

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

async function loadFilterContext(dashboardId: string) {
  const dashboard = await DashboardService.getDashboardById(dashboardId, { bypassRls: true });
  const preferredSourceIds = await DataSourceService.getPreferredSnapshotSourceIds(
    dashboardId,
    dashboard.dashboard_type || "google_ads_s4x",
    dashboard.metrics_source_id || null,
  ).catch(() => dashboard.metrics_source_id ? [dashboard.metrics_source_id] : []);
  const snapshot = await DashboardService.getLatestSnapshot(dashboardId, {
    bypassRls: true,
    dataSourceIds: preferredSourceIds.length > 0 ? preferredSourceIds : undefined,
  });
  return { dashboard, snapshot };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:dashboard-metric-filters:read", limit: 80, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { dashboardId } = await params;
    const { dashboard, snapshot } = await loadFilterContext(dashboardId);
    return NextResponse.json({
      filters: normalizeDashboardMetricFilters(dashboard.metrics_filters),
      options: extractDashboardMetricFilterOptions(snapshot?.payload_json),
      hasSnapshot: Boolean(snapshot?.payload_json),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:dashboard-metric-filters:update", limit: 40, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { dashboardId } = await params;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const filters = normalizeDashboardMetricFilters(parsed.body.filters);
    const dashboard = await DashboardService.updateDashboard(dashboardId, { metrics_filters: filters });
    return NextResponse.json({ success: true, filters, dashboard });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
