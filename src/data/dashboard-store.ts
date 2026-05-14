// Armazenamento temporário dos dados processados das planilhas
const dashboardData: Record<string, any> = {};

export const DashboardStore = {
  setData(dashboardId: string, data: any) {
    dashboardData[dashboardId] = data;
  },

  getData(dashboardId: string) {
    return dashboardData[dashboardId];
  },

  hasData(dashboardId: string) {
    return !!dashboardData[dashboardId];
  }
};
