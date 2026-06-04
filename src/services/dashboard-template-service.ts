import { getDefaultTemplateMetricConfig, normalizeTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";
import { DASHBOARD_PAGES } from "@/lib/constants";
import { DashboardTemplateConfigService } from "@/services/dashboard-template-config-service";
import { DashboardTemplateCatalogService } from "@/services/dashboard-template-catalog-service";
import { normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";

export type DashboardTemplateType = string;

function resolvePageCatalog(templatePageKeys: string[], fallbackPages: { key: string; title: string; sort: number }[]) {
  return templatePageKeys.map((pageKey, index) => {
    const fallback = fallbackPages.find((page) => page.key === pageKey);
    const knownPage = DASHBOARD_PAGES.find((page) => page.key === pageKey);
    return fallback || {
      key: pageKey,
      title: knownPage?.label || pageKey,
      sort: (index + 1) * 10,
    };
  });
}

const TEMPLATE_PAGES: Record<string, { key: string; title: string; sort: number }[]> = {
  google_meta_ads_s4x: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "google-ads", title: "Google Ads", sort: 20 },
    { key: "meta-ads", title: "Meta Ads", sort: 30 },
  ],
  google_ads_s4x: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "campaigns", title: "Campanhas", sort: 20 },
    { key: "ad-groups", title: "Grupos de Anúncio", sort: 30 },
    { key: "keywords", title: "Palavras-chave", sort: 40 },
    { key: "search-terms", title: "Termos de Pesquisa", sort: 50 },
    { key: "ads-assets", title: "Anúncios e Recursos", sort: 60 },
    { key: "negative-keywords", title: "Palavras-chave Negativas", sort: 70 }
  ],
  google_ads: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "google-ads", title: "Google Ads", sort: 20 },
    { key: "campaigns", title: "Campanhas", sort: 30 },
    { key: "keywords", title: "Palavras-chave", sort: 40 }
  ],
  meta_ads: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "meta-ads", title: "Meta Ads", sort: 20 }
  ],
  google_ads_meta_ads: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "google-ads", title: "Google Ads", sort: 20 },
    { key: "meta-ads", title: "Meta Ads", sort: 30 }
  ],
  meta_ads_s4x: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "campanhas", title: "Campanhas", sort: 20 },
    { key: "conjuntos", title: "Conjuntos", sort: 30 },
    { key: "anuncios", title: "Anúncios", sort: 40 },
    { key: "funil", title: "Funil", sort: 50 },
    { key: "engajamento", title: "Engajamento", sort: 60 }
  ]
};

export class DashboardTemplateService {
  static async applyTemplateToExistingDashboard(
    dashboardId: string,
    templateType: DashboardTemplateType,
    options?: {
      metaObjectives?: string[];
      metaPrimaryObjective?: string | null;
    }
  ) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = await createAdminClient();
    const template = await DashboardTemplateCatalogService.getTemplateDefinition(templateType).catch(() => null);
    if (!template) {
      throw new Error("Template selecionado não encontrado.");
    }

    const { data: currentDashboard, error: fetchError } = await supabase
      .from("dashboards")
      .select("*")
      .eq("id", dashboardId)
      .single();

    if (fetchError || !currentDashboard) {
      throw new Error("Dashboard de destino não encontrado.");
    }

    const sheetTemplateId = template.sheetTemplateId || templateType;
    const normalizedObjectives = template.platform === "meta_ads" || template.platform === "mixed"
      ? normalizeMetaAdsObjectives(options?.metaObjectives || (currentDashboard.meta_objectives || []))
      : [];

    const storedTemplateConfig = template.isCustom
      ? template.metricConfig
      : await DashboardTemplateConfigService.getTemplateConfig(sheetTemplateId).catch(() => null);
    const templateConfig = getDefaultTemplateMetricConfig(
      sheetTemplateId,
      normalizedObjectives as any,
      (options?.metaPrimaryObjective || normalizedObjectives[0] || null) as any
    );
    const resolvedTemplateConfig = normalizeTemplateMetricConfig(
      storedTemplateConfig || templateConfig,
      sheetTemplateId,
      normalizedObjectives as any,
      (options?.metaPrimaryObjective || normalizedObjectives[0] || null) as any
    );
    const basePages = TEMPLATE_PAGES[sheetTemplateId] || (sheetTemplateId === "custom" ? [] : TEMPLATE_PAGES["google_ads"]);
    const visiblePageKeys = Array.isArray(template.visiblePages) && template.visiblePages.length > 0
      ? template.visiblePages
      : [];
    const pagesToCreate = visiblePageKeys.length > 0
      ? resolvePageCatalog(visiblePageKeys, basePages)
      : basePages;

    const { error: updateError } = await supabase
      .from("dashboards")
      .update({
        dashboard_type: templateType,
        template_version: template.version || "1.0",
        platform: template.platform || currentDashboard.platform || "custom",
        meta_objectives: normalizedObjectives,
        meta_primary_objective: normalizedObjectives[0] || null,
        template_config: resolvedTemplateConfig,
      })
      .eq("id", dashboardId);

    if (updateError) throw new Error(`Erro ao atualizar template do dashboard: ${updateError.message}`);

    await supabase.from("dashboard_pages").delete().eq("dashboard_id", dashboardId);
    if (pagesToCreate.length > 0) {
      const pages = pagesToCreate.map((page) => ({
        dashboard_id: dashboardId,
        page_key: page.key,
        title: page.title,
        sort_order: page.sort,
        is_enabled: true,
      }));
      const { error: pagesError } = await supabase.from("dashboard_pages").insert(pages);
      if (pagesError) throw new Error(`Erro ao recriar páginas do template: ${pagesError.message}`);
    }

