import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { SourceMonitoringService } from "@/services/source-monitoring-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:source-monitoring:list", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { clientId } = await params;
    const sources = await SourceMonitoringService.listClientSources(clientId);
    return NextResponse.json({ success: true, sources });
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
    const rateLimitError = enforceRateLimit(request, { key: "admin:source-monitoring:update", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const { clientId } = await params;
    const body = parsed.body || {};
    const setting = await SourceMonitoringService.saveClientSourceSetting(clientId, {
      dataSourceId: String(body.dataSourceId || ""),
      enabled: Boolean(body.enabled),
      staleAfterMinutes: Number(body.staleAfterMinutes),
      repeatIntervalHours: body.repeatIntervalHours === undefined ? 24 : Number(body.repeatIntervalHours),
    });
    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
