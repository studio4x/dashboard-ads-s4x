import { readSheetRange } from "./read-sheet-range";
import { ImportResult, ImportError } from "@/types/import";

export class TemplateValidator {
  /**
   * Valida se a planilha corresponde ao template esperado.
   * Checa a aba Dashboard_Config.
   */
  static async validate(
    spreadsheetId: string, 
    expectedTemplateId: string, 
    expectedVersion = "1.0"
  ): Promise<{ isValid: boolean; errors: ImportError[]; templateId?: string; version?: string }> {
    const errors: ImportError[] = [];
    
    try {
      // Tenta ler a aba Dashboard_Config
      const rows = await readSheetRange(spreadsheetId, "Dashboard_Config!A1:B10");
      
      if (!rows || rows.length === 0) {
        return {
          isValid: false,
          errors: [{
            severity: "blocking",
            stage: "template_validation",
            sheet: "Dashboard_Config",
            message: "Aba 'Dashboard_Config' não encontrada ou está vazia."
          }]
        };
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
        // Warning se a versão for diferente mas o template for o mesmo? 
        // Por enquanto vamos tratar como warning se for compatível ou erro se for bloqueante.
        // O usuário pediu apenas validação preliminar.
        errors.push({
          severity: "warning",
          stage: "template_validation",
          sheet: "Dashboard_Config",
          field: "Versao_Template",
          message: `Versão do template (${version}) é diferente da esperada (${expectedVersion}).`
        });
      }

      return {
        isValid: errors.filter(e => e.severity === "blocking").length === 0,
        errors,
        templateId,
        version
      };

    } catch (err: any) {
      return {
        isValid: false,
        errors: [{
          severity: "blocking",
          stage: "template_validation",
          message: `Erro ao acessar aba Dashboard_Config: ${err.message}`
        }]
      };
    }
  }
}
