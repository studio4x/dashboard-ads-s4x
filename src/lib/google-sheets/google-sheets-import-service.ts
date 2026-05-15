import { readSheetRange } from "./read-sheet-range";
import { SheetTabReader } from "./sheet-tab-reader";
import { ImportLogsService } from "../imports/import-logs";
import { ImportLogEntry, ImportStatus } from "@/types/imports";
import { v4 as uuidv4 } from "uuid";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { DataSourceService } from "@/services/data-source-service";
import { TemplateValidator } from "./template-validator";
import { SchemaValidator } from "./schema-validator";
import { GOOGLE_ADS_S4X_SCHEMA } from "./schemas/google-ads-s4x";
import { getSpreadsheetMetadata, readMultipleRanges } from "./read-sheet-range";
import { MetricsHelper } from "./metrics-helper";
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
      const supabase = await createAdminClient();
      const { data: dashboard } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();
        
      const expectedTemplateId = dashboard?.dashboard_type || "google_ads_s4x";

      // 2. Validação Preliminar de Template (Dashboard_Config)
      const templateVal = await TemplateValidator.validate(spreadsheetId, expectedTemplateId);
      
      templateVal.errors.forEach(err => errors.push(err));
      templateVal.warnings.forEach(warn => warnings.push(warn));

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

      // 3. Validação de Schema (Abas e Colunas)
      const metadata = await getSpreadsheetMetadata(spreadsheetId);
      const spreadsheetTabs = metadata.sheets?.map((s: any) => s.properties.title) || [];
      
      // Coleta cabeçalhos para o SchemaValidator
      // Lemos a primeira linha de todas as abas que o schema espera
      const schemaTabs = Object.keys(GOOGLE_ADS_S4X_SCHEMA.tabs);
      const rangesToFetch = spreadsheetTabs
        .filter(t => schemaTabs.includes(t))
        .map(t => `${t}!1:1`);

      const headerRanges = await readMultipleRanges(spreadsheetId, rangesToFetch);
      const tabHeaders: Record<string, string[]> = {};
      headerRanges.forEach((rangeObj: any, index: number) => {
        const tabName = rangesToFetch[index].split("!")[0];
        const headers = rangeObj.values?.[0] || [];
        tabHeaders[tabName] = headers.map((h: any) => String(h).trim());
      });

      const schemaVal = SchemaValidator.validate(expectedTemplateId, spreadsheetTabs, tabHeaders);
      schemaVal.errors.forEach(err => errors.push(err));
      schemaVal.warnings.forEach(warn => warnings.push(warn));

      if (!schemaVal.isValid) {
        return this.finishImport({
          success: false,
          stage: "schema_validation",
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

      // 4. Importação das Abas (Parser)
      const s4xTabsToRead = [
        { name: "Performance Diária", key: "performance_daily", reader: (rows: any[][]) => SheetTabReader.readGoogleAds(rows) },
        { name: "Campanhas", key: "campaigns", reader: (rows: any[][]) => SheetTabReader.readCampaigns(rows) },
        { name: "Grupos de Anúncios", key: "ad_groups", reader: (rows: any[][]) => SheetTabReader.readAdGroups(rows) },
        { name: "Palavras-Chave", key: "keywords", reader: (rows: any[][]) => SheetTabReader.readKeywords(rows) },
        { name: "Termos de Pesquisa", key: "search_terms", reader: (rows: any[][]) => SheetTabReader.readSearchTerms(rows) },
        { name: "Palavras-Chave Negativas", key: "negative_keywords", reader: (rows: any[][]) => SheetTabReader.readNegativeKeywords(rows) },
        { name: "Anúncios (Recursos)", key: "ads_assets", reader: (rows: any[][]) => SheetTabReader.readAdsAssets(rows) },
        { name: "Meta", key: "meta", reader: (rows: any[][]) => SheetTabReader.readMeta(rows) },
        { name: "Dashboard_Config", key: "config", reader: (rows: any[][]) => SheetTabReader.readConfig(rows) },
      ];

      const tabsToProcess = expectedTemplateId === "google_ads_s4x" ? s4xTabsToRead : [
        { name: "overview", key: "overview", reader: (rows: any[][]) => SheetTabReader.readOverview(rows) },
        { name: "google_ads", key: "google_ads", reader: (rows: any[][]) => SheetTabReader.readGoogleAds(rows) },
      ];

      for (const tab of tabsToProcess) {
        try {
          if (!spreadsheetTabs.includes(tab.name)) continue;

          const rows = await readSheetRange(spreadsheetId, `${tab.name}!A1:Z2000`);
          
          if (rows && rows.length > 0) {
            const normalized = tab.reader(rows);
            
            // 5. Normalização e Métricas Derivadas
            if (Array.isArray(normalized.data)) {
              normalized.data = normalized.data.map(item => MetricsHelper.enrichMetrics(item));
            }

            resultData[tab.key] = normalized.data;
            tabsRead.push(tab.name);
            rowsRead += (Array.isArray(normalized.data) ? normalized.data.length : 0);
            
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
          warnings.push({
            severity: "warning",
            stage: "parsing",
            sheet: tab.name,
            message: `Erro ao processar aba ${tab.name}: ${err.message}`
          });
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
