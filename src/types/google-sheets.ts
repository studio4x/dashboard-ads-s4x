export type ValidationLevel = "info" | "warning" | "error";

export interface SheetValidationError {
  level: ValidationLevel;
  message: string;
  tab?: string;
  column?: string;
  row?: number;
  value?: any;
}

export interface RawSheetData {
  tabName: string;
  values: any[][];
}

export interface NormalizedSheetData<T> {
  tabName: string;
  data: T[];
  errors: SheetValidationError[];
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  useMocks?: boolean;
}
