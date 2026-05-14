import { SheetValidationError, ValidationLevel } from "@/types/google-sheets";

export class SheetValidator {
  private errors: SheetValidationError[] = [];

  constructor(private tabName: string) {}

  /**
   * Valida se as colunas obrigatórias estão presentes no cabeçalho.
   */
  validateHeaders(headers: string[], requiredHeaders: string[]) {
    requiredHeaders.forEach(required => {
      if (!headers.includes(required)) {
        this.addError("error", `Coluna obrigatória ausente: ${required}`, undefined, required);
      }
    });
  }

  /**
   * Adiciona um erro ou aviso.
   */
  addError(level: ValidationLevel, message: string, row?: number, column?: string, value?: any) {
    this.errors.push({
      tab: this.tabName,
      level,
      message,
      row,
      column,
      value
    });
  }

  /**
   * Retorna todos os erros encontrados.
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Verifica se há erros críticos que impedem a importação.
   */
  hasCriticalErrors() {
    return this.errors.some(e => e.level === "error");
  }

  /**
   * Utilitário para validar se um valor é numérico.
   */
  checkNumber(value: any, row: number, column: string, required = true) {
    if (value === null || value === undefined || value === "") {
      if (required) {
        this.addError("warning", `Valor numérico vazio na linha ${row}, coluna ${column}`, row, column);
      }
      return;
    }

    if (isNaN(Number(value))) {
      this.addError("warning", `Valor inválido na linha ${row}, coluna ${column}: ${value}`, row, column, value);
    }
  }

  /**
   * Utilitário para validar se um valor é data válida.
   */
  checkDate(value: any, row: number, column: string) {
    if (!value || String(value).trim() === "") {
      this.addError("error", `Data obrigatória ausente na linha ${row}`, row, column);
      return;
    }
    
    // Simples check de formato inicial, o normalizador tratará o resto
    if (!String(value).includes("/") && !String(value).includes("-")) {
      this.addError("warning", `Formato de data suspeito na linha ${row}: ${value}`, row, column, value);
    }
  }
}
