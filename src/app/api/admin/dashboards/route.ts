import { NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";
import { getDefaultTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId é obrigatório" }, { status: 400 });
    }

    const dashboards = await DashboardService.getDashboardsByClient(clientId);
    return NextResponse.json(dashboards);
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}

import { DashboardTemplateService, DashboardTemplateType } from "@/services/dashboard-template-service";

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:dashboards:create", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const clientId = requireString(body, "client_id");
    const safeName = requireString(body, "name", { min: 3, max: 120 });
    const safeSlug = requireString(body, "slug", { min: 3, max: 160 });
    const safeDescription = typeof body.description === "string" ? body.description : undefined;
    const dashboardTypeRaw = typeof body.dashboard_type === "string" ? body.dashboard_type : "google_ads";
    const metaObjectives = body.meta_objectives;

    if (!clientId || !safeName || !safeSlug) {
      return NextResponse.json({ error: "Cliente, Nome e Slug são obrigatórios" }, { status: 400 });
    }
    const allowedTypes: DashboardTemplateType[] = ["google_ads", "meta_ads", "custom", "google_ads_s4x", "meta_ads_s4x", "google_meta_ads_s4x"];
    const type: DashboardTemplateType = allowedTypes.includes(dashboardTypeRaw as DashboardTemplateType)
      ? (dashboardTypeRaw as DashboardTemplateType)
      : "google_ads";

    const normalizedObjectives = type === "meta_ads_s4x"
      ? normalizeMetaAdsObjectives(metaObjectives)
      : [];
    const templateConfig = getDefaultTemplateMetricConfig(
      type,
      normalizedObjectives,
      normalizedObjectives[0] || null
    );

    const dashboard = await DashboardTemplateService.createFromTemplate(
      clientId,
      safeName,
      safeSlug,
      type,
      safeDescription,
      {
        metaObjectives: normalizedObjectives,
        metaPrimaryObjective: normalizedObjectives[0] || null,
      }
    );

    await DashboardService.updateDashboard(dashboard.id, {
      template_config: templateConfig as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, dashboard });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
