import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { DASHBOARD_TEMPLATES } from "@/lib/dashboard/templates";
import { DashboardTemplateConfigService } from "@/services/dashboard-template-config-service";
import { getDefaultTemplateMetricConfig, normalizeTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const configs = await DashboardTemplateConfigService.getAllTemplateConfigs();
    const configById = new Map(configs.map((config) => [config.template_id, config]));

    const templates = DASHBOARD_TEMPLATES.filter((template) =>
      ["google_ads_s4x", "meta_ads_s4x", "google_meta_ads_s4x"].includes(template.id)
    ).map((template) => {
      const savedConfig = configById.get(template.id);
      const metricConfig = normalizeTemplateMetricConfig(
        savedConfig?.metric_config || null,
        template.id,
        []
      );

      return {
        ...template,
        metric_config: metricConfig,
        has_custom_config: Boolean(savedConfig),
      };
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:templates:update", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;

    const body = parsed.body;
    const templateId = requireString(body, "templateId", { min: 3, max: 80 });
    const metricConfig = body.metric_config;

    const allowedTemplates = new Set(["google_ads_s4x", "meta_ads_s4x", "google_meta_ads_s4x"]);
    if (!templateId || !allowedTemplates.has(templateId)) {
      return NextResponse.json({ error: "Template inválido." }, { status: 400 });
    }

    const normalized = normalizeTemplateMetricConfig(
      metricConfig || getDefaultTemplateMetricConfig(templateId),
      templateId,
      []
    );

    const saved = await DashboardTemplateConfigService.upsertTemplateConfig(templateId, normalized as unknown as Record<string, unknown>);
    return NextResponse.json({ success: true, template: saved });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
