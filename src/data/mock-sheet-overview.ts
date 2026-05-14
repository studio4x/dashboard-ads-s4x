// ============================================================
// Mock: Overview (aba "overview" do Google Sheets)
// Dados consolidados de todas as fontes
// ============================================================

import type { OverviewRow } from "@/types/sheet-rows";
import type { Client, Dashboard, KpiSummary } from "@/types/entities";

// Dados diários — últimos 30 dias
export const mockOverviewRows: OverviewRow[] = [
  { date: "2024-04-15", total_spend: 4820, total_revenue: 23140, total_conversions: 142, total_clicks: 4382, total_impressions: 98200, blended_roas: 4.80, blended_cpa: 33.94, google_ads_spend: 2850, meta_ads_spend: 1970, organic_sessions: 1820, paid_sessions: 3100 },
  { date: "2024-04-16", total_spend: 5120, total_revenue: 25600, total_conversions: 158, total_clicks: 4720, total_impressions: 102400, blended_roas: 5.00, blended_cpa: 32.41, google_ads_spend: 3020, meta_ads_spend: 2100, organic_sessions: 1950, paid_sessions: 3300 },
  { date: "2024-04-17", total_spend: 4650, total_revenue: 21345, total_conversions: 131, total_clicks: 4100, total_impressions: 94300, blended_roas: 4.59, blended_cpa: 35.50, google_ads_spend: 2750, meta_ads_spend: 1900, organic_sessions: 1720, paid_sessions: 2950 },
  { date: "2024-04-18", total_spend: 5300, total_revenue: 27560, total_conversions: 167, total_clicks: 5020, total_impressions: 110000, blended_roas: 5.20, blended_cpa: 31.74, google_ads_spend: 3150, meta_ads_spend: 2150, organic_sessions: 2100, paid_sessions: 3600 },
  { date: "2024-04-19", total_spend: 5080, total_revenue: 26416, total_conversions: 160, total_clicks: 4890, total_impressions: 107800, blended_roas: 5.20, blended_cpa: 31.75, google_ads_spend: 3000, meta_ads_spend: 2080, organic_sessions: 2020, paid_sessions: 3450 },
  { date: "2024-04-20", total_spend: 4200, total_revenue: 18900, total_conversions: 118, total_clicks: 3800, total_impressions: 87000, blended_roas: 4.50, blended_cpa: 35.59, google_ads_spend: 2480, meta_ads_spend: 1720, organic_sessions: 1600, paid_sessions: 2650 },
  { date: "2024-04-21", total_spend: 3900, total_revenue: 17550, total_conversions: 108, total_clicks: 3500, total_impressions: 82000, blended_roas: 4.50, blended_cpa: 36.11, google_ads_spend: 2300, meta_ads_spend: 1600, organic_sessions: 1480, paid_sessions: 2420 },
  { date: "2024-04-22", total_spend: 5420, total_revenue: 28166, total_conversions: 172, total_clicks: 5180, total_impressions: 112000, blended_roas: 5.20, blended_cpa: 31.51, google_ads_spend: 3200, meta_ads_spend: 2220, organic_sessions: 2200, paid_sessions: 3700 },
  { date: "2024-04-23", total_spend: 5650, total_revenue: 30550, total_conversions: 185, total_clicks: 5400, total_impressions: 118000, blended_roas: 5.41, blended_cpa: 30.54, google_ads_spend: 3350, meta_ads_spend: 2300, organic_sessions: 2310, paid_sessions: 3850 },
  { date: "2024-04-24", total_spend: 5780, total_revenue: 31339, total_conversions: 192, total_clicks: 5530, total_impressions: 120000, blended_roas: 5.42, blended_cpa: 30.10, google_ads_spend: 3420, meta_ads_spend: 2360, organic_sessions: 2380, paid_sessions: 3920 },
  { date: "2024-04-25", total_spend: 5950, total_revenue: 33082, total_conversions: 201, total_clicks: 5680, total_impressions: 124000, blended_roas: 5.56, blended_cpa: 29.60, google_ads_spend: 3520, meta_ads_spend: 2430, organic_sessions: 2450, paid_sessions: 4050 },
  { date: "2024-04-26", total_spend: 5820, total_revenue: 32052, total_conversions: 196, total_clicks: 5570, total_impressions: 122000, blended_roas: 5.51, blended_cpa: 29.90, google_ads_spend: 3440, meta_ads_spend: 2380, organic_sessions: 2390, paid_sessions: 3980 },
  { date: "2024-04-27", total_spend: 4700, total_revenue: 22560, total_conversions: 138, total_clicks: 4200, total_impressions: 96000, blended_roas: 4.80, blended_cpa: 34.06, google_ads_spend: 2780, meta_ads_spend: 1920, organic_sessions: 1850, paid_sessions: 3020 },
  { date: "2024-04-28", total_spend: 4350, total_revenue: 20010, total_conversions: 124, total_clicks: 3900, total_impressions: 89000, blended_roas: 4.60, blended_cpa: 35.08, google_ads_spend: 2580, meta_ads_spend: 1770, organic_sessions: 1700, paid_sessions: 2800 },
];

