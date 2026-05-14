export class GoogleSheetsError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "GoogleSheetsError";
  }
}

export class SheetNotFoundError extends GoogleSheetsError {
  constructor(spreadsheetId: string) {
    super(`Planilha não encontrada: ${spreadsheetId}`, "NOT_FOUND");
  }
}

export class TabNotFoundError extends GoogleSheetsError {
  constructor(tabName: string) {
    super(`Aba não encontrada: ${tabName}`, "TAB_NOT_FOUND");
  }
}

export class GoogleAuthError extends GoogleSheetsError {
  constructor(message: string) {
    super(`Erro de autenticação no Google: ${message}`, "AUTH_ERROR");
  }
}
