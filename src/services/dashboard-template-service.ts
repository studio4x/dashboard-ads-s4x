import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_TEMPLATES, getTemplateById } from "@/lib/dashboard/templates";

export type DashboardTemplateType = 
  | "google_ads" 
  | "meta_ads" 
  | "google_ads_meta_ads" 
  | "custom" 
  | "google_ads_s4x" 
  | "meta_ads_s4x";

const TEMPLATE_PAGES: Record<string, { key: string; title: string; sort: number }[]> = {
  google_ads_s4x: [
    { key: "executive-summary", title: "Resumo Executivo", sort: 10 },
    { key: "google-ads", title: "Google Ads", sort: 20 },
    { key: "campaigns", title: "Campanhas", sort: 30 },
    { key: "keywords", title: "Palavras-chave", sort: 40 },
    { key: "search-terms", title: "Termos de Pesquisa", sort: 50 },
    { key: "ads-assets", title: "Anúncios e Recursos", sort: 60 }
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
  ]
};

export class DashboardTemplateService {
  /**
   * Cria um novo dashboard usando um template predefinido
   */
  static async createFromTemplate(
    clientId: string,
    name: string,
    slug: string,
    templateType: DashboardTemplateType,
    description?: string
  ) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = await createAdminClient();
    const template = getTemplateById(templateType);

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
        status: "active"
      })
      .select()
      .single();

    if (dashError) throw new Error(`Erro ao criar dashboard: ${dashError.message}`);

    // 2. Criar Páginas do Template
    const pagesToCreate = TEMPLATE_PAGES[templateType] || TEMPLATE_PAGES["google_ads"];
    
    if (templateType !== "custom") {
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
        status: "active"
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
