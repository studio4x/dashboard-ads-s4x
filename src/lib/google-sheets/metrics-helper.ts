export const MetricsHelper = {
  /**
   * Calcula métricas derivadas se estiverem ausentes.
   */
  enrichMetrics(data: any) {
    if (!data || typeof data !== "object") return data;

    const clicks = Number(data.clicks || 0);
    const impressions = Number(data.impressions || 0);
    const cost = Number(data.cost || 0);
    const conversions = Number(data.conversions || 0);
    const revenue = Number(data.revenue || 0);

    // CTR = Cliques / Impressões
    if (data.ctr === null || data.ctr === undefined) {
      data.ctr = impressions > 0 ? clicks / impressions : null;
    }

    // CPC Médio = Custo / Cliques
    if (data.cpc === null || data.cpc === undefined) {
      data.cpc = clicks > 0 ? cost / clicks : null;
    }

    // Custo por Conversão = Custo / Conversões
    if (data.cpa === null || data.cpa === undefined) {
      data.cpa = conversions > 0 ? cost / conversions : null;
    }

    // Taxa de Conversão = Conversões / Cliques
    if (data.conversion_rate === null || data.conversion_rate === undefined) {
      data.conversion_rate = clicks > 0 ? conversions / clicks : null;
    }

    // ROAS = Valor das Conversões / Custo
    if (data.roas === null || data.roas === undefined) {
      data.roas = cost > 0 ? revenue / cost : null;
    }

    // CPM Médio = Custo / Impressões * 1000
    if (data.cpm === null || data.cpm === undefined) {
      data.cpm = impressions > 0 ? (cost / impressions) * 1000 : null;
    }

    return data;
  }
};
