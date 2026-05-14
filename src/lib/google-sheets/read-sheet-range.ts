import { getGoogleSheetsClient } from "./google-sheets-client";
import { GoogleSheetsError, SheetNotFoundError, TabNotFoundError } from "./google-sheets-errors";

/**
 * Lê um intervalo específico de uma aba da planilha.
 */
export async function readSheetRange(spreadsheetId: string, range: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;
    
    if (!values || values.length === 0) {
      return [];
    }

    return values;
  } catch (error: any) {
    if (error.code === 404) {
      throw new SheetNotFoundError(spreadsheetId);
    }
    
    if (error.message?.includes("range") || error.code === 400) {
      throw new TabNotFoundError(range);
    }

    throw new GoogleSheetsError(`Erro ao ler planilha: ${error.message}`, error.code, error);
  }
}

/**
 * Lê todas as abas configuradas de uma única vez (opcional, para performance futura).
 */
export async function readMultipleRanges(spreadsheetId: string, ranges: string[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    return response.data.valueRanges || [];
  } catch (error: any) {
    throw new GoogleSheetsError(`Erro na leitura em lote: ${error.message}`, error.code, error);
  }
}
