import { readSheetRange } from "./read-sheet-range";
import { SheetTabReader } from "./sheet-tab-reader";
import { ImportLogsService } from "../imports/import-logs";
import { ImportLogEntry, ImportStatus } from "@/types/imports";
import { v4 as uuidv4 } from "uuid";
import { DashboardService } from "@/services/dashboard-service";
import { DataSourceService } from "@/services/data-source-service";
import { TemplateValidator } from "./template-validator";
import { ImportResult, ImportError } from "@/types/import";

export const GoogleSheetsImportService = {
  /**
   * Executa a importação completa de uma planilha.
   */
  async importDashboardData(
    clientId: string, 
    dashboardId: string, 
    spreadsheetId: string, 
    dataSourceId?: string
  ): Promise<ImportResult & { data?: any }> {
    const startedAt = new Date().toISOString();
    const logId = uuidv4();
    
    let rowsRead = 0;
    const tabsRead: string[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    const resultData: Record<string, any> = {};

    try {
      // 1. Obter informações do dashboard para saber o template esperado
      const dashboard = await DashboardService.getDashboardById(dashboardId);
      const expectedTemplateId = dashboard?.dashboard_type || "google_ads_s4x";

      // 2. Validação Preliminar de Template (Dashboard_Config)
      const templateVal = await TemplateValidator.validate(spreadsheetId, expectedTemplateId);
      
      templateVal.errors.forEach(err => {
        if (err.severity === "blocking") errors.push(err);
        else warnings.push(err);
      });

      if (!templateVal.isValid) {
        return this.finishImport({
          success: false,
          stage: "template_validation",
          errors,
          warnings,
          clientId,
          dashboardId,
          spreadsheetId,
          startedAt,
          logId,
          dataSourceId
        });
      }

      // 3. Importação das Abas (Parser ainda parcial conforme solicitado)
      const tabsToRead = [
        { name: "overview", reader: SheetTabReader.readOverview, critical: true },
        { name: "google_ads", reader: SheetTabReader.readGoogleAds, critical: false },
        { name: "meta_ads", reader: SheetTabReader.readMetaAds, critical: false },
        { name: "campaigns", reader: SheetTabReader.readCampaigns, critical: false },
        { name: "ga4_events", reader: SheetTabReader.readGa4Events, critical: false },
        { name: "audience", reader: SheetTabReader.readAudience, critical: false },
        { name: "search_console", reader: SheetTabReader.readSearchConsole, critical: false },
        { name: "keywords", reader: SheetTabReader.readKeywords, critical: false },
        { name: "insights", reader: SheetTabReader.readInsights, critical: false },
      ];

      for (const tab of tabsToRead) {
        try {
          const rows = await readSheetRange(spreadsheetId, `${tab.name}!A1:Z1000`);
          
          if (rows && rows.length > 0) {
            const normalized = tab.reader(rows);
            resultData[tab.name] = normalized.data;
            tabsRead.push(tab.name);
            rowsRead += normalized.data.length;
            
            normalized.errors.forEach(err => {
              const impErr: ImportError = {
                severity: err.level === "error" ? "blocking" : "warning",
                stage: "sheet_validation",
                sheet: tab.name,
                message: err.message,
                field: err.column,
              };
              if (impErr.severity === "blocking") errors.push(impErr);
              else warnings.push(impErr);
            });
          }
        } catch (err: any) {
          if (tab.critical) {
            errors.push({
              severity: "blocking",
              stage: "sheet_validation",
              sheet: tab.name,
              message: `Aba crítica ausente: ${tab.name}`
            });
          } else {
            warnings.push({
              severity: "warning",
              stage: "sheet_validation",
              sheet: tab.name,
              message: `Aba opcional ausente ou erro na leitura: ${tab.name}`
            });
          }
        }
      }

      const success = errors.length === 0;
      
      return this.finishImport({
        success,
        stage: "persistence",
        errors,
        warnings,
        clientId,
        dashboardId,
        spreadsheetId,
        startedAt,
        logId,
        dataSourceId,
        tabsRead,
        rowsRead,
        data: resultData
      });

    } catch (globalError: any) {
      console.error("Global Import Error:", globalError);
      return this.finishImport({
        success: false,
        stage: "connection",
        errors: [{ severity: "blocking", stage: "connection", message: globalError.message }],
        warnings,
        clientId,
        dashboardId,
        spreadsheetId,
        startedAt,
        logId,
        dataSourceId
      });
    }
  },

  /**
   * Finaliza o processo de importação, salvando logs e snapshots.
   */
  async finishImport(params: {
    success: boolean;
    stage: any;
    errors: ImportError[];
    warnings: ImportError[];
    clientId: string;
    dashboardId: string;
    spreadsheetId: string;
    startedAt: string;
    logId: string;
    dataSourceId?: string;
    tabsRead?: string[];
    rowsRead?: number;
    data?: any;
  }): Promise<ImportResult & { data?: any }> {
    const finishedAt = new Date().toISOString();
    const durationMs = new Date(finishedAt).getTime() - new Date(params.startedAt).getTime();
    
    const status: ImportStatus = !params.success ? "failed" : params.warnings.length > 0 ? "success_with_warnings" : "success";

    const log: ImportLogEntry = {
      id: params.logId,
      clientId: params.clientId,
      dashboardId: params.dashboardId,
      spreadsheetId: params.spreadsheetId,
      startedAt: params.startedAt,
      finishedAt,
      status,
      tabsRead: params.tabsRead || [],
      rowsRead: params.rowsRead || 0,
      warnings: params.warnings.length,
      errors: params.errors.length,
      source: "google_sheets",
      durationMs,
      dataSourceId: params.dataSourceId,
      errorDetails: params.errors.length > 0 ? params.errors[0].message : undefined
    };

    // Salva o Log no Supabase
    await ImportLogsService.addLog(log).catch(err => console.error("Error saving log:", err));

    // Se teve sucesso, salva o snapshot no banco
    if (params.success && params.data) {
      await DashboardService.saveSnapshot({
        client_id: params.clientId,
        dashboard_id: params.dashboardId,
        source_type: "google_sheets",
        payload_json: params.data,
        imported_at: finishedAt
      }).catch(err => console.error("Error saving snapshot:", err));
    }

    // Atualiza o status na tabela google_sheet_sources se o dataSourceId estiver presente
    if (params.dataSourceId) {
      await DataSourceService.updateGoogleSheetSourceStatus({
        sourceId: params.dataSourceId,
        status,
        lastImportAt: finishedAt
      }).catch(err => console.error("Error updating source status:", err));
    }

    return {
      success: params.success,
      stage: params.stage,
      errors: params.errors,
      warnings: params.warnings,
      data: params.data,
      summary: {
        rowsProcessed: params.rowsRead || 0,
        sheetsRead: params.tabsRead || [],
        timestamp: finishedAt
      }
    };
  }
};
