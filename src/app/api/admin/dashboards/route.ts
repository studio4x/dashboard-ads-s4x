import { NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const body = await request.json();
    const { client_id, name, slug, description, dashboard_type, meta_objectives } = body;

    if (!client_id || !name || !slug) {
      return NextResponse.json({ error: "Cliente, Nome e Slug são obrigatórios" }, { status: 400 });
    }

    const type: DashboardTemplateType = dashboard_type || "google_ads";

    const normalizedObjectives = type === "meta_ads_s4x"
      ? normalizeMetaAdsObjectives(meta_objectives)
      : [];

    const dashboard = await DashboardTemplateService.createFromTemplate(
      client_id,
      name,
      slug,
      type,
      description,
      {
        metaObjectives: normalizedObjectives,
        metaPrimaryObjective: normalizedObjectives[0] || null,
      }
    );

    return NextResponse.json({ success: true, dashboard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
