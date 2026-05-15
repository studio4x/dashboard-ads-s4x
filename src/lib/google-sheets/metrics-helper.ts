export const MetricsHelper = {
  /**
   * Calcula métricas derivadas se estiverem ausentes ou para garantir consistência.
   * Suporta nomes de campos antigos (revenue, conversion_rate) e novos (conversionValue, conversionRate).
   */
  enrichMetrics(data: any) {
    if (!data || typeof data !== "object") return data;

    const clicks = Number(data.clicks || 0);
    const impressions = Number(data.impressions || 0);
    const cost = Number(data.cost || 0);
    const conversions = Number(data.conversions || 0);
    const revenue = Number(data.conversionValue || data.revenue || 0);

    // Helper para evitar divisão por zero
    const safeDiv = (num: number, den: number) => (den > 0 ? num / den : null);
    const safePercent = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null);

    // CTR = Cliques / Impressões
    data.ctr = safePercent(clicks, impressions);

    // CPC Médio = Custo / Cliques
    data.avgCpc = safeDiv(cost, clicks);
    if (data.cpc !== undefined) data.cpc = data.avgCpc; // retrocompatibilidade

    // Custo por Conversão = Custo / Conversões
    data.costPerConversion = safeDiv(cost, conversions);
    if (data.cpa !== undefined) data.cpa = data.costPerConversion; // retrocompatibilidade

    // Taxa de Conversão = Conversões / Cliques
    data.conversionRate = safePercent(conversions, clicks);
    if (data.conversion_rate !== undefined) data.conversion_rate = data.conversionRate; // retrocompatibilidade

    // ROAS = Valor das Conversões / Custo
    data.roas = safeDiv(revenue, cost);

    // CPM Médio = Custo / Impressões * 1000
    data.avgCpm = impressions > 0 ? (cost / impressions) * 1000 : null;
    if (data.cpm !== undefined) data.cpm = data.avgCpm; // retrocompatibilidade

    return data;
  },

  /**
   * Calcula o sumário geral a partir de uma lista de itens (geralmente Performance Diária).
   */
  calculateSummary(items: any[]) {
    const summary = {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      allConversions: 0,
      allConversionsValue: 0,
    };

    items.forEach(item => {
      summary.impressions += Number(item.impressions || 0);
      summary.clicks += Number(item.clicks || 0);
      summary.cost += Number(item.cost || 0);
      summary.conversions += Number(item.conversions || 0);
      summary.conversionValue += Number(item.conversionValue || item.revenue || 0);
      summary.allConversions += Number(item.allConversions || 0);
      summary.allConversionsValue += Number(item.allConversionsValue || 0);
    });

    // Recalcula métricas derivadas para o sumário
    const safeDiv = (num: number, den: number) => (den > 0 ? num / den : null);
    const safePercent = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null);

    return {
      ...summary,
      ctr: safePercent(summary.clicks, summary.impressions),
      avgCpc: safeDiv(summary.cost, summary.clicks),
      cpa: safeDiv(summary.cost, summary.conversions),
      conversionRate: safePercent(summary.conversions, summary.clicks),
      roas: safeDiv(summary.conversionValue, summary.cost),
      avgCpm: summary.impressions > 0 ? (summary.cost / summary.impressions) * 1000 : null,
    };
  }
};
