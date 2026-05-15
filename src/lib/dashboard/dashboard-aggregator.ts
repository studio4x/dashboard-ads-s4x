import { isDateInRange, getPreviousPeriod } from "./date-utils";

interface AggregatedMetrics {
  total_spend: number;
  total_revenue: number;
  total_conversions: number;
  total_clicks: number;
  total_impressions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

interface ComparisonResult {
  current: AggregatedMetrics;
  previous: AggregatedMetrics;
  change: {
    total_spend: number;
    total_revenue: number;
    total_conversions: number;
    total_clicks: number;
    total_impressions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
}

export const DashboardAggregator = {
  /**
   * Agrega dados do snapshot para um determinado período.
   */
  aggregate(rows: any[], range: { from: Date; to: Date }): AggregatedMetrics {
    const filtered = rows.filter(row => isDateInRange(row.date, range));
    
    const totals = filtered.reduce((acc, row) => ({
      spend: acc.spend + (row.total_spend || row.value || row.cost || 0),
      revenue: acc.revenue + (row.conversionValue || row.total_revenue || row.revenue || 0),
      conversions: acc.conversions + (row.total_conversions || row.conversions || 0),
      clicks: acc.clicks + (row.total_clicks || row.clicks || 0),
      impressions: acc.impressions + (row.total_impressions || row.impressions || 0),
    }), { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 });

    return {
      total_spend: totals.spend,
      total_revenue: totals.revenue,
      total_conversions: totals.conversions,
      total_clicks: totals.clicks,
      total_impressions: totals.impressions,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
      roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    };
  },

  /**
   * Calcula a variação percentual entre dois valores.
   */
  calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * Gera o comparativo completo entre dois períodos.
   */
  compare(rows: any[], currentRange: { from: Date; to: Date }): ComparisonResult {
    const prevRange = getPreviousPeriod(currentRange);
    
    const current = this.aggregate(rows, currentRange);
    const previous = this.aggregate(rows, prevRange);

    return {
      current,
      previous,
      change: {
        total_spend: this.calculateChange(current.total_spend, previous.total_spend),
        total_revenue: this.calculateChange(current.total_revenue, previous.total_revenue),
        total_conversions: this.calculateChange(current.total_conversions, previous.total_conversions),
        total_clicks: this.calculateChange(current.total_clicks, previous.total_clicks),
        total_impressions: this.calculateChange(current.total_impressions, previous.total_impressions),
        ctr: this.calculateChange(current.ctr, previous.ctr),
        cpc: this.calculateChange(current.cpc, previous.cpc),
        cpa: this.calculateChange(current.cpa, previous.cpa),
        roas: this.calculateChange(current.roas, previous.roas),
      }
    };
  }
};
