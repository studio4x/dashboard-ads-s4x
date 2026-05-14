// ============================================================
// Types: Entities
// Entidades principais do sistema (clientes, dashboards, etc.)
// ============================================================

export type UserRole = "admin" | "client" | "viewer";

export type DashboardStatus = "active" | "draft" | "archived";

export type DashboardPageKey =
  | "executive-summary"
  | "google-ads"
  | "meta-ads"
  | "conversions"
  | "audience"
  | "search-console";

// Cliente
export interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  industry?: string;
  website?: string;
  primary_color?: string;
  created_at: string;
  updated_at: string;
}

// Dashboard
export interface Dashboard {
  id: string;
  client_id: string;
  title: string;
  slug: string;
  description?: string;
  status: DashboardStatus;
  pages: DashboardPage[];
  date_range_default?: "last_7d" | "last_30d" | "last_90d" | "custom";
  created_at: string;
  updated_at: string;
}

// Página de um dashboard
export interface DashboardPage {
  id: string;
  dashboard_id: string;
  key: DashboardPageKey;
  label: string;
  icon: string;
  order: number;
  active: boolean;
}

// Widget de uma página
export interface DashboardWidget {
  id: string;
  page_id: string;
  widget_type:
    | "metric_card"
    | "line_chart"
    | "bar_chart"
    | "donut_chart"
    | "horizontal_bar"
    | "data_table"
    | "insight_card";
  title: string;
  data_source_tab: string; // aba do Sheets
  config: Record<string, unknown>;
  grid_col_span: 1 | 2 | 3 | 4;
  order: number;
}

// Usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

// Vínculo usuário-cliente
export interface ClientUser {
  user_id: string;
  client_id: string;
  role: "owner" | "viewer";
  created_at: string;
}

// Template de dashboard
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  preview_url?: string;
  pages: DashboardPageKey[];
  is_default: boolean;
  created_at: string;
}

// Período de data selecionado
export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label?: string;
}

// Resumo de métricas para cards KPI
export interface KpiSummary {
  label: string;
  value: string | number;
  formatted_value: string;
  change_percent: number;
  change_direction: "up" | "down" | "neutral";
  unit?: "currency" | "percent" | "number" | "ratio";
  icon?: string;
  description?: string;
}
