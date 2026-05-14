import { parse, format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Normaliza valores vindos da planilha para formatos padrão.
 */
export const SheetNormalizer = {
  /**
   * Converte moeda BRL (R$ 1.234,56) ou números com vírgula para number.
   */
  toNumber(value: any): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    // Remove R$, pontos de milhar e troca vírgula por ponto
    const cleaned = String(value)
      .replace(/R\$\s?/, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Converte porcentagem (12,5%) para number (12.5).
   */
  toPercent(value: any): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    const cleaned = String(value)
      .replace(/%/, "")
      .replace(/,/g, ".")
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Converte data em vários formatos para ISO (YYYY-MM-DD).
   */
  toDate(value: any): string {
    if (!value) return "";
    
    const dateStr = String(value).trim();
    
    // Tenta formato ISO direto (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }

    // Tenta formato BR (DD/MM/YYYY)
    const brDate = parse(dateStr, "dd/MM/yyyy", new Date());
    if (isValid(brDate)) {
      return format(brDate, "yyyy-MM-dd");
    }

    // Tenta formato extensivo curto (04 mai 2024)
    const longDate = parse(dateStr, "dd MMM yyyy", new Date(), { locale: ptBR });
    if (isValid(longDate)) {
      return format(longDate, "yyyy-MM-dd");
    }

    return dateStr; // Retorna original se falhar, o validador pegará depois
  },

  /**
   * Converte string para null se vazia.
   */
  toString(value: any): string | null {
    if (value === null || value === undefined || value === "") return null;
    return String(value).trim();
  },

  /**
   * Converte valor para inteiro.
   */
  toInteger(value: any): number {
    return Math.floor(this.toNumber(value));
  }
};