    const { data: updatedDashboard, error: updatedFetchError } = await supabase
      .from("dashboards")
      .select("*")
      .eq("id", dashboardId)
      .single();

    if (updatedFetchError) throw updatedFetchError;
    return updatedDashboard;
  }

  /**
   * Cria um novo dashboard usando um template predefinido
   */
  static async createFromTemplate(
    clientId: string,
    name: string,
    slug: string,
    templateType: DashboardTemplateType,
    description?: string,
    options?: {
      metaObjectives?: string[];
      metaPrimaryObjective?: string | null;
    }
  ) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = await createAdminClient();
    const template = await DashboardTemplateCatalogService.getTemplateDefinition(templateType).catch(() => null);
    const sheetTemplateId = template?.sheetTemplateId || templateType;
    const storedTemplateConfig = template?.isCustom
      ? template.metricConfig
      : await DashboardTemplateConfigService.getTemplateConfig(sheetTemplateId).catch(() => null);
    const templateConfig = getDefaultTemplateMetricConfig(
      sheetTemplateId,
      (options?.metaObjectives || []) as any,
      (options?.metaPrimaryObjective || null) as any
    );
    const resolvedTemplateConfig = normalizeTemplateMetricConfig(
      storedTemplateConfig || templateConfig,
      sheetTemplateId,
      (options?.metaObjectives || []) as any,
      (options?.metaPrimaryObjective || null) as any
    );
    const basePages = TEMPLATE_PAGES[sheetTemplateId] || (sheetTemplateId === "custom" ? [] : TEMPLATE_PAGES["google_ads"]);
    const visiblePageKeys = Array.isArray(template?.visiblePages) && template.visiblePages.length > 0
      ? template.visiblePages
      : [];
    const pagesToCreate = visiblePageKeys.length > 0
      ? resolvePageCatalog(visiblePageKeys, basePages)
      : basePages;

    // 1. Criar Dashboard
    const { data: dashboard, error: dashError } = await supabase
      .from("dashboards")
      .insert({
        client_id: clientId,
        name,
        slug,
        description,
        dashboard_type: templateType,
        template_version: template?.version || "1.0",
        platform: template?.platform || "custom",
        status: "active",
        meta_objectives: options?.metaObjectives || [],
        meta_primary_objective: options?.metaPrimaryObjective || null,
        template_config: resolvedTemplateConfig
      })
      .select()
      .single();

    if (dashError) throw new Error(`Erro ao criar dashboard: ${dashError.message}`);

    // 2. Criar Páginas do Template
    if (pagesToCreate && pagesToCreate.length > 0) {
      const pages = pagesToCreate.map(p => ({
        dashboard_id: dashboard.id,
        page_key: p.key,
        title: p.title,
        sort_order: p.sort,
        is_enabled: true
      }));

      const { error: pagesError } = await supabase
        .from("dashboard_pages")
        .insert(pages);

      if (pagesError) throw new Error(`Erro ao criar páginas do template: ${pagesError.message}`);
    }

    return dashboard;
  }

  /**
   * Duplica um dashboard existente
   */
  static async duplicateDashboard(
    sourceDashboardId: string,
    clientId: string,
    newName: string,
    newSlug: string
  ) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = await createAdminClient();

    // 1. Obter dashboard origem
    const { data: sourceDash, error: fetchDashError } = await supabase
      .from("dashboards")
      .select("*")
      .eq("id", sourceDashboardId)
      .single();

    if (fetchDashError || !sourceDash) {
      throw new Error("Dashboard de origem não encontrado");
    }

    // 2. Obter páginas origem
    const { data: sourcePages, error: fetchPagesError } = await supabase
      .from("dashboard_pages")
      .select("*")
      .eq("dashboard_id", sourceDashboardId);

    if (fetchPagesError) throw new Error("Erro ao carregar páginas originais");
    const sourceTemplateDefinition = await DashboardTemplateCatalogService.getTemplateDefinition(sourceDash.dashboard_type).catch(() => null);
    const sourceSheetTemplateId = sourceTemplateDefinition?.sheetTemplateId || sourceDash.dashboard_type;
    const templateConfig = normalizeTemplateMetricConfig(
      (sourceDash as any)?.template_config,
      sourceSheetTemplateId,
      (sourceDash.meta_objectives || []) as any,
      sourceDash.meta_primary_objective || null
    );

    // 3. Criar novo dashboard
    const { data: newDash, error: dashError } = await supabase
      .from("dashboards")
      .insert({
        client_id: clientId,
        name: newName,
        slug: newSlug,
        description: sourceDash.description,
        dashboard_type: sourceDash.dashboard_type,
        template_version: sourceDash.template_version,
        platform: sourceDash.platform,
        default_period: sourceDash.default_period,
        status: "active",
        meta_objectives: sourceDash.meta_objectives || [],
        meta_primary_objective: sourceDash.meta_primary_objective || null,
        template_config: templateConfig
      })
      .select()
      .single();

    if (dashError) throw new Error(`Erro ao duplicar dashboard: ${dashError.message}`);

    // 4. Copiar páginas
    if (sourcePages && sourcePages.length > 0) {
      const pagesToInsert = sourcePages.map(p => ({
        dashboard_id: newDash.id,
        page_key: p.page_key,
        title: p.title,
        description: p.description,
        sort_order: p.sort_order,
        is_enabled: p.is_enabled
      }));

      const { error: pagesError } = await supabase
        .from("dashboard_pages")
        .insert(pagesToInsert);

      if (pagesError) throw new Error(`Erro ao copiar páginas: ${pagesError.message}`);
    }

    return newDash;
  }
}
