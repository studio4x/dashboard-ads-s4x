import { KpiSummary } from "@/types/entities";
import { formatCurrency, formatNumber } from "@/lib/formatters";

/**
 * Gera os KPIs do Resumo Executivo a partir dos dados brutos e do sumário de comparação.
 */
export function generateExecutiveKpis(overviewRows: any[], summary?: any): KpiSummary[] {
  if (!overviewRows || overviewRows.length === 0) return [];

  // Se tivermos o summary (Fase 5.3), usamos os dados agregados e calculados lá
  const current = summary ? summary.current : overviewRows.reduce((acc, curr) => ({
    total_spend: acc.total_spend + (curr.total_spend || 0),
    total_revenue: acc.total_revenue + (curr.total_revenue || 0),
    total_conversions: acc.total_conversions + (curr.total_conversions || 0),
    total_clicks: acc.total_clicks + (curr.total_clicks || 0),
  }), { total_spend: 0, total_revenue: 0, total_conversions: 0, total_clicks: 0 });

  const roas = summary ? summary.current.roas : (current.total_spend > 0 ? current.total_revenue / current.total_spend : 0);
  const cpa = summary ? summary.current.cpa : (current.total_conversions > 0 ? current.total_spend / current.total_conversions : 0);
  const changes = summary?.change || {};

  const getDirection = (value: number, inverse = false) => {
    if (Math.abs(value) < 0.01) return "neutral";
    if (inverse) return value > 0 ? "down" : "up";
    return value > 0 ? "up" : "down";
  };

  return [
    { 
      label: "Investimento Total", 
      value: current.total_spend, 
      formatted_value: formatCurrency(current.total_spend, true), 
      change_percent: changes.total_spend || 0,
      change_direction: getDirection(changes.total_spend || 0), 
      unit: "currency", 
      description: summary ? "vs. período anterior" : "Todas as fontes" 
    },
    { 
      label: "Receita Gerada", 
      value: current.total_revenue, 
      formatted_value: formatCurrency(current.total_revenue, true), 
      change_percent: changes.total_revenue || 0, 
      change_direction: getDirection(changes.total_revenue || 0), 
      unit: "currency", 
      description: summary ? "vs. período anterior" : "Conversões rastreadas" 
    },
    { 
      label: "ROAS Médio", 
      value: roas, 
      formatted_value: `${roas.toFixed(2)}x`, 
      change_percent: changes.roas || 0, 
      change_direction: getDirection(changes.roas || 0), 
      unit: "ratio", 
      description: summary ? "vs. período anterior" : "Retorno sobre investimento" 
    },
    { 
      label: "Conversões", 
      value: current.total_conversions, 
      formatted_value: formatNumber(current.total_conversions), 
      change_percent: changes.total_conversions || 0, 
      change_direction: getDirection(changes.total_conversions || 0), 
      unit: "number", 
      description: summary ? "vs. período anterior" : "Total do período" 
    },
    { 
      label: "CPA Médio", 
      value: cpa, 
      formatted_value: formatCurrency(cpa), 
      change_percent: changes.cpa || 0, 
      change_direction: getDirection(changes.cpa || 0, true), // CPA menor é melhor
      unit: "currency", 
      description: summary ? "vs. período anterior" : "Custo por aquisição" 
    },
    { 
      label: "Cliques Totais", 
      value: current.total_clicks, 
      formatted_value: formatNumber(current.total_clicks), 
      change_percent: changes.total_clicks || 0, 
      change_direction: getDirection(changes.total_clicks || 0), 
      unit: "number", 
      description: summary ? "vs. período anterior" : "Tráfego pago" 
    },
  ];
}

/**
 * Gera os KPIs para a página de Google Ads.
 */
export function generateGoogleAdsKpis(adsRows: any[], summary?: any): KpiSummary[] {
  if (!adsRows || adsRows.length === 0) return [];

  const current = summary ? summary.current : adsRows.reduce((acc, curr) => ({
    total_spend: acc.total_spend + (curr.value || curr.cost || 0),
    total_revenue: acc.total_revenue + (curr.revenue || 0),
    total_conversions: acc.total_conversions + (curr.conversions || 0),
    total_clicks: acc.total_clicks + (curr.clicks || 0),
    total_impressions: acc.total_impressions + (curr.impressions || 0),
  }), { total_spend: 0, total_revenue: 0, total_conversions: 0, total_clicks: 0, total_impressions: 0 });

  const roas = summary ? summary.current.roas : (current.total_spend > 0 ? current.total_revenue / current.total_spend : 0);
  const cpa = summary ? summary.current.cpa : (current.total_conversions > 0 ? current.total_spend / current.total_conversions : 0);
  const ctr = summary ? summary.current.ctr : (current.total_impressions > 0 ? (current.total_clicks / current.total_impressions) * 100 : 0);
  
  const changes = summary?.change || {};
  const getDirection = (value: number, inverse = false) => {
    if (Math.abs(value) < 0.01) return "neutral";
    if (inverse) return value > 0 ? "down" : "up";
    return value > 0 ? "up" : "down";
  };

  return [
    { label: "Investimento", value: current.total_spend, formatted_value: formatCurrency(current.total_spend, true), change_percent: changes.total_spend || 0, change_direction: getDirection(changes.total_spend || 0), unit: "currency", description: "vs. período anterior" },
    { label: "Receita", value: current.total_revenue, formatted_value: formatCurrency(current.total_revenue, true), change_percent: changes.total_revenue || 0, change_direction: getDirection(changes.total_revenue || 0), unit: "currency", description: "vs. período anterior" },
    { label: "ROAS", value: roas, formatted_value: `${roas.toFixed(2)}x`, change_percent: changes.roas || 0, change_direction: getDirection(changes.roas || 0), unit: "ratio", description: "vs. período anterior" },
    { label: "Conversões", value: current.total_conversions, formatted_value: formatNumber(current.total_conversions), change_percent: changes.total_conversions || 0, change_direction: getDirection(changes.total_conversions || 0), unit: "number", description: "vs. período anterior" },
    { label: "CPA Médio", value: cpa, formatted_value: formatCurrency(cpa), change_percent: changes.cpa || 0, change_direction: getDirection(changes.cpa || 0, true), unit: "currency", description: "vs. período anterior" },
    { label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: changes.ctr || 0, change_direction: getDirection(changes.ctr || 0), unit: "percent", description: "vs. período anterior" },
  ];
}

