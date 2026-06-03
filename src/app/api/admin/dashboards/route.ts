import { NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";
import { DashboardTemplateCatalogService } from "@/services/dashboard-template-catalog-service";

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

import { DashboardTemplateService } from "@/services/dashboard-template-service";

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
    const templateDefinition = await DashboardTemplateCatalogService.getTemplateDefinition(dashboardTypeRaw);
    if (!templateDefinition) {
      return NextResponse.json({ error: "Modelo de dashboard inválido ou indisponível." }, { status: 400 });
    }

    const normalizedObjectives = templateDefinition.platform === "meta_ads" || templateDefinition.platform === "mixed"
      ? normalizeMetaAdsObjectives(metaObjectives)
      : [];

    const dashboard = await DashboardTemplateService.createFromTemplate(
      clientId,
      safeName,
      safeSlug,
      dashboardTypeRaw,
      safeDescription,
      {
        metaObjectives: normalizedObjectives,
        metaPrimaryObjective: normalizedObjectives[0] || null,
      }
    );

    return NextResponse.json({ success: true, dashboard });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