// KPIs consolidados do período atual
export const mockKpiSummary: KpiSummary[] = [
  {
    label: "Investimento Total",
    value: 156840,
    formatted_value: "R$ 156.840",
    change_percent: 12.4,
    change_direction: "up",
    unit: "currency",
    icon: "DollarSign",
    description: "vs. período anterior",
  },
  {
    label: "Receita Atribuída",
    value: 784200,
    formatted_value: "R$ 784.200",
    change_percent: 18.7,
    change_direction: "up",
    unit: "currency",
    icon: "TrendingUp",
    description: "vs. período anterior",
  },
  {
    label: "ROAS Blended",
    value: 4.99,
    formatted_value: "4.99x",
    change_percent: 5.6,
    change_direction: "up",
    unit: "ratio",
    icon: "Zap",
    description: "vs. período anterior",
  },
  {
    label: "Conversões Totais",
    value: 4842,
    formatted_value: "4.842",
    change_percent: 9.2,
    change_direction: "up",
    unit: "number",
    icon: "Target",
    description: "vs. período anterior",
  },
  {
    label: "CPA Blended",
    value: 32.39,
    formatted_value: "R$ 32,39",
    change_percent: -3.1,
    change_direction: "down",
    unit: "currency",
    icon: "Crosshair",
    description: "vs. período anterior",
  },
  {
    label: "Cliques Totais",
    value: 148320,
    formatted_value: "148.320",
    change_percent: 14.8,
    change_direction: "up",
    unit: "number",
    icon: "MousePointer",
    description: "vs. período anterior",
  },
];

// Clientes de demonstração
export const mockClients: Client[] = [
  {
    id: "client-demo-001",
    name: "Empresa Demo — Loja XYZ",
    slug: "loja-xyz",
    industry: "E-commerce",
    website: "https://lojaxyz.com.br",
    primary_color: "#2563EB",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-04-28T09:30:00Z",
  },
  {
    id: "client-demo-002",
    name: "Clínica Bem Estar",
    slug: "clinica-bem-estar",
    industry: "Saúde",
    website: "https://clinicabemestar.com.br",
    primary_color: "#0891B2",
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-04-20T14:20:00Z",
  },
  {
    id: "client-demo-003",
    name: "Auto Peças Central",
    slug: "auto-pecas-central",
    industry: "Automotivo",
    website: "https://autopecascentral.com.br",
    primary_color: "#D97706",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-04-25T11:00:00Z",
  },
];

// Dashboards de demonstração
export const mockDashboards: Dashboard[] = [
  {
    id: "dashboard-demo-001",
    client_id: "client-demo-001",
    title: "Dashboard Principal — Loja XYZ",
    slug: "principal",
    description: "Visão completa de tráfego pago e orgânico",
    status: "active",
    date_range_default: "last_30d",
    pages: [],
    created_at: "2024-01-12T10:00:00Z",
    updated_at: "2024-04-28T09:30:00Z",
  },
  {
    id: "dashboard-demo-002",
    client_id: "client-demo-002",
    title: "Dashboard — Clínica Bem Estar",
    slug: "clinica-principal",
    description: "Monitoramento de campanhas de saúde",
    status: "active",
    date_range_default: "last_30d",
    pages: [],
    created_at: "2024-02-20T10:00:00Z",
    updated_at: "2024-04-20T14:20:00Z",
  },
];
