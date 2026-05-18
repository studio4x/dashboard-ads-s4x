// ============================================================
// Constantes globais da plataforma
// ============================================================

import type { DashboardPageKey } from "@/types/entities";

export const APP_NAME = "Dashboard ADS S4X";
export const APP_SLUG = "s4x";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.1";

// IDs de demonstração (mock)
export const DEMO_CLIENT_ID = "client-demo-001";
export const DEMO_DASHBOARD_ID = "dashboard-demo-001";

// Configuração de páginas do dashboard
export const DASHBOARD_PAGES: {
  key: DashboardPageKey;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    key: "executive-summary",
    label: "Resumo Executivo",
    icon: "LayoutDashboard",
    description: "Visão consolidada de todas as fontes",
  },
  {
    key: "google-ads",
    label: "Google Ads",
    icon: "Search",
    description: "Campanhas, grupos e palavras-chave",
  },
  {
    key: "meta-ads",
    label: "Meta Ads",
    icon: "Facebook",
    description: "Campanhas e conjuntos de anúncios Meta",
  },
  {
    key: "conversions",
    label: "Conversões",
    icon: "Target",
    description: "Eventos, metas e comportamento",
  },
  {
    key: "audience",
    label: "Público e Origem",
    icon: "Users",
    description: "Demografias, canais e origens de tráfego",
  },
  {
    key: "search-console",
    label: "Search Console",
    icon: "Globe",
    description: "Impressões orgânicas, cliques e posições",
  },
  {
    key: "campaigns",
    label: "Campanhas",
    icon: "Target",
    description: "Performance por campanha detalhada",
  },
  {
    key: "ad-groups",
    label: "Grupos de Anúncios",
    icon: "Target",
    description: "Desempenho por grupo de anúncios",
  },
  {
    key: "keywords",
    label: "Palavras-chave",
    icon: "Search",
    description: "Termos com melhor performance",
  },
  {
    key: "search-terms",
    label: "Termos de Pesquisa",
    icon: "Search",
    description: "O que os usuários pesquisaram",
  },
  {
    key: "ads-assets",
    label: "Anúncios e Recursos",
    icon: "LayoutDashboard",
    description: "Performance dos criativos",
  },
  {
    key: "negative-keywords",
    label: "Negativas",
    icon: "X",
    description: "Palavras-chave excluídas",
  },
];

// Opções de período predefinido
export const DATE_RANGE_OPTIONS = [
  { label: "Últimos 7 dias", value: "last_7d", days: 7 },
  { label: "Últimos 14 dias", value: "last_14d", days: 14 },
  { label: "Últimos 30 dias", value: "last_30d", days: 30 },
  { label: "Últimos 60 dias", value: "last_60d", days: 60 },
  { label: "Últimos 90 dias", value: "last_90d", days: 90 },
  { label: "Este mês", value: "this_month", days: 0 },
  { label: "Mês passado", value: "last_month", days: 0 },
  { label: "Personalizado", value: "custom", days: 0 },
] as const;

// Cores dos gráficos (Recharts)
export const CHART_COLORS = {
  primary: "#2563EB",
  secondary: "#7C3AED",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  info: "#0891B2",
  muted: "#94A3B8",
  google: "#4285F4",
  meta: "#1877F2",
  ga4: "#E37400",
  sc: "#34A853",
};

// Paleta de cores para gráficos de série
export const CHART_PALETTE = [
  "#2563EB",
  "#7C3AED",
  "#0891B2",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#EC4899",
  "#F59E0B",
];

// Abas padrão do Google Sheets
export const SHEET_TABS = [
  "overview",
  "google_ads",
  "meta_ads",
  "ga4_events",
  "audience",
  "search_console",
  "campaigns",
  "keywords",
  "search_terms",
  "pages",
  "devices",
  "locations",
  "insights",
] as const;

export type SheetTabName = (typeof SHEET_TABS)[number];

// Rotas da área admin
export const ADMIN_NAV = [
  { href: "/admin", label: "Visão Geral", icon: "LayoutDashboard", exact: true },
  { href: "/admin/clients", label: "Clientes", icon: "Building2" },
  { href: "/admin/dashboards", label: "Dashboards", icon: "PieChart" },
  { href: "/admin/data-sources", label: "Fontes de Dados", icon: "Database" },
  { href: "/admin/google-sheets", label: "Google Sheets", icon: "FileSpreadsheet" },
  { href: "/admin/templates", label: "Templates", icon: "LayoutTemplate" },
  { href: "/admin/import-logs", label: "Logs de Importação", icon: "ScrollText" },
  { href: "/admin/settings", label: "Configurações", icon: "Settings" },
];
