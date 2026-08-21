/**
 * Monta um intervalo limitado por linhas sem truncar colunas depois de Z.
 *
 * Algumas exportações do Meta Ads posicionam campos obrigatórios, como `Day`,
 * em colunas posteriores (por exemplo, AD). Usar um limite fixo como A:Z faz
 * essas colunas desaparecerem antes da normalização.
 */
export function buildBoundedSheetRowsRange(tabName: string, maxRows = 2000) {
  return `${tabName}!1:${maxRows}`;
}
