export type ImportStage = 
  | "connection" 
  | "template_validation" 
  | "schema_validation"
  | "sheet_validation" 
  | "parsing" 
  | "normalization"
  | "persistence"
  | "snapshot_creation";

export type ImportSeverity = "blocking" | "warning" | "info";

export interface ImportError {
  severity: ImportSeverity;
  stage: ImportStage;
  sheet?: string;
  field?: string;
  message: string;
  code?: string;
}

export interface ImportResult {
  success: boolean;
  stage: ImportStage;
  templateId?: string;
  templateVersion?: string;
  error?: string;
  errors: ImportError[];
  warnings: ImportError[];
  summary?: {
    rowsProcessed: number;
    sheetsRead: string[];
    timestamp: string;
  };
}
