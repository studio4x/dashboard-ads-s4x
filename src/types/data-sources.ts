// ============================================================
// Types: Data Sources
// Configuração de fontes de dados (Google Sheets e futuras)
// ============================================================

export type DataSourceType =
  | "google_sheets"
  | "google_ads"   // futuro
  | "meta_ads"     // futuro
  | "ga4"          // futuro
  | "search_console"; // futuro

export type ImportStatus = "idle" | "running" | "success" | "error" | "never";

// Configuração de uma planilha do Google Sheets
export interface GoogleSheetConfig {
  spreadsheet_id: string;
  spreadsheet_url: string;
  spreadsheet_name: string;
  service_account_email?: string; // futura conexão real
  tabs: SheetTabConfig[];
  last_synced_at?: string; // ISO
  sync_frequency?: "manual" | "hourly" | "daily";
}

// Configuração de uma aba específica da planilha
export interface SheetTabConfig {
  tab_name: string; // nome exato da aba no Sheets
  data_type: string; // "campaigns", "keywords", "overview", etc.
  header_row: number; // linha do cabeçalho (padrão: 1)
  data_start_row: number; // linha onde começam os dados (padrão: 2)
  range?: string; // ex: "A1:Z1000" (opcional)
  active: boolean;
}

// Fonte de dados genérica vinculada a um dashboard
export interface DashboardDataSource {
  id: string;
  dashboard_id: string;
  source_type: DataSourceType;
  label: string;
  config: GoogleSheetConfig | Record<string, unknown>; // futuras fontes
  status: ImportStatus;
  created_at: string;
  updated_at: string;
}

// Log de importação
export interface ImportLog {
  id: string;
  data_source_id: string;
  dashboard_id: string;
  client_id: string;
  started_at: string;
  finished_at?: string;
  status: ImportStatus;
  rows_imported?: number;
  rows_error?: number;
  error_message?: string;
  triggered_by: "manual" | "scheduled" | "webhook";
}
