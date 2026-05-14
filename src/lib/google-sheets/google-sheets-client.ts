import { google } from "googleapis";
import { GoogleAuthError } from "./google-sheets-errors";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

/**
 * Cria um cliente autenticado do Google Sheets usando Service Account.
 */
export async function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new GoogleAuthError(
      "Credenciais da Service Account não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)."
    );
  }

  try {
    const formattedKey = privateKey.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email: email,
      key: formattedKey,
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: "v4", auth });
    return sheets;
  } catch (error: any) {
    throw new GoogleAuthError(error.message);
  }
}

/**
 * Obtém metadados da planilha (título, abas, etc.)
 */
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`Planilha não encontrada: ${spreadsheetId}`);
    }
    throw error;
  }
}
