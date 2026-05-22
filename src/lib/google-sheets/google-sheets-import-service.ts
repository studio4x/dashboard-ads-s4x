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
import { META_ADS_S4X_SCHEMA, META_ADS_REQUIRED_COLUMNS } from "./schemas/meta-ads-s4x";
import { getSpreadsheetMetadata, readMultipleRanges } from "./read-sheet-range";
import { MetricsHelper } from "./metrics-helper";
import { SheetNormalizer } from "./sheet-normalizer";
import { ImportResult, ImportError } from "@/types/import";
import { GoogleAdsS4XPayload, GoogleAdsS4XSummary, GoogleAdsS4XDiagnostics } from "@/types/google-ads-s4x";
import { MetaAdsS4XPayload } from "@/types/meta-ads-s4x";
import {
  normalizeMetaAdsObjectives,
  validateMetaObjectivesMetrics,
  META_ADS_METRIC_FIELD_LABELS,
  getMetaObjectiveLabel,
} from "@/lib/meta-ads/objectives";

export const GoogleSheetsImportService = {
  getMetaAdsAvailableMetrics(headers: string[]) {
    const normalizedHeaders = headers.map(h => String(h).trim());
    const has = (name: string) => normalizedHeaders.includes(name);

    return {
      sourceTabHeaders: normalizedHeaders,
      fields: {
        campaignName: has("Campaign Name"),
        adSetName: has("Ad Set Name"),
        adName: has("Ad Name"),
        date: has("Day"),
        reach: has("Reach"),
        impressions: has("Impressions"),
        frequency: has("Frequency"),
        cost: has("Amount Spent"),
        cpm: has("CPM (Cost per 1,000 Impressions)"),
        clicks: has("Link Clicks"),
        cpc: has("CPC (All)"),
        ctr: has("CTR (All)"),
        conversions: has("Messaging Conversations Started") || has("Leads") || has("On-Facebook Leads") || has("Website Leads") || has("Offline Leads"),
        costPerConversion: has("Cost per Messaging Conversations Started") || has("Cost per Lead") || has("Cost per On-Facebook Lead") || has("Cost per Website Lead") || has("Cost per Offline Lead"),
        leads: has("Leads"),
        onFacebookLeads: has("On-Facebook Leads"),
        websiteLeads: has("Website Leads"),
        offlineLeads: has("Offline Leads"),
        costPerLead: has("Cost per Lead"),
        costPerOnFacebookLead: has("Cost per On-Facebook Lead"),
        costPerWebsiteLead: has("Cost per Website Lead"),
        costPerOfflineLead: has("Cost per Offline Lead"),
        leadAny: has("Leads") || has("On-Facebook Leads") || has("Website Leads") || has("Offline Leads"),
        leadCostAny: has("Cost per Lead") || has("Cost per On-Facebook Lead") || has("Cost per Website Lead") || has("Cost per Offline Lead"),
        postEngagement: has("Post Engagement"),
        postComments: has("Post Comments"),
        postReactions: has("Post Reactions"),
        postShares: has("Post Shares")
      }
    };
  },

  getMetaLeadResultFromRow(row: any): number {
    const leads = Number(row.leads || 0);
    const onFacebookLeads = Number(row.onFacebookLeads || 0);
    const websiteLeads = Number(row.websiteLeads || 0);
    const offlineLeads = Number(row.offlineLeads || 0);
    const breakdownSum = onFacebookLeads + websiteLeads + offlineLeads;

    if (leads > 0) return leads;
    if (breakdownSum > 0) return breakdownSum;
    return 0;
  },

  getMetaLeadCostFromRow(row: any, resultValue: number): number | null {
    const costPerLead = Number(row.costPerLead || 0);
    const costPerOnFacebookLead = Number(row.costPerOnFacebookLead || 0);
    const costPerWebsiteLead = Number(row.costPerWebsiteLead || 0);
    const costPerOfflineLead = Number(row.costPerOfflineLead || 0);

    if (costPerLead > 0) return costPerLead;
    if (costPerOnFacebookLead > 0) return costPerOnFacebookLead;
    if (costPerWebsiteLead > 0) return costPerWebsiteLead;
    if (costPerOfflineLead > 0) return costPerOfflineLead;

    const cost = Number(row.cost || 0);
    if (cost > 0 && resultValue > 0) return cost / resultValue;
    return null;
  },

  normalizeMetaDailyResults(rows: any[]): any[] {
    return rows.map((row: any) => {
      const leadResult = this.getMetaLeadResultFromRow(row);
      const messagingResult = Number(row.messagingConversationsStarted || row.conversions || 0);
      const normalizedResult = leadResult > 0 ? leadResult : messagingResult;
      const leadCost = this.getMetaLeadCostFromRow(row, normalizedResult);
      const messagingCost = Number(row.costPerMessagingConversationsStarted || row.costPerConversion || 0);
      const normalizedCost = leadCost !== null ? leadCost : (messagingCost > 0 ? messagingCost : null);

      return {
        ...row,
        conversions: normalizedResult,
        costPerConversion: normalizedCost,
      };
    });
  },

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
    let metaValidationForPersist:
      | {
          status: "not_configured" | "ok" | "missing_metrics";
          notes: Record<string, unknown>;
          updatedAt: string;
        }
      | undefined;

    try {
      // 1. Obter informações do dashboard para saber o template esperado
      const supabase = await createAdminClient();
      const { data: dashboard } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();
        
      const expectedTemplateId = dashboard?.dashboard_type || "google_ads_s4x";
      const metaObjectives = normalizeMetaAdsObjectives(dashboard?.meta_objectives);
      const metaPrimaryObjective = metaObjectives[0] || null;

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
          dataSourceId,
          metaValidation: metaValidationForPersist,
        });
      }

      // 3. Validação de Schema (Abas e Colunas)
      const metadata = await getSpreadsheetMetadata(spreadsheetId);
      const spreadsheetTabs = metadata.sheets?.map((s: any) => s.properties.title) || [];
      
      // Coleta cabeçalhos para o SchemaValidator
      // Lemos a primeira linha de todas as abas que o schema espera
      const schemaTabs = expectedTemplateId === "google_ads_s4x" 
        ? Object.keys(GOOGLE_ADS_S4X_SCHEMA.tabs)
        : expectedTemplateId === "meta_ads_s4x"
          ? Object.keys(META_ADS_S4X_SCHEMA.tabs)
          : [];
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
          dataSourceId,
          metaValidation: metaValidationForPersist,
        });
      }

      // 4. Importação das Abas (Parser)
      const s4xTabsToRead = [
        { name: "Performance Diária", key: "dailyPerformance", reader: (rows: any[][]) => SheetTabReader.readPerformanceDailyS4X(rows) },
        { name: "Campanhas", key: "campaigns", reader: (rows: any[][]) => SheetTabReader.readCampaignsS4X(rows) },
        { name: "Grupos de Anúncios", key: "adGroups", reader: (rows: any[][]) => SheetTabReader.readAdGroupsS4X(rows) },
        { name: "Palavras-Chave", key: "keywords", reader: (rows: any[][]) => SheetTabReader.readKeywordsS4X(rows) },
        { name: "Termos de Pesquisa", key: "searchTerms", reader: (rows: any[][]) => SheetTabReader.readSearchTermsS4X(rows) },
        { name: "Palavras-Chave Negativas", key: "negativeKeywords", reader: (rows: any[][]) => SheetTabReader.readNegativeKeywordsS4X(rows) },
        { name: "Anúncios (Recursos)", key: "adsAndAssets", reader: (rows: any[][]) => SheetTabReader.readAdsAssetsS4X(rows) },
        { name: "Meta", key: "meta", reader: (rows: any[][]) => SheetTabReader.readMeta(rows) },
        { name: "Dashboard_Config", key: "config", reader: (rows: any[][]) => SheetTabReader.readConfig(rows) },
        { name: "Export_Logs", key: "export_logs", reader: (rows: any[][]) => ({ tabName: "Export_Logs", data: rows, errors: [] }) },
      ];

      const metaS4xTabsToRead = [
        { name: "Performance Diária", key: "dailyPerformance", reader: (rows: any[][]) => SheetTabReader.readPerformanceDailyMetaS4X(rows) },
        { name: "Meta", key: "meta", reader: (rows: any[][]) => SheetTabReader.readMeta(rows) },
        { name: "Dashboard_Config", key: "config", reader: (rows: any[][]) => SheetTabReader.readConfig(rows) },
        { name: "Export_Logs", key: "export_logs", reader: (rows: any[][]) => ({ tabName: "Export_Logs", data: rows, errors: [] }) },
      ];

      // Para meta_ads_s4x: se "Performance Diária" não existir na planilha,
      // detecta automaticamente a aba que contém as colunas obrigatórias do Meta Ads.
      if (expectedTemplateId === "meta_ads_s4x" && !spreadsheetTabs.includes("Performance Diária")) {
        const requiredCols = META_ADS_REQUIRED_COLUMNS;
        let detectedTab: string | null = null;

        for (const tabName of spreadsheetTabs) {
          try {
            const headerRow = await readSheetRange(spreadsheetId, `${tabName}!1:1`);
            const headers = (headerRow?.[0] || []).map((h: any) => String(h).trim());
            const hasAll = requiredCols.every(col => headers.includes(col));
            if (hasAll) { detectedTab = tabName; break; }
          } catch { /* ignora erros de leitura de header */ }
        }

        if (detectedTab) {
          // Substitui o reader para apontar para a aba detectada
          const perfIdx = metaS4xTabsToRead.findIndex(t => t.name === "Performance Diária");
          if (perfIdx !== -1) {
            metaS4xTabsToRead[perfIdx] = {
              name: detectedTab,
              key: "dailyPerformance",
              reader: (rows: any[][]) => SheetTabReader.readPerformanceDailyMetaS4X(rows)
            };
          }
        } else {
          errors.push({
            severity: "blocking",
            stage: "schema_validation",
            message: `Nenhuma aba com as colunas obrigatórias do Meta Ads foi encontrada. Colunas necessárias: ${requiredCols.join(", ")}.`
          });
          return this.finishImport({ success: false, stage: "schema_validation", errors, warnings, clientId, dashboardId, spreadsheetId, startedAt, logId, dataSourceId, metaValidation: metaValidationForPersist });
        }
      }

      let metaAvailableMetrics: any = undefined;
      if (expectedTemplateId === "meta_ads_s4x") {
        const selectedPerformanceTab = metaS4xTabsToRead.find(t => t.key === "dailyPerformance")?.name;
        if (selectedPerformanceTab) {
          try {
            const headerRow = await readSheetRange(spreadsheetId, `${selectedPerformanceTab}!1:1`);
            const headers = (headerRow?.[0] || []).map((h: any) => String(h).trim());
            metaAvailableMetrics = {
              sourceTab: selectedPerformanceTab,
              ...this.getMetaAdsAvailableMetrics(headers)
            };
          } catch {
            metaAvailableMetrics = undefined;
          }
        }
      }

      if (expectedTemplateId === "meta_ads_s4x") {
        if (metaObjectives.length === 0) {
          const checkedAt = new Date().toISOString();
          metaValidationForPersist = {
            status: "not_configured",
            updatedAt: checkedAt,
            notes: {
              objectives: [],
              objectiveLabels: [],
              missingByObjective: {},
              missingMetricFields: [],
              missingMetricLabels: [],
              checkedAt,
              message: "Objetivos de campanha não configurados para este dashboard Meta Ads.",
            },
          };
        } else {
          const validationNotes = validateMetaObjectivesMetrics(
            metaObjectives,
            metaAvailableMetrics?.fields || {}
          );

          const hasMissing = validationNotes.missingMetricFields.length > 0;
          metaValidationForPersist = {
            status: hasMissing ? "missing_metrics" : "ok",
            updatedAt: validationNotes.checkedAt,
            notes: {
              ...validationNotes,
              primaryObjective: metaPrimaryObjective,
            },
          };

          if (hasMissing) {
            Object.entries(validationNotes.missingByObjective).forEach(([objective, missingFields]) => {
              const fields = (missingFields || [])
                .map((field) => META_ADS_METRIC_FIELD_LABELS[field as keyof typeof META_ADS_METRIC_FIELD_LABELS] || String(field))
                .join(", ");
              warnings.push({
                severity: "warning",
                stage: "schema_validation",
                sheet: metaAvailableMetrics?.sourceTab || "Performance Diária",
                message: `Objetivo "${getMetaObjectiveLabel(objective)}": métricas faltantes na planilha: ${fields}.`,
              });
            });
          }
        }
      }

      const tabsToProcess = expectedTemplateId === "google_ads_s4x" 
        ? s4xTabsToRead 
        : expectedTemplateId === "meta_ads_s4x"
          ? metaS4xTabsToRead
          : [
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

      // 6. Construção do Payload Normalizado S4X
      let finalPayload: any = resultData;
      const rowCounts: Record<string, number> = {};
      tabsRead.forEach(tab => {
        const key = s4xTabsToRead.find(t => t.name === tab)?.key;
        if (key && resultData[key]) {
          rowCounts[tab] = Array.isArray(resultData[key]) ? resultData[key].length : 1;
        }
      });

      if (expectedTemplateId === "google_ads_s4x") {
        const dailyPerformance = resultData.dailyPerformance || [];
        const summary = MetricsHelper.calculateSummary(dailyPerformance);
        
        const configData = resultData.config?.[0] || {};
        const metaData = resultData.meta?.[0] || {};

        const diagnostics: GoogleAdsS4XDiagnostics = {
          templateValidation: templateVal,
          schemaValidation: schemaVal,
          warnings: warnings.map(w => w.message),
          errors: errors.map(e => e.message),
          exportLogs: resultData.export_logs,
          rowCounts,
          ignoredRows: 0, // Poderia ser calculado se rastreado no reader
          sourceSpreadsheetId: spreadsheetId,
          importedAt: new Date().toISOString(),
          snapshotVersion: "google_ads_s4x_v1"
        };

        const s4xPayload: GoogleAdsS4XPayload = {
          meta: {
            accountName: metaData["Conta"] || metaData["accountName"],
            accountId: metaData["Conta_ID"] || metaData["accountId"],
            periodToken: metaData["Periodo_Token"] || metaData["periodToken"],
            dateStart: SheetNormalizer.toDate(metaData["Data_Inicial"]),
            dateEnd: SheetNormalizer.toDate(metaData["Data_Final"]),
            queryCondition: metaData["Condicao_Query"],
            executedAt: metaData["Executado_Em"],
            timezone: metaData["Timezone"]
          },
          config: {
            templateId: configData["Template"] || "google_ads_s4x",
            templateLabel: configData["Template_Label"] || "Google Ads S4X",
            templateVersion: configData["Versao_Template"] || "1.0",
            source: configData["Fonte"] || "Google Sheets",
            periodToken: configData["Periodo_Token"],
            dateStart: SheetNormalizer.toDate(configData["Data_Inicial"]),
            dateEnd: SheetNormalizer.toDate(configData["Data_Final"]),
            notes: configData["Notas"]
          },
          summary: summary as GoogleAdsS4XSummary,
          dailyPerformance: resultData.dailyPerformance || [],
          campaigns: resultData.campaigns || [],
          adGroups: resultData.adGroups || [],
          keywords: resultData.keywords || [],
          searchTerms: resultData.searchTerms || [],
          negativeKeywords: resultData.negativeKeywords || [],
          adsAndAssets: resultData.adsAndAssets || [],
          diagnostics
        };

        finalPayload = s4xPayload;
      } else if (expectedTemplateId === "meta_ads_s4x") {
        const dailyPerformance = this.normalizeMetaDailyResults(resultData.dailyPerformance || []);
        resultData.dailyPerformance = dailyPerformance;
        const summary = MetricsHelper.calculateMetaSummary(dailyPerformance);
        
        const configData = resultData.config?.[0] || {};
        const metaData = resultData.meta?.[0] || {};

        const diagnostics: any = {
          templateValidation: templateVal,
          schemaValidation: schemaVal,
          warnings: warnings.map(w => w.message),
          errors: errors.map(e => e.message),
          availableMetrics: metaAvailableMetrics,
          exportLogs: resultData.export_logs,
          rowCounts,
          ignoredRows: 0,
          sourceSpreadsheetId: spreadsheetId,
          importedAt: new Date().toISOString(),
          snapshotVersion: "meta_ads_s4x_v1"
        };

        const s4xMetaPayload: MetaAdsS4XPayload = {
          meta: {
            accountName: metaData["Conta"] || metaData["accountName"],
            accountId: metaData["Conta_ID"] || metaData["accountId"],
            periodToken: metaData["Periodo_Token"] || metaData["periodToken"],
            dateStart: SheetNormalizer.toDate(metaData["Data_Inicial"]),
            dateEnd: SheetNormalizer.toDate(metaData["Data_Final"]),
            queryCondition: metaData["Condicao_Query"],
            executedAt: metaData["Executado_Em"],
            timezone: metaData["Timezone"]
          },
          config: {
            templateId: configData["Template"] || "meta_ads_s4x",
            templateLabel: configData["Template_Label"] || "Meta Ads S4X",
            templateVersion: configData["Versao_Template"] || "1.0",
            source: configData["Fonte"] || "Google Sheets",
            periodToken: configData["Periodo_Token"],
            dateStart: SheetNormalizer.toDate(configData["Data_Inicial"]),
            dateEnd: SheetNormalizer.toDate(configData["Data_Final"]),
            notes: configData["Notas"],
            metaObjectives: metaObjectives,
            metaPrimaryObjective: metaPrimaryObjective,
          },
          summary: summary as any,
          dailyPerformance: resultData.dailyPerformance || [],
          diagnostics,
          metaObjectives: metaObjectives,
          metaPrimaryObjective: metaPrimaryObjective,
          metaValidationStatus: metaValidationForPersist?.status,
          metaValidationNotes: metaValidationForPersist?.notes,
        };

        finalPayload = s4xMetaPayload;
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
        data: finalPayload,
        metaValidation: metaValidationForPersist,
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
        dataSourceId,
        metaValidation: metaValidationForPersist,
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
    metaValidation?: {
      status: "not_configured" | "ok" | "missing_metrics";
      notes: Record<string, unknown>;
      updatedAt: string;
    };
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
      errorDetails: params.errors.length > 0 ? params.errors[0].message : undefined,
      detailedLists: {
        errors: params.errors,
        warnings: params.warnings
      }
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
        lastImportAt: finishedAt,
        metaValidationStatus: params.metaValidation?.status,
        metaValidationNotes: params.metaValidation?.notes,
        metaValidationUpdatedAt: params.metaValidation?.updatedAt,
      }).catch(err => console.error("Error updating source status:", err));
    }

    if (params.metaValidation) {
      await DashboardService.updateMetaValidation(params.dashboardId, {
        meta_validation_status: params.metaValidation.status,
        meta_validation_notes: params.metaValidation.notes,
        meta_validation_updated_at: params.metaValidation.updatedAt,
      }).catch(err => console.error("Error updating dashboard meta validation:", err));
    }

    return {
      success: params.success,
      stage: params.stage,
      error: params.errors.length > 0 ? params.errors[0].message : undefined,
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
