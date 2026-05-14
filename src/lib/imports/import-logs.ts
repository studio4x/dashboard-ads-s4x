import { ImportLogEntry } from "@/types/imports";

// Armazenamento temporário em memória para o MVP sem banco de dados
const logs: ImportLogEntry[] = [];

export const ImportLogsService = {
  addLog(log: ImportLogEntry) {
    logs.unshift(log);
    // Mantém apenas os últimos 50 logs em memória
    if (logs.length > 50) logs.pop();
  },

  getLogs() {
    return logs;
  },

  getLatestLog(dashboardId: string) {
    return logs.find(l => l.dashboardId === dashboardId);
  }
};
