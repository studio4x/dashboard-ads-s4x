export type TemplateStatus = "active" | "coming_soon" | "deprecated";
export type DataSourceType = "google_sheets" | "api" | "mixed";

export interface DashboardTemplateDefinition {
  id: string;
  name: string;
  platform: "google_ads" | "meta_ads" | "mixed" | "custom";
  version: string;
  status: TemplateStatus;
  sourceType: DataSourceType;
  description: string;
  requiredSheets?: string[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplateDefinition[] = [
  {
    id: "google_ads_s4x",
    name: "Google Ads — S4X",
    platform: "google_ads",
    version: "1.0",
    status: "active",
    sourceType: "google_sheets",
    description: "Dashboard Google Ads completo baseado no script S4X.",
    requiredSheets: [
      "Meta",
      "Dashboard_Config",
      "Performance Diária",
      "Campanhas",
      "Grupos de Anúncios",
      "Palavras-Chave",
      "Termos de Pesquisa",
      "Palavras-Chave Negativas",
      "Anúncios (Recursos)"
    ]
  },
  {
    id: "meta_ads_s4x",
    name: "Meta Ads — S4X",
    platform: "meta_ads",
    version: "1.0",
    status: "coming_soon",
    sourceType: "google_sheets",
    description: "Dashboard Meta Ads baseado no coletor S4X (Em breve)."
  },
  {
    id: "google_ads",
    name: "Google Ads (Legado)",
    platform: "google_ads",
    version: "0.1",
    status: "deprecated",
    sourceType: "google_sheets",
    description: "Modelo básico legado."
  },
  {
    id: "custom",
    name: "Customizado",
    platform: "custom",
    version: "1.0",
    status: "active",
    sourceType: "mixed",
    description: "Estrutura livre para dashboards personalizados."
  }
];

export function getTemplateById(id: string) {
  return DASHBOARD_TEMPLATES.find(t => t.id === id);
}

export const VISIBLE_PAGES_BY_TEMPLATE: Record<string, string[]> = {
  google_ads_s4x: [
    "executive-summary",
    "google-ads",
    "campaigns",
    "keywords",
    "search-terms",
    "ads-assets"
  ],
  google_ads: [
    "executive-summary",
    "google-ads",
    "campaigns",
    "keywords"
  ],
  meta_ads: [
    "executive-summary",
    "meta-ads"
  ],
  custom: [
    "executive-summary",
    "google-ads",
    "meta-ads",
    "conversions",
    "audience",
    "search-console"
  ]
};

export function getVisiblePages(templateId?: string) {
  if (!templateId || !VISIBLE_PAGES_BY_TEMPLATE[templateId]) {
    return VISIBLE_PAGES_BY_TEMPLATE["custom"];
  }
  return VISIBLE_PAGES_BY_TEMPLATE[templateId];
}