/**
 * Gera os KPIs para a página de Meta Ads.
 */
export function generateMetaAdsKpis(adsRows: any[], summary?: any): KpiSummary[] {
  return generateGoogleAdsKpis(adsRows, summary);
}

/**
 * Gera os KPIs específicos para o template Meta Ads S4X.
 */
export function generateMetaAdsS4XKpis(dailyRows: any[], summary?: any): KpiSummary[] {
  if (!dailyRows || dailyRows.length === 0) return [];

  const current = summary ? summary.current : dailyRows.reduce((acc, curr) => ({
    total_spend: acc.total_spend + Number(curr.cost || 0),
    total_conversions: acc.total_conversions + Number(curr.conversions || 0),
    total_clicks: acc.total_clicks + Number(curr.clicks || 0),
    total_impressions: acc.total_impressions + Number(curr.impressions || 0),
    total_reach: acc.total_reach + Number(curr.reach || 0),
  }), { total_spend: 0, total_conversions: 0, total_clicks: 0, total_impressions: 0, total_reach: 0 });

  const cpa = summary?.current?.cpa !== undefined ? summary.current.cpa : (current.total_conversions > 0 ? current.total_spend / current.total_conversions : 0);
  const ctr = summary?.current?.ctr !== undefined ? summary.current.ctr : (current.total_impressions > 0 ? (current.total_clicks / current.total_impressions) * 100 : 0);
  const frequency = summary?.current?.frequency !== undefined ? summary.current.frequency : (current.total_reach > 0 ? current.total_impressions / current.total_reach : 0);
  const cpm = summary?.current?.avgCpm !== undefined ? summary.current.avgCpm : (current.total_impressions > 0 ? (current.total_spend / current.total_impressions) * 1000 : 0);
  
  const changes = summary?.change || {};
  const getDirection = (value: number, inverse = false) => {
    if (Math.abs(value) < 0.01) return "neutral";
    if (inverse) return value > 0 ? "down" : "up";
    return value > 0 ? "up" : "down";
  };

  return [
    { 
      label: "Investimento", 
      value: current.total_spend, 
      formatted_value: formatCurrency(current.total_spend, true), 
      change_percent: changes.total_spend || changes.cost || 0, 
      change_direction: getDirection(changes.total_spend || changes.cost || 0), 
      unit: "currency", 
      description: "Gasto total em anúncios" 
    },
    { 
      label: "Conversas Iniciadas", 
      value: current.total_conversions, 
      formatted_value: formatNumber(current.total_conversions), 
      change_percent: changes.total_conversions || changes.conversions || 0, 
      change_direction: getDirection(changes.total_conversions || changes.conversions || 0), 
      unit: "number", 
      description: "Mensagens iniciadas" 
    },
    { 
      label: "Custo por Conversa", 
      value: cpa, 
      formatted_value: cpa ? formatCurrency(cpa) : "R$ 0,00", 
      change_percent: changes.cpa || 0, 
      change_direction: getDirection(changes.cpa || 0, true), // CPA menor é melhor
      unit: "currency", 
      description: "Custo médio por conversa" 
    },
    { 
      label: "Alcance", 
      value: current.total_reach, 
      formatted_value: formatNumber(current.total_reach), 
      change_percent: changes.reach || 0, 
      change_direction: getDirection(changes.reach || 0), 
      unit: "number", 
      description: "Usuários únicos alcançados" 
    },
    { 
      label: "Frequência", 
      value: frequency, 
      formatted_value: `${Number(frequency || 0).toFixed(2)}x`, 
      change_percent: changes.frequency || 0, 
      change_direction: getDirection(changes.frequency || 0), 
      unit: "ratio", 
      description: "Média de exibições por usuário" 
    },
    { 
      label: "Cliques no Link", 
      value: current.total_clicks, 
      formatted_value: formatNumber(current.total_clicks), 
      change_percent: changes.total_clicks || changes.clicks || 0, 
      change_direction: getDirection(changes.total_clicks || changes.clicks || 0), 
      unit: "number", 
      description: "Cliques de saída" 
    },
  ];
}

