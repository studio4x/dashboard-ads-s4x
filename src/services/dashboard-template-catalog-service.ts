import { DASHBOARD_TEMPLATES, getVisiblePages } from "@/lib/dashboard/templates";
import { createAdminClient } from "@/lib/supabase/server";
import { getDefaultTemplateMetricConfig, normalizeTemplateMetricConfig, type DashboardTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";
import { DashboardTemplateConfigService } from "@/services/dashboard-template-config-service";
import { DataSourceService } from "@/services/data-source-service";

export type TemplateStatus = "active" | "coming_soon" | "deprecated";
export type TemplateSourceType = "google_sheets" | "api" | "mixed";

export interface DashboardTemplateCatalogDefinition {
  id: string;
  name: string;
  platform: "google_ads" | "meta_ads" | "mixed" | "custom";
  version: string;
  status: TemplateStatus;
  sourceType: TemplateSourceType;
  description: string;
  requiredSheets: string[];
  optionalSheets: string[];
  visiblePages: string[];
  metricConfig: DashboardTemplateMetricConfig;
  isCustom: boolean;
  baseTemplateId?: string | null;
  sheetTemplateId: string;
  hasCustomConfig?: boolean;
}

interface CustomTemplateRow {
  template_id: string;
  base_template_id: string;
  name: string;
  platform: string;
  version: string;
  status: TemplateStatus;
  source_type: TemplateSourceType;
  description: string;
  required_sheets: string[];
  optional_sheets: string[];
  visible_pages: string[];
  metric_config: Record<string, unknown>;
  updated_at?: string;
}

function toStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.map((item) => String(item).trim()).filter(Boolean) : [];
}

function isMissingRelationError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("does not exist") || message.includes("relation") || message.includes("not exist");
}

function isBaselessTemplate(baseTemplateId?: string | null) {
  return !baseTemplateId || baseTemplateId === "custom";
}

async function reprocessDashboardsForTemplate(templateId: string) {
  const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:reprocess-linked-dashboards" });
  const { data: dashboards, error: dashboardsError } = await supabase
    .from("dashboards")
    .select("id")
    .eq("dashboard_type", templateId);

  if (dashboardsError) throw dashboardsError;

  const dashboardIds = Array.from(
    new Set(
      (dashboards || [])
        .map((dashboard: any) => dashboard.id)
        .filter((dashboardId: unknown) => typeof dashboardId === "string" && dashboardId.trim().length > 0)
    )
  );

  if (dashboardIds.length === 0) return { total: 0, success: 0, failed: 0, results: [] as Array<{ dashboardId: string; success: boolean; error?: string }> };

  const { GoogleSheetsImportService } = await import("@/lib/google-sheets/google-sheets-import-service");
  const activeSources = await DataSourceService.getActiveGoogleSheetsSources().catch(() => []);
  const results: Array<{ dashboardId: string; success: boolean; error?: string }> = [];

  for (const dashboardId of dashboardIds) {
    const dashboardSources = (activeSources || []).filter((source: any) => source.dashboard_id === dashboardId);
    if (dashboardSources.length === 0) continue;

    let dashboardSuccess = true;
    let dashboardError: string | undefined;

    for (const source of dashboardSources) {
      const gsheet = Array.isArray(source.google_sheet_sources)
        ? source.google_sheet_sources[0]
        : source.google_sheet_sources;
      const spreadsheetId = gsheet?.spreadsheet_id;
      if (!spreadsheetId) {
        dashboardSuccess = false;
        dashboardError = "spreadsheet_id ausente";
        continue;
      }

      try {
        await GoogleSheetsImportService.importDashboardData(
          source.client_id,
          dashboardId,
          spreadsheetId,
          source.id
        );
      } catch (error: any) {
        dashboardSuccess = false;
        dashboardError = error instanceof Error ? error.message : "Erro ao reprocessar dashboard.";
      }
    }

    results.push({ dashboardId, success: dashboardSuccess, error: dashboardError });
  }

  return {
    total: results.length,
    success: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
    templateId,
  };
}

