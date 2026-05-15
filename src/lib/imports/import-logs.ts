import { ImportLogEntry } from "@/types/imports";
import { DataSourceService } from "@/services/data-source-service";

export const ImportLogsService = {
  /**
   * Salva um log no banco de dados.
   */
  async addLog(log: ImportLogEntry) {
    try {
      // Mapeia para o formato do banco (snake_case)
      const dbLog = {
        id: log.id,
        client_id: log.clientId,
        dashboard_id: log.dashboardId,
        data_source_id: log.dataSourceId || log.id,
        source_type: log.source,
        status: log.status,
        started_at: log.startedAt,
        finished_at: log.finishedAt,
        duration_ms: log.durationMs,
        tabs_read: log.tabsRead,
        rows_read: log.rowsRead,
        warnings: log.warnings,
        errors: log.errors,
        error_details: log.errorDetails
      };
      
      await DataSourceService.saveImportLog(dbLog);
    } catch (error) {
      console.error("Erro ao salvar log no banco:", error);
    }
  },

  /**
   * Obtém logs do banco.
   */
  async getLogs() {
    return await DataSourceService.getImportLogs();
  },

  /**
   * Remove todos os logs.
   */
  async clearLogs() {
    return await DataSourceService.clearAllLogs();
  }
};
