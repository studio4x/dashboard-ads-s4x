import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { DashboardTemplateCatalogService } from "@/services/dashboard-template-catalog-service";
import { getDefaultTemplateMetricConfig, normalizeTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";

function toSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const templates = await DashboardTemplateCatalogService.getAllTemplates();
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

    const body = parsed.body || {};
    const action = String(body.action || "save_config");
    const allowedTemplates = new Set(["google_ads_s4x", "meta_ads_s4x", "google_meta_ads_s4x"]);

    if (action === "create") {
      const name = requireString(body, "name", { min: 3, max: 120 });
      const baseTemplateId = requireString(body, "base_template_id", { min: 3, max: 80 });
      const templateIdInput = requireString(body, "template_id", { min: 3, max: 80 });
      if (!name) {
        return NextResponse.json({ error: "Nome do template inválido." }, { status: 400 });
      }
      if (!baseTemplateId) {
        return NextResponse.json({ error: "Template base inválido." }, { status: 400 });
      }
      if (!templateIdInput) {
        return NextResponse.json({ error: "ID do template inválido." }, { status: 400 });
      }
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const version = typeof body.version === "string" && body.version.trim() ? body.version.trim() : "1.0";
      const status = ["active", "coming_soon", "deprecated"].includes(String(body.status))
        ? String(body.status)
        : "active";
      const platform = typeof body.platform === "string" ? body.platform : undefined;
      const sourceType = typeof body.source_type === "string" ? body.source_type : undefined;
      const templateId = toSlug(templateIdInput);

      if (!templateId) {
        return NextResponse.json({ error: "ID do template inválido." }, { status: 400 });
      }

      const base = await DashboardTemplateCatalogService.getTemplateDefinition(baseTemplateId);
      if (!base) {
        return NextResponse.json({ error: "Template base não encontrado." }, { status: 404 });
      }

      const metricConfig = normalizeTemplateMetricConfig(
        body.metric_config || getDefaultTemplateMetricConfig(base.sheetTemplateId),
        base.sheetTemplateId
      );

      const created = await DashboardTemplateCatalogService.createCustomTemplate({
        templateId,
        baseTemplateId: base.sheetTemplateId,
        name,
        description,
        version,
        status: status as "active" | "coming_soon" | "deprecated",
        platform: platform as any || base.platform,
        sourceType: sourceType as any || base.sourceType,
        requiredSheets: Array.isArray(body.required_sheets) ? body.required_sheets.map((item: unknown) => String(item).trim()).filter(Boolean) : base.requiredSheets,
        optionalSheets: Array.isArray(body.optional_sheets) ? body.optional_sheets.map((item: unknown) => String(item).trim()).filter(Boolean) : base.optionalSheets,
        visiblePages: Array.isArray(body.visible_pages) ? body.visible_pages.map((item: unknown) => String(item).trim()).filter(Boolean) : base.visiblePages,
        metricConfig: metricConfig as unknown as Record<string, unknown>,
      });

      const normalizedTemplate = await DashboardTemplateCatalogService.getTemplateDefinition(created.template_id);
      return NextResponse.json({ success: true, template: normalizedTemplate || created });
    }

    const templateId = requireString(body, "templateId", { min: 3, max: 80 });
    const metricConfig = body.metric_config;
    if (!templateId) {
      return NextResponse.json({ error: "Template inválido." }, { status: 400 });
    }

    const resolvedTemplate = await DashboardTemplateCatalogService.getTemplateDefinition(templateId);
    if (!resolvedTemplate) {
      return NextResponse.json({ error: "Template não encontrado." }, { status: 404 });
    }

    const normalized = normalizeTemplateMetricConfig(
      metricConfig || getDefaultTemplateMetricConfig(resolvedTemplate.sheetTemplateId),
      resolvedTemplate.sheetTemplateId
    );

    const saved = await DashboardTemplateCatalogService.saveTemplateMetricConfig(templateId, normalized as unknown as Record<string, unknown>);
    const normalizedTemplate = await DashboardTemplateCatalogService.getTemplateDefinition(templateId);
    return NextResponse.json({ success: true, template: normalizedTemplate || saved, normalized });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
