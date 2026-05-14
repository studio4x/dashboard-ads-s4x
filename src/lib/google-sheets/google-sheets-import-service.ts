import { readSheetRange } from "./read-sheet-range";
import { SheetTabReader } from "./sheet-tab-reader";
import { ImportLogsService } from "../imports/import-logs";
import { ImportLogEntry, ImportStatus } from "@/types/imports";
import { v4 as uuidv4 } from "uuid";

export const GoogleSheetsImportService = {
  /**
   * Executa a importação completa de uma planilha.
   */
  async importDashboardData(clientId: string, dashboardId: string, spreadsheetId: string) {
    const startedAt = new Date().toISOString();
    const logId = uuidv4();
    
    let rowsRead = 0;
    let warnings = 0;
    let errors = 0;
    const tabsRead: string[] = [];
    const allIssues: any[] = [];
    const resultData: Record<string, any> = {};

    const tabsToRead = [
      { name: "overview", reader: SheetTabReader.readOverview },
      { name: "google_ads", reader: SheetTabReader.readGoogleAds },
      { name: "meta_ads", reader: SheetTabReader.readMetaAds },
      { name: "campaigns", reader: SheetTabReader.readCampaigns },
      { name: "ga4_events", reader: SheetTabReader.readGa4Events },
      { name: "audience", reader: SheetTabReader.readAudience },
      { name: "search_console", reader: SheetTabReader.readSearchConsole },
      { name: "keywords", reader: SheetTabReader.readKeywords },
      { name: "insights", reader: SheetTabReader.readInsights },
    ];

    try {
      for (const tab of tabsToRead) {
        try {
          // Lê intervalo A1:Z1000 por padrão
          const rows = await readSheetRange(spreadsheetId, `${tab.name}!A1:Z1000`);
          
          if (rows && rows.length > 0) {
            const normalized = tab.reader(rows);
            resultData[tab.name] = normalized.data;
            tabsRead.push(tab.name);
            rowsRead += normalized.data.length;
            
            normalized.errors.forEach(err => {
              if (err.level === "error") errors++;
              else if (err.level === "warning") warnings++;
              allIssues.push(err);
            });
          }
        } catch (err: any) {
          // Se a aba não existir, apenas logamos como aviso se for opcional, ou erro se for crítica
          const isCritical = tab.name === "overview";
          if (isCritical) {
            errors++;
            allIssues.push({ level: "error", message: `Aba crítica ausente: ${tab.name}`, tab: tab.name });
          } else {
            warnings++;
            allIssues.push({ level: "warning", message: `Aba ausente ou erro na leitura: ${tab.name}`, tab: tab.name });
          }
        }
      }

      const status: ImportStatus = errors > 0 ? "failed" : warnings > 0 ? "success_with_warnings" : "success";
      
      const finishedAt = new Date().toISOString();
      const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

      const log: ImportLogEntry = {
        id: logId,
        clientId,
        dashboardId,
        spreadsheetId,
        startedAt,
        finishedAt,
        status,
        tabsRead,
        rowsRead,
        warnings,
        errors,
        source: "google_sheets",
        durationMs
      };

      ImportLogsService.addLog(log);

      return {
        success: status !== "failed",
        data: resultData,
        log,
        issues: allIssues
      };

    } catch (globalError: any) {
      const finishedAt = new Date().toISOString();
      const log: ImportLogEntry = {
        id: logId,
        clientId,
        dashboardId,
        spreadsheetId,
        startedAt,
        finishedAt,
        status: "failed",
        tabsRead,
        rowsRead,
        warnings,
        errors,
        source: "google_sheets",
        errorDetails: globalError.message
      };

      ImportLogsService.addLog(log);
      throw globalError;
    }
  }
};
