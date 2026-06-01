import { NextResponse } from "next/server";
import { DashboardTemplateService } from "@/services/dashboard-template-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function POST(
  request: Request,
  props: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:dashboards:duplicate", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const clientId = requireString(body, "client_id");
    const safeName = requireString(body, "name", { min: 3, max: 120 });
    const safeSlug = requireString(body, "slug", { min: 3, max: 160 });
    const params = await props.params;
    const dashboardId = params.dashboardId;

    if (!dashboardId || !clientId || !safeName || !safeSlug) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 });
    }

    const newDashboard = await DashboardTemplateService.duplicateDashboard(
      dashboardId,
      clientId,
      safeName,
      safeSlug
    );

    return NextResponse.json({ success: true, dashboard: newDashboard });
  } catch (error: any) {
    console.error("Erro ao duplicar dashboard:", error);
    return apiErrorResponse(error);
  }
}
