import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { PerformanceAnomalyService } from "@/services/performance-anomaly-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:performance-anomalies:list", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { clientId } = await params;
    const dashboards = await PerformanceAnomalyService.listClientDashboards(clientId);
    return NextResponse.json({ success: true, dashboards });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:performance-anomalies:update", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const { clientId } = await params;
    const setting = await PerformanceAnomalyService.saveClientDashboardSetting(clientId, parsed.body || {});
    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
