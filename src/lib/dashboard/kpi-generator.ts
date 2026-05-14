import { KpiSummary } from "@/types/entities";
import { formatCurrency, formatNumber } from "@/lib/formatters";

/**
 * Gera os KPIs do Resumo Executivo a partir dos dados brutos.
 */
export function generateExecutiveKpis(overviewRows: any[]): KpiSummary[] {
  if (!overviewRows || overviewRows.length === 0) return [];

  // Pega o último dia e o penúltimo para comparação (ou consolidado)
  // No MVP simplificado, vamos somar o período todo
  const current = overviewRows.reduce((acc, curr) => ({
    spend: acc.spend + (curr.total_spend || 0),
    revenue: acc.revenue + (curr.total_revenue || 0),
    conversions: acc.conversions + (curr.total_conversions || 0),
    clicks: acc.clicks + (curr.total_clicks || 0),
  }), { spend: 0, revenue: 0, conversions: 0, clicks: 0 });

  const roas = current.spend > 0 ? current.revenue / current.spend : 0;
  const cpa = current.conversions > 0 ? current.spend / current.conversions : 0;

  return [
    { 
      label: "Investimento Total", 
      value: current.spend, 
      formatted_value: formatCurrency(current.spend, true), 
      change_percent: 5.2, // Mock variação para o MVP
      change_direction: "up", 
      unit: "currency", 
      description: "Todas as fontes" 
    },
    { 
      label: "Receita Gerada", 
      value: current.revenue, 
      formatted_value: formatCurrency(current.revenue, true), 
      change_percent: 12.4, 
      change_direction: "up", 
      unit: "currency", 
      description: "Conversões rastreadas" 
    },
    { 
      label: "ROAS Médio", 
      value: roas, 
      formatted_value: `${roas.toFixed(2)}x`, 
      change_percent: 3.8, 
      change_direction: "up", 
      unit: "ratio", 
      description: "Retorno sobre investimento" 
    },
    { 
      label: "Conversões", 
      value: current.conversions, 
      formatted_value: formatNumber(current.conversions), 
      change_percent: 8.1, 
      change_direction: "up", 
      unit: "number", 
      description: "Total do período" 
    },
    { 
      label: "CPA Médio", 
      value: cpa, 
      formatted_value: formatCurrency(cpa), 
      change_percent: -2.4, 
      change_direction: "up", 
      unit: "currency", 
      description: "Custo por aquisição" 
    },
    { 
      label: "Cliques Totais", 
      value: current.clicks, 
      formatted_value: formatNumber(current.clicks), 
      change_percent: 1.2, 
      change_direction: "up", 
      unit: "number", 
      description: "Tráfego pago" 
    },
  ];
}

/**
 * Gera os KPIs para a página de Google Ads.
 */
export function generateGoogleAdsKpis(adsRows: any[]): KpiSummary[] {
  if (!adsRows || adsRows.length === 0) return [];

  const current = adsRows.reduce((acc, curr) => ({
    spend: acc.spend + (curr.value || 0),
    revenue: acc.revenue + (curr.revenue || 0),
    conversions: acc.conversions + (curr.conversions || 0),
    clicks: acc.clicks + (curr.clicks || 0),
    impressions: acc.impressions + (curr.impressions || 0),
  }), { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 });

  const roas = current.spend > 0 ? current.revenue / current.spend : 0;
  const cpa = current.conversions > 0 ? current.spend / current.conversions : 0;
  const ctr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;

  return [
    { label: "Investimento", value: current.spend, formatted_value: formatCurrency(current.spend, true), change_percent: 3.2, change_direction: "up", unit: "currency", description: "vs. período anterior" },
    { label: "Receita", value: current.revenue, formatted_value: formatCurrency(current.revenue, true), change_percent: 7.5, change_direction: "up", unit: "currency", description: "vs. período anterior" },
    { label: "ROAS", value: roas, formatted_value: `${roas.toFixed(2)}x`, change_percent: 4.1, change_direction: "up", unit: "ratio", description: "vs. período anterior" },
    { label: "Conversões", value: current.conversions, formatted_value: formatNumber(current.conversions), change_percent: 5.6, change_direction: "up", unit: "number", description: "vs. período anterior" },
    { label: "CPA Médio", value: cpa, formatted_value: formatCurrency(cpa), change_percent: -1.2, change_direction: "up", unit: "currency", description: "vs. período anterior" },
    { label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: 0.5, change_direction: "up", unit: "percent", description: "vs. período anterior" },
  ];
}

/**
 * Gera os KPIs para a página de Meta Ads.
 */
export function generateMetaAdsKpis(adsRows: any[]): KpiSummary[] {
  // Mesma lógica do Google Ads, mas pode ter métricas específicas de rede social no futuro
  return generateGoogleAdsKpis(adsRows);
}