function getSystemTemplateDefinition(templateId: string): DashboardTemplateCatalogDefinition | null {
  const template = DASHBOARD_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;

  const visiblePages = getVisiblePages(template.id);
  return {
    id: template.id,
    name: template.name,
    platform: template.platform,
    version: template.version,
    status: template.status,
    sourceType: template.sourceType,
    description: template.description,
    requiredSheets: template.requiredSheets || [],
    optionalSheets: template.optionalSheets || [],
    visiblePages,
    metricConfig: getDefaultTemplateMetricConfig(template.id),
    isCustom: false,
    baseTemplateId: null,
    sheetTemplateId: template.id,
  };
}

export const DashboardTemplateCatalogService = {
  async getCustomTemplates() {
    try {
      const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:list-custom" });
      const { data, error } = await supabase
        .from("dashboard_custom_templates")
        .select("*")
        .order("name");

      if (error) {
        if (isMissingRelationError(error)) return [];
        throw error;
      }
      return (data || []) as CustomTemplateRow[];
    } catch (error: any) {
      if (isMissingRelationError(error)) return [];
      throw error;
    }
  },

  async getTemplateDefinition(templateId: string): Promise<DashboardTemplateCatalogDefinition | null> {
    const systemTemplate = getSystemTemplateDefinition(templateId);
    if (systemTemplate) {
      const savedConfig = await DashboardTemplateConfigService.getTemplateConfig(templateId).catch(() => null);
      return {
        ...systemTemplate,
        metricConfig: normalizeTemplateMetricConfig(savedConfig?.metric_config || systemTemplate.metricConfig, systemTemplate.id),
        hasCustomConfig: Boolean(savedConfig),
      };
    }

    let data: CustomTemplateRow | null = null;
    try {
      const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:get" });
      const res = await supabase
        .from("dashboard_custom_templates")
        .select("*")
        .eq("template_id", templateId)
        .maybeSingle();

      if (res.error) {
        if (isMissingRelationError(res.error)) return null;
        throw res.error;
      }
      data = (res.data || null) as CustomTemplateRow | null;
    } catch (error: any) {
      if (isMissingRelationError(error)) return null;
      throw error;
    }
    if (!data) return null;

    const row = data as CustomTemplateRow;
    const base = getSystemTemplateDefinition(row.base_template_id) || getSystemTemplateDefinition("custom");
    const sheetTemplateId = row.base_template_id || base?.sheetTemplateId || templateId;
    const visiblePages = toStringArray(row.visible_pages).length > 0
      ? toStringArray(row.visible_pages)
      : isBaselessTemplate(row.base_template_id)
        ? []
        : base?.visiblePages || [];
    const requiredSheets = toStringArray(row.required_sheets).length > 0
      ? toStringArray(row.required_sheets)
      : isBaselessTemplate(row.base_template_id)
        ? []
        : base?.requiredSheets || [];
    const optionalSheets = toStringArray(row.optional_sheets).length > 0
      ? toStringArray(row.optional_sheets)
      : isBaselessTemplate(row.base_template_id)
        ? []
        : base?.optionalSheets || [];

    return {
      id: row.template_id,
      name: row.name,
      platform: (row.platform as DashboardTemplateCatalogDefinition["platform"]) || base?.platform || "custom",
      version: row.version || base?.version || "1.0",
      status: row.status,
      sourceType: row.source_type,
      description: row.description,
      requiredSheets,
      optionalSheets,
      visiblePages,
      metricConfig: normalizeTemplateMetricConfig(
        row.metric_config || getDefaultTemplateMetricConfig(sheetTemplateId),
        sheetTemplateId
      ),
      isCustom: true,
      baseTemplateId: isBaselessTemplate(row.base_template_id) ? null : row.base_template_id,
      sheetTemplateId,
    };
  },

  async getAllTemplates(): Promise<DashboardTemplateCatalogDefinition[]> {
    const customTemplates = await this.getCustomTemplates().catch(() => []);
    const systemTemplates = DASHBOARD_TEMPLATES.filter((template) =>
      ["google_ads_s4x", "meta_ads_s4x", "google_meta_ads_s4x"].includes(template.id)
    ).map((template) => {
      const base = getSystemTemplateDefinition(template.id);
      return base!;
    });

    const systemWithConfig = await Promise.all(systemTemplates.map(async (template) => {
      const savedConfig = await DashboardTemplateConfigService.getTemplateConfig(template.id).catch(() => null);
      return {
        ...template,
        metricConfig: normalizeTemplateMetricConfig(savedConfig?.metric_config || template.metricConfig, template.id),
        hasCustomConfig: Boolean(savedConfig),
      };
    }));

    const customDefinitions = customTemplates.map((row) => {
      const base = getSystemTemplateDefinition(row.base_template_id) || getSystemTemplateDefinition("custom");
      const sheetTemplateId = row.base_template_id || base?.sheetTemplateId || row.template_id;
      const visiblePages = toStringArray(row.visible_pages).length > 0
        ? toStringArray(row.visible_pages)
        : isBaselessTemplate(row.base_template_id)
          ? []
          : base?.visiblePages || [];

      return {
        id: row.template_id,
        name: row.name,
        platform: (row.platform as DashboardTemplateCatalogDefinition["platform"]) || base?.platform || "custom",
        version: row.version || base?.version || "1.0",
        status: row.status,
        sourceType: row.source_type,
        description: row.description,
        requiredSheets: toStringArray(row.required_sheets).length > 0 ? toStringArray(row.required_sheets) : (isBaselessTemplate(row.base_template_id) ? [] : (base?.requiredSheets || [])),
        optionalSheets: toStringArray(row.optional_sheets).length > 0 ? toStringArray(row.optional_sheets) : (isBaselessTemplate(row.base_template_id) ? [] : (base?.optionalSheets || [])),
        visiblePages,
        metricConfig: normalizeTemplateMetricConfig(
          row.metric_config || getDefaultTemplateMetricConfig(sheetTemplateId),
          sheetTemplateId
        ),
        isCustom: true,
        baseTemplateId: isBaselessTemplate(row.base_template_id) ? null : row.base_template_id,
        sheetTemplateId,
        hasCustomConfig: true,
      } satisfies DashboardTemplateCatalogDefinition;
    });

    return [...systemWithConfig, ...customDefinitions].sort((a, b) => {
      if (a.isCustom !== b.isCustom) return a.isCustom ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  },

  async saveTemplateMetricConfig(templateId: string, metricConfig: Record<string, unknown>, visiblePages?: string[]) {
    const custom = await this.getTemplateDefinition(templateId).catch(() => null);
    if (custom?.isCustom) {
      const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:update-custom" });
      const { data, error } = await supabase
        .from("dashboard_custom_templates")
        .update({
          metric_config: metricConfig,
          ...(Array.isArray(visiblePages) ? { visible_pages: visiblePages } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("template_id", templateId)
        .select()
        .single();

      if (error) throw error;
      const { error: dashboardUpdateError } = await supabase
        .from("dashboards")
        .update({
          template_config: metricConfig,
        })
        .eq("dashboard_type", templateId);

      if (dashboardUpdateError) throw dashboardUpdateError;
      if (Array.isArray(visiblePages)) {
        await this.syncDashboardPagesForTemplate(templateId, metricConfig, visiblePages);
      }
      const reprocess = await reprocessDashboardsForTemplate(templateId).catch(() => null);
      return { ...data, reprocess } as CustomTemplateRow & { reprocess?: unknown };
    }

    const saved = await DashboardTemplateConfigService.upsertTemplateConfig(templateId, metricConfig);
    const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:propagate-system-config" });
    const { error: dashboardUpdateError } = await supabase
      .from("dashboards")
      .update({
        template_config: metricConfig,
      })
      .eq("dashboard_type", templateId);

    if (dashboardUpdateError) throw dashboardUpdateError;
    const reprocess = await reprocessDashboardsForTemplate(templateId).catch(() => null);
    return { ...saved, reprocess };
  },

  async createCustomTemplate(params: {
    templateId: string;
    baseTemplateId: string;
    name: string;
    description?: string;
    version?: string;
    status?: TemplateStatus;
    sourceType?: TemplateSourceType;
    platform?: DashboardTemplateCatalogDefinition["platform"];
    requiredSheets?: string[];
    optionalSheets?: string[];
    visiblePages?: string[];
    metricConfig?: Record<string, unknown>;
  }) {
    const base = params.baseTemplateId === "custom"
      ? getSystemTemplateDefinition("custom")
      : await this.getTemplateDefinition(params.baseTemplateId);
    if (!base) {
      throw new Error("Template base não encontrado.");
    }
    const existing = await this.getTemplateDefinition(params.templateId).catch(() => null);
    if (existing) {
      throw new Error("Já existe um template com este ID.");
    }

    const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:create-custom" });
    const { data, error } = await supabase
      .from("dashboard_custom_templates")
      .insert({
        template_id: params.templateId,
        base_template_id: params.baseTemplateId,
        name: params.name,
        platform: params.platform || base.platform,
        version: params.version || base.version || "1.0",
        status: params.status || "active",
        source_type: params.sourceType || base.sourceType,
        description: params.description || base.description,
        required_sheets: params.requiredSheets || (isBaselessTemplate(params.baseTemplateId) ? [] : base.requiredSheets),
        optional_sheets: params.optionalSheets || (isBaselessTemplate(params.baseTemplateId) ? [] : base.optionalSheets),
        visible_pages: params.visiblePages || (isBaselessTemplate(params.baseTemplateId) ? [] : base.visiblePages),
        metric_config: params.metricConfig || (isBaselessTemplate(params.baseTemplateId) ? getDefaultTemplateMetricConfig("custom") : base.metricConfig),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as CustomTemplateRow;
  },

  async deleteCustomTemplate(templateId: string) {
    const template = await this.getTemplateDefinition(templateId).catch(() => null);
    if (!template?.isCustom) {
      throw new Error("Somente templates personalizados podem ser excluídos.");
    }

    const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:delete-custom" });
    const { count, error: countError } = await supabase
      .from("dashboards")
      .select("id", { count: "exact", head: true })
      .eq("dashboard_type", templateId);

    if (countError) throw countError;

    const { error } = await supabase
      .from("dashboard_custom_templates")
      .delete()
      .eq("template_id", templateId);

    if (error) throw error;

    return {
      templateId,
      linkedDashboards: count || 0,
    };
  },

  async syncDashboardPagesForTemplate(templateId: string, metricConfig: Record<string, any>, visiblePages?: string[]) {
    const pageKeys = Array.isArray(visiblePages) ? visiblePages : [];
    const supabase = await createAdminClient({ actor: "admin", action: "template-catalog:sync-dashboard-pages" });
    const { data: dashboards, error } = await supabase
      .from("dashboards")
      .select("id")
      .eq("dashboard_type", templateId);

    if (error) throw error;

    for (const dashboard of dashboards || []) {
      await supabase.from("dashboard_pages").delete().eq("dashboard_id", dashboard.id);
      if (pageKeys.length === 0) continue;
      const rows = pageKeys.map((pageKey, index) => ({
        dashboard_id: dashboard.id,
        page_key: pageKey,
        title: metricConfig?.sections?.[pageKey]?.label || pageKey,
        sort_order: (index + 1) * 10,
        is_enabled: true,
      }));
      const { error: insertError } = await supabase.from("dashboard_pages").insert(rows);
      if (insertError) throw insertError;
    }
  },
};
