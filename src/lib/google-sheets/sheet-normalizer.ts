import { parse, format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Normaliza valores vindos da planilha para formatos padrão.
 */
export const SheetNormalizer = {
  /**
   * Converte moeda BRL (R$ 1.234,56) ou números com vírgula para number.
   */
  toNumber(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return value;

    const strValue = String(value).trim();
    if (["--", "N/A", "null", "undefined", "NaN", "Infinity"].includes(strValue)) return null;

    // Remove R$, pontos de milhar e troca vírgula por ponto
    const cleaned = strValue
      .replace(/R\$\s?/, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  },

  /**
   * Converte porcentagem (12,5%) para decimal (0.125).
   */
  toPercent(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return value;

    const strValue = String(value).trim();
    if (["--", "N/A", "null", "undefined", "NaN", "Infinity"].includes(strValue)) return null;

    const cleaned = strValue
      .replace(/%/, "")
      .replace(/,/g, ".")
      .trim();
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;

    // Se o valor original continha %, tratamos como percentual (dividimos por 100)
    // Se era apenas um número (ex: 0.1234), mantemos como está
    if (strValue.includes("%")) {
      return parsed / 100;
    }
    
    return parsed;
  },

  /**
   * Converte data em vários formatos para ISO (YYYY-MM-DD).
   */
  toDate(value: any): string | null {
    if (!value) return null;
    
    const dateStr = String(value).trim();
    if (["--", "N/A", "null", "undefined", "NaN", "Infinity"].includes(dateStr)) return null;
    
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

    return null;
  },

  /**
   * Converte string para null se vazia ou se for um valor de erro conhecido.
   */
  toString(value: any): string | null {
    if (value === null || value === undefined || value === "") return null;
    const str = String(value).trim();
    if (["--", "N/A", "null", "undefined", "NaN", "Infinity"].includes(str)) return null;
    return str;
  },

  /**
   * Converte valor para inteiro.
   */
  toInteger(value: any): number | null {
    const num = this.toNumber(value);
    return num === null ? null : Math.floor(num);
  },

  /**
   * Verifica se a linha deve ser ignorada (TOTAL, MÉDIA).
   */
  shouldIgnoreRow(firstCell: any): boolean {
    if (!firstCell) return false;
    const val = String(firstCell).toUpperCase().trim();
    return val === "TOTAL" || val === "MÉDIA" || val === "MEDIA";
  }
};
