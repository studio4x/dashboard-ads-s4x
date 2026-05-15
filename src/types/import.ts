export type ImportStage = 
  | "connection" 
  | "template_validation" 
  | "sheet_validation" 
  | "parsing" 
  | "persistence";

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
  errors: ImportError[];
  warnings: ImportError[];
  summary?: {
    rowsProcessed: number;
    sheetsRead: string[];
    timestamp: string;
  };
}
