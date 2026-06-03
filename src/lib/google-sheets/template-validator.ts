import { readSheetRange } from "./read-sheet-range";
import { ImportResult, ImportError } from "@/types/import";
import { DashboardTemplateCatalogService } from "@/services/dashboard-template-catalog-service";

export class TemplateValidator {
  /**
   * Valida se a planilha corresponde ao template esperado.
   * Checa a aba Dashboard_Config quando ela é obrigatória no template.
   */
  static async validate(
    spreadsheetId: string, 
    expectedTemplateId: string, 
    expectedVersion = "1.0"
  ): Promise<{ isValid: boolean; errors: ImportError[]; warnings: ImportError[]; templateId?: string; version?: string }> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    if (expectedTemplateId === "meta_ads_s4x") {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Verifica se Dashboard_Config é obrigatória para este template
    const templateDef = await DashboardTemplateCatalogService.getTemplateDefinition(expectedTemplateId).catch(() => null);
    const isConfigRequired = templateDef?.requiredSheets?.includes("Dashboard_Config") ?? true;
    
    try {
      // Tenta ler a aba Dashboard_Config
      const rows = await readSheetRange(spreadsheetId, "Dashboard_Config!A1:B10");
      
      if (!rows || rows.length === 0) {
        // Se a aba é obrigatória, bloqueia. Se for opcional, apenas avisa.
        if (isConfigRequired) {
          return {
            isValid: false,
            errors: [{
              severity: "blocking",
              stage: "template_validation",
              sheet: "Dashboard_Config",
              message: "Aba 'Dashboard_Config' não encontrada ou está vazia."
            }],
            warnings: []
          };
        } else {
          // Aba opcional ausente — continua sem ela
          warnings.push({
            severity: "warning",
            stage: "template_validation",
            sheet: "Dashboard_Config",
            message: "Aba opcional 'Dashboard_Config' não encontrada. Importação prosseguirá sem ela."
          });
          return { isValid: true, errors: [], warnings };
        }
      }

      // Converte para objeto chave-valor
      const config: Record<string, string> = {};
      rows.forEach(row => {
        if (row[0] && row[1]) {
          config[String(row[0]).trim()] = String(row[1]).trim();
        }
      });

      const templateId = config["Template"];
      const version = config["Versao_Template"];

      if (templateId !== expectedTemplateId) {
        errors.push({
          severity: "blocking",
          stage: "template_validation",
          sheet: "Dashboard_Config",
          field: "Template",
          message: `Template da planilha (${templateId}) não corresponde ao modelo do dashboard (${expectedTemplateId}).`
        });
      }

      if (version !== expectedVersion) {
        errors.push({
          severity: "blocking",
          stage: "template_validation",
          sheet: "Dashboard_Config",
          field: "Versao_Template",
          message: `Versão do template (${version}) é incompatível. Esperado: ${expectedVersion}.`
        });
      }

      // Validação de Fonte (Opcional, mas boa prática)
      const fonte = config["Fonte"];
      if (!fonte) {
        warnings.push({
          severity: "warning",
          stage: "template_validation",
          sheet: "Dashboard_Config",
          field: "Fonte",
          message: "Campo 'Fonte' não encontrado em Dashboard_Config."
        });
      }

      return {
        isValid: errors.filter(e => e.severity === "blocking").length === 0,
        errors: errors.filter(e => e.severity === "blocking"),
        warnings: [...errors.filter(e => e.severity === "warning"), ...warnings],
        templateId,
        version
      };

    } catch (err: any) {
      // Se a aba não foi encontrada e ela é opcional, não bloqueamos
      // O erro "Aba não encontrada: ..." vem de google-sheets-errors.ts (code TAB_NOT_FOUND)
      const isNotFound = err.code === "TAB_NOT_FOUND" ||
                         err.message?.toLowerCase().includes("aba não encontrada") ||
                         err.message?.toLowerCase().includes("not found") ||
                         err.message?.toLowerCase().includes("unable to parse range");

      if (!isConfigRequired && isNotFound) {
        return {
          isValid: true,
          errors: [],
          warnings: [{
            severity: "warning",
            stage: "template_validation",
            sheet: "Dashboard_Config",
            message: "Aba opcional 'Dashboard_Config' não encontrada. Importação prosseguirá sem ela."
          }]
        };
      }

      return {
        isValid: false,
        errors: [{
          severity: "blocking",
          stage: "template_validation",
          message: `Erro ao acessar aba Dashboard_Config: ${err.message}`
        }],
        warnings: []
      };
    }
  }
}
