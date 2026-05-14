import { ValidationLevel } from "./google-sheets";

export type ImportStatus = "pending" | "running" | "success" | "success_with_warnings" | "failed";

export interface ImportLogEntry {
  id: string;
  clientId: string;
  dashboardId: string;
  spreadsheetId: string;
  startedAt: string;
  finishedAt?: string;
  status: ImportStatus;
  tabsRead: string[];
  rowsRead: number;
  warnings: number;
  errors: number;
  source: "google_sheets" | "mock";
  durationMs?: number;
  errorDetails?: string;
}

export interface ImportReport {
  status: ImportStatus;
  logs: string[];
  issues: {
    level: ValidationLevel;
    message: string;
    tab?: string;
  }[];
}
