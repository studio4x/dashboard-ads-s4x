import { ImportError } from "@/types/import";
import { GOOGLE_ADS_S4X_SCHEMA, TemplateSchema, TabSchema } from "./schemas/google-ads-s4x";

export class SchemaValidator {
  static validate(
    templateId: string, 
    spreadsheetTabs: string[], 
    tabHeaders: Record<string, string[]>
  ): { isValid: boolean; errors: ImportError[]; warnings: ImportError[] } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    
    // Por enquanto só suportamos google_ads_s4x
    const schema = templateId === "google_ads_s4x" ? GOOGLE_ADS_S4X_SCHEMA : null;
    
    if (!schema) {
      return { isValid: true, errors: [], warnings: [] }; // Se não tem schema, pula (dashboards antigos)
    }

    // 1. Validar Abas Obrigatórias
    Object.entries(schema.tabs).forEach(([tabName, tabSchema]) => {
      if (tabSchema.required && !spreadsheetTabs.includes(tabName)) {
        errors.push({
          severity: "blocking",
          stage: "schema_validation",
          sheet: tabName,
          message: `Aba obrigatória ausente: ${tabName}`
        });
      } else if (!tabSchema.required && !spreadsheetTabs.includes(tabName)) {
        warnings.push({
          severity: "warning",
          stage: "schema_validation",
          sheet: tabName,
          message: `Aba opcional ausente: ${tabName}`
        });
      }
    });

    // 2. Validar Colunas Críticas
    spreadsheetTabs.forEach(tabName => {
      const tabSchema = schema.tabs[tabName];
      if (!tabSchema) return;

      const headers = tabHeaders[tabName] || [];
      
      // Colunas Críticas (Bloqueantes)
      tabSchema.criticalColumns.forEach(col => {
        if (!headers.includes(col)) {
          errors.push({
            severity: "blocking",
            stage: "schema_validation",
            sheet: tabName,
            field: col,
            message: `Coluna crítica ausente na aba ${tabName}: ${col}`
          });
        }
      });

      // Colunas Esperadas (Warnings)
      tabSchema.expectedColumns.forEach(col => {
        if (!headers.includes(col) && !tabSchema.criticalColumns.includes(col)) {
          warnings.push({
            severity: "warning",
            stage: "schema_validation",
            sheet: tabName,
            field: col,
            message: `Coluna esperada ausente na aba ${tabName}: ${col}`
          });
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
