import { KpiSummary } from "@/types/entities";
import { formatCurrency, formatNumber } from "@/lib/formatters";

/**
 * Gera os KPIs do Resumo Executivo a partir dos dados brutos e do sumário de comparação.
 */
export function generateExecutiveKpis(
  overviewRows: any[],
  summary?: any,
  sources?: {
    google?: any;
    meta?: any;
  }
): KpiSummary[] {
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
  const googleCurrent = sources?.google?.current || {};
  const metaCurrent = sources?.meta?.current || {};
  const googleChanges = sources?.google?.change || {};
  const metaChanges = sources?.meta?.change || {};

  const getDirection = (value: number, inverse = false): KpiSummary["change_direction"] => {
    if (Math.abs(value) < 0.01) return "neutral";
    if (inverse) return value > 0 ? "down" : "up";
    return value > 0 ? "up" : "down";
  };

  return [
    {
      metricKey: "cost",
      label: "Investimento Total", 
      value: current.total_spend, 
      formatted_value: formatCurrency(current.total_spend, true), 
      change_percent: changes.total_spend || 0,
      change_direction: getDirection(changes.total_spend || 0), 
      unit: "currency", 
      description: summary ? "vs. período anterior" : "Todas as fontes" 
    }, 
    {
      metricKey: "revenue",
      label: "Receita Gerada", 
      value: current.total_revenue, 
      formatted_value: formatCurrency(current.total_revenue, true), 
      change_percent: changes.total_revenue || 0, 
      change_direction: getDirection(changes.total_revenue || 0), 
      unit: "currency", 
      description: summary ? "vs. período anterior" : "Conversões rastreadas" 
    }, 
    {
      metricKey: "reach",
      label: "Alcance",
      value: current.reach || current.total_reach || 0,
      formatted_value: formatNumber(current.reach || current.total_reach || 0),
      change_percent: changes.reach || 0,
      change_direction: getDirection(changes.reach || 0),
      unit: "number",
      description: summary ? "vs. período anterior" : "Pessoas únicas alcançadas",
    },
    {
      metricKey: "roas",
      label: "ROAS Médio", 
      value: roas, 
      formatted_value: `${roas.toFixed(2)}x`, 
      change_percent: changes.roas || 0, 
      change_direction: getDirection(changes.roas || 0), 
      unit: "ratio", 
      description: summary ? "vs. período anterior" : "Retorno sobre investimento" 
    }, 
    { 
      metricKey: "conversions",
      label: "Conversões", 
      value: current.total_conversions, 
      formatted_value: formatNumber(current.total_conversions), 
      change_percent: changes.total_conversions || 0, 
      change_direction: getDirection(changes.total_conversions || 0), 
      unit: "number", 
      description: summary ? "vs. período anterior" : "Total do período" 
    }, 
    { 
      metricKey: "cpa",
      label: "CPA Médio", 
      value: cpa, 
      formatted_value: formatCurrency(cpa), 
      change_percent: changes.cpa || 0, 
      change_direction: getDirection(changes.cpa || 0, true), // CPA menor é melhor
      unit: "currency", 
      description: summary ? "vs. período anterior" : "Custo por aquisição" 
    }, 
    { 
      metricKey: "clicks",
      label: "Cliques Totais", 
      value: current.total_clicks, 
      formatted_value: formatNumber(current.total_clicks), 
      change_percent: changes.total_clicks || 0, 
      change_direction: getDirection(changes.total_clicks || 0), 
      unit: "number", 
      description: summary ? "vs. período anterior" : "Tráfego pago" 
    },
    ...((sources?.google ? [
      {
        metricKey: "google_cost",
        label: "Investimento Google Ads",
        value: Number(googleCurrent.total_spend || googleCurrent.cost || 0),
        formatted_value: formatCurrency(Number(googleCurrent.total_spend || googleCurrent.cost || 0), true),
        change_percent: googleChanges.total_spend || googleChanges.cost || 0,
        change_direction: getDirection(googleChanges.total_spend || googleChanges.cost || 0),
        unit: "currency",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_clicks",
        label: "Cliques Google Ads",
        value: Number(googleCurrent.total_clicks || 0),
        formatted_value: formatNumber(Number(googleCurrent.total_clicks || 0)),
        change_percent: googleChanges.total_clicks || 0,
        change_direction: getDirection(googleChanges.total_clicks || 0),
        unit: "number",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_conversions",
        label: "Conversões Google Ads",
        value: Number(googleCurrent.total_conversions || 0),
        formatted_value: formatNumber(Number(googleCurrent.total_conversions || 0)),
        change_percent: googleChanges.total_conversions || 0,
        change_direction: getDirection(googleChanges.total_conversions || 0),
        unit: "number",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_impressions",
        label: "Impressões Google Ads",
        value: Number(googleCurrent.total_impressions || 0),
        formatted_value: formatNumber(Number(googleCurrent.total_impressions || 0)),
        change_percent: googleChanges.total_impressions || 0,
        change_direction: getDirection(googleChanges.total_impressions || 0),
        unit: "number",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_ctr",
        label: "CTR Google Ads",
        value: Number(googleCurrent.ctr || 0),
        formatted_value: `${Number(googleCurrent.ctr || 0).toFixed(2)}%`,
        change_percent: googleChanges.ctr || 0,
        change_direction: getDirection(googleChanges.ctr || 0),
        unit: "percent",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_cpc",
        label: "CPC Google Ads",
        value: Number(googleCurrent.cpc || 0),
        formatted_value: formatCurrency(Number(googleCurrent.cpc || 0)),
        change_percent: googleChanges.cpc || 0,
        change_direction: getDirection(googleChanges.cpc || 0, true),
        unit: "currency",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_cpa",
        label: "CPA Google Ads",
        value: Number(googleCurrent.cpa || 0),
        formatted_value: formatCurrency(Number(googleCurrent.cpa || 0)),
        change_percent: googleChanges.cpa || 0,
        change_direction: getDirection(googleChanges.cpa || 0, true),
        unit: "currency",
        description: "Somente Google Ads",
      },
      {
        metricKey: "google_roas",
        label: "ROAS Google Ads",
        value: Number(googleCurrent.roas || 0),
        formatted_value: `${Number(googleCurrent.roas || 0).toFixed(2)}x`,
        change_percent: googleChanges.roas || 0,
        change_direction: getDirection(googleChanges.roas || 0),
        unit: "ratio",
        description: "Somente Google Ads",
      },
    ] : []) as any[]),
    ...((sources?.meta ? [
      {
        metricKey: "meta_cost",
        label: "Investimento Meta Ads",
        value: Number(metaCurrent.total_spend || metaCurrent.cost || 0),
        formatted_value: formatCurrency(Number(metaCurrent.total_spend || metaCurrent.cost || 0), true),
        change_percent: metaChanges.total_spend || metaChanges.cost || 0,
        change_direction: getDirection(metaChanges.total_spend || metaChanges.cost || 0),
        unit: "currency",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_reach",
        label: "Alcance Meta Ads",
        value: Number(metaCurrent.reach || metaCurrent.total_reach || 0),
        formatted_value: formatNumber(Number(metaCurrent.reach || metaCurrent.total_reach || 0)),
        change_percent: metaChanges.reach || 0,
        change_direction: getDirection(metaChanges.reach || 0),
        unit: "number",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_clicks",
        label: "Cliques Meta Ads",
        value: Number(metaCurrent.total_clicks || metaCurrent.clicks || 0),
        formatted_value: formatNumber(Number(metaCurrent.total_clicks || metaCurrent.clicks || 0)),
        change_percent: metaChanges.total_clicks || metaChanges.clicks || 0,
        change_direction: getDirection(metaChanges.total_clicks || metaChanges.clicks || 0),
        unit: "number",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_conversions",
        label: "Conversões Meta Ads",
        value: Number(metaCurrent.total_conversions || metaCurrent.conversions || 0),
        formatted_value: formatNumber(Number(metaCurrent.total_conversions || metaCurrent.conversions || 0)),
        change_percent: metaChanges.total_conversions || metaChanges.conversions || 0,
        change_direction: getDirection(metaChanges.total_conversions || metaChanges.conversions || 0),
        unit: "number",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_frequency",
        label: "Frequência Meta Ads",
        value: Number(metaCurrent.frequency || 0),
        formatted_value: `${Number(metaCurrent.frequency || 0).toFixed(2)}x`,
        change_percent: metaChanges.frequency || 0,
        change_direction: getDirection(metaChanges.frequency || 0),
        unit: "ratio",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_cpm",
        label: "CPM Meta Ads",
        value: Number(metaCurrent.avgCpm || metaCurrent.cpm || 0),
        formatted_value: formatCurrency(Number(metaCurrent.avgCpm || metaCurrent.cpm || 0)),
        change_percent: metaChanges.avgCpm || metaChanges.cpm || 0,
        change_direction: getDirection(metaChanges.avgCpm || metaChanges.cpm || 0, true),
        unit: "currency",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_cpc",
        label: "CPC Meta Ads",
        value: Number(metaCurrent.cpc || 0),
        formatted_value: formatCurrency(Number(metaCurrent.cpc || 0)),
        change_percent: metaChanges.cpc || 0,
        change_direction: getDirection(metaChanges.cpc || 0, true),
        unit: "currency",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_cpa",
        label: "CPA Meta Ads",
        value: Number(metaCurrent.cpa || 0),
        formatted_value: formatCurrency(Number(metaCurrent.cpa || 0)),
        change_percent: metaChanges.cpa || 0,
        change_direction: getDirection(metaChanges.cpa || 0, true),
        unit: "currency",
        description: "Somente Meta Ads",
      },
      {
        metricKey: "meta_postEngagement",
        label: "Engajamentos Meta Ads",
        value: Number(metaCurrent.postEngagement || metaCurrent.total_engagement || 0),
        formatted_value: formatNumber(Number(metaCurrent.postEngagement || metaCurrent.total_engagement || 0)),
        change_percent: metaChanges.postEngagement || metaChanges.engagement || 0,
        change_direction: getDirection(metaChanges.postEngagement || metaChanges.engagement || 0),
        unit: "number",
        description: "Somente Meta Ads",
      },
    ] : []) as any[]),
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
  const cpc = summary ? summary.current.cpc : (current.total_clicks > 0 ? current.total_spend / current.total_clicks : 0);
  
  const changes = summary?.change || {};
  const getDirection = (value: number, inverse = false): KpiSummary["change_direction"] => {
    if (Math.abs(value) < 0.01) return "neutral";
    if (inverse) return value > 0 ? "down" : "up";
    return value > 0 ? "up" : "down";
  };

  return [
    { metricKey: "cost", label: "Investimento", value: current.total_spend, formatted_value: formatCurrency(current.total_spend, true), change_percent: changes.total_spend || 0, change_direction: getDirection(changes.total_spend || 0), unit: "currency", description: "vs. período anterior" },
    { metricKey: "revenue", label: "Receita", value: current.total_revenue, formatted_value: formatCurrency(current.total_revenue, true), change_percent: changes.total_revenue || 0, change_direction: getDirection(changes.total_revenue || 0), unit: "currency", description: "vs. período anterior" },
    { metricKey: "impressions", label: "Impressões", value: current.total_impressions, formatted_value: formatNumber(current.total_impressions), change_percent: changes.total_impressions || 0, change_direction: getDirection(changes.total_impressions || 0), unit: "number", description: "vs. período anterior" },
    { metricKey: "clicks", label: "Cliques", value: current.total_clicks, formatted_value: formatNumber(current.total_clicks), change_percent: changes.total_clicks || 0, change_direction: getDirection(changes.total_clicks || 0), unit: "number", description: "vs. período anterior" },
    { metricKey: "ctr", label: "CTR Médio", value: ctr, formatted_value: `${ctr.toFixed(2)}%`, change_percent: changes.ctr || 0, change_direction: getDirection(changes.ctr || 0), unit: "percent", description: "vs. período anterior" },
    { metricKey: "cpc", label: "CPC Médio", value: cpc, formatted_value: formatCurrency(cpc), change_percent: changes.cpc || 0, change_direction: getDirection(changes.cpc || 0, true), unit: "currency", description: "vs. período anterior" },
    { metricKey: "roas", label: "ROAS", value: roas, formatted_value: `${roas.toFixed(2)}x`, change_percent: changes.roas || 0, change_direction: getDirection(changes.roas || 0), unit: "ratio", description: "vs. período anterior" },
    { metricKey: "conversions", label: "Conversões", value: current.total_conversions, formatted_value: formatNumber(current.total_conversions), change_percent: changes.total_conversions || 0, change_direction: getDirection(changes.total_conversions || 0), unit: "number", description: "vs. período anterior" },
    { metricKey: "cpa", label: "CPA Médio", value: cpa, formatted_value: formatCurrency(cpa), change_percent: changes.cpa || 0, change_direction: getDirection(changes.cpa || 0, true), unit: "currency", description: "vs. período anterior" },
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
  return generateMetaAdsS4XKpisWithLabels(dailyRows, summary);
}

export function generateMetaAdsS4XKpisWithLabels(
  dailyRows: any[],
  summary?: any,
  labels?: {
    conversionLabel?: string;
    costLabel?: string;
    costMetric?: "cpa" | "cpc" | "cpm";
    resultMetric?: "conversions" | "postEngagement" | "clicks" | "reach";
  }
): (KpiSummary & { metricKey: string })[] {
  if (!dailyRows || dailyRows.length === 0) return [];

  const current = summary ? summary.current : dailyRows.reduce((acc, curr) => ({
    total_spend: acc.total_spend + Number(curr.cost || 0),
    total_conversions: acc.total_conversions + Number(curr.conversions || 0),
    total_clicks: acc.total_clicks + Number(curr.clicks || 0),
    total_impressions: acc.total_impressions + Number(curr.impressions || 0),
    total_reach: acc.total_reach + Number(curr.reach || 0),
  }), { total_spend: 0, total_conversions: 0, total_clicks: 0, total_impressions: 0, total_reach: 0 });

  const reachValue = Number((current as any).total_reach ?? (current as any).reach ?? 0);
  const cpa = summary?.current?.cpa !== undefined ? summary.current.cpa : (current.total_conversions > 0 ? current.total_spend / current.total_conversions : 0);
  const ctr = summary?.current?.ctr !== undefined ? summary.current.ctr : (current.total_impressions > 0 ? (current.total_clicks / current.total_impressions) * 100 : 0);
  const frequency = summary?.current?.frequency !== undefined ? summary.current.frequency : (reachValue > 0 ? current.total_impressions / reachValue : 0);
  const cpm = summary?.current?.avgCpm !== undefined ? summary.current.avgCpm : (current.total_impressions > 0 ? (current.total_spend / current.total_impressions) * 1000 : 0);
  
  const changes = summary?.change || {};
  const getDirection = (value: number, inverse = false): KpiSummary["change_direction"] => {
    if (Math.abs(value) < 0.01) return "neutral";
    if (inverse) return value > 0 ? "down" : "up";
    return value > 0 ? "up" : "down";
  };

  const conversionLabel = labels?.conversionLabel || "Conversões";
  const costLabel = labels?.costLabel || "Custo por Conversão";
  const costMetric = labels?.costMetric || "cpa";
  const resultMetric = labels?.resultMetric || "conversions";
  const resultMetricValue =
    resultMetric === "postEngagement" ? Number(summary?.current?.postEngagement ?? 0)
      : resultMetric === "clicks" ? Number(summary?.current?.total_clicks ?? current.total_clicks ?? 0)
      : resultMetric === "reach" ? Number(summary?.current?.reach ?? current.total_reach ?? 0)
      : Number(summary?.current?.total_conversions ?? current.total_conversions ?? 0);
  const resultMetricChange =
    resultMetric === "postEngagement" ? (changes.postEngagement || changes.engagement || 0)
      : resultMetric === "clicks" ? (changes.total_clicks || changes.clicks || 0)
      : resultMetric === "reach" ? (changes.reach || 0)
      : (changes.total_conversions || changes.conversions || 0);
  const impressions = summary?.current?.total_impressions !== undefined ? Number(summary.current.total_impressions) : Number(current.total_impressions || 0);
  const ctrValue = summary?.current?.ctr !== undefined ? Number(summary.current.ctr) : (impressions > 0 ? (Number(current.total_clicks || 0) / impressions) * 100 : 0);
  const cpcValue = summary?.current?.cpc !== undefined ? Number(summary.current.cpc) : (Number(current.total_clicks || 0) > 0 ? Number(current.total_spend || 0) / Number(current.total_clicks || 0) : 0);
  const cpmValue = summary?.current?.avgCpm !== undefined ? Number(summary.current.avgCpm) : (impressions > 0 ? (Number(current.total_spend || 0) / impressions) * 1000 : 0);
  const costMetricValue =
    costMetric === "cpc"
      ? cpcValue
      : costMetric === "cpm"
        ? cpmValue
        : cpa;
  const costMetricChange =
    costMetric === "cpc" ? (changes.cpc || 0)
      : costMetric === "cpm" ? (changes.avgCpm || changes.cpm || 0)
      : (changes.cpa || 0);

  return [
    { 
      metricKey: "cost",
      label: "Investimento", 
      value: current.total_spend, 
      formatted_value: formatCurrency(current.total_spend, true), 
      change_percent: changes.total_spend || changes.cost || 0, 
      change_direction: getDirection(changes.total_spend || changes.cost || 0), 
      unit: "currency", 
      description: "Gasto total em anúncios" 
    },
    { 
      metricKey: "conversions",
      label: conversionLabel, 
      value: resultMetricValue, 
      formatted_value: formatNumber(resultMetricValue), 
      change_percent: resultMetricChange, 
      change_direction: getDirection(resultMetricChange), 
      unit: "number", 
      description: "Resultado principal" 
    },
    { 
      metricKey: "cpa",
      label: costLabel, 
      value: costMetricValue, 
      formatted_value: costMetricValue ? formatCurrency(costMetricValue) : "R$ 0,00", 
      change_percent: costMetricChange, 
      change_direction: getDirection(costMetricChange, true),
      unit: "currency", 
      description: "Custo médio por resultado" 
    },
    { 
      metricKey: "impressions",
      label: "Impressões",
      value: impressions,
      formatted_value: formatNumber(impressions),
      change_percent: changes.total_impressions || changes.impressions || 0,
      change_direction: getDirection(changes.total_impressions || changes.impressions || 0),
      unit: "number",
      description: "Volume de exibições",
    },
    {
      metricKey: "ctr",
      label: "CTR",
      value: ctrValue,
      formatted_value: `${Number(ctrValue || 0).toFixed(2)}%`,
      change_percent: changes.ctr || 0,
      change_direction: getDirection(changes.ctr || 0),
      unit: "percent",
      description: "Taxa de cliques",
    },
    {
      metricKey: "cpc",
      label: "CPC",
      value: cpcValue,
      formatted_value: formatCurrency(cpcValue),
      change_percent: changes.cpc || 0,
      change_direction: getDirection(changes.cpc || 0, true),
      unit: "currency",
      description: "Custo por clique",
    },
    {
      metricKey: "cpm",
      label: "CPM",
      value: cpmValue,
      formatted_value: formatCurrency(cpmValue),
      change_percent: changes.avgCpm || changes.cpm || 0,
      change_direction: getDirection(changes.avgCpm || changes.cpm || 0, true),
      unit: "currency",
      description: "Custo por mil impressões",
    },
    {
      metricKey: "postEngagement",
      label: "Engajamentos",
      value: Number(summary?.current?.postEngagement ?? current.postEngagement ?? 0),
      formatted_value: formatNumber(Number(summary?.current?.postEngagement ?? current.postEngagement ?? 0)),
      change_percent: changes.postEngagement || changes.engagement || 0,
      change_direction: getDirection(changes.postEngagement || changes.engagement || 0),
      unit: "number",
      description: "Interações com a publicação",
    },
    {
      metricKey: "reach",
      label: "Alcance",
      value: reachValue,
      formatted_value: formatNumber(reachValue),
      change_percent: changes.reach || 0,
      change_direction: getDirection(changes.reach || 0),
      unit: "number",
      description: "Usuários únicos alcançados"
    },
    { 
      metricKey: "frequency",
      label: "Frequência", 
      value: frequency, 
      formatted_value: `${Number(frequency || 0).toFixed(2)}x`, 
      change_percent: changes.frequency || 0, 
      change_direction: getDirection(changes.frequency || 0), 
      unit: "ratio", 
      description: "Média de exibições por usuário" 
    },
    { 
      metricKey: "clicks",
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
