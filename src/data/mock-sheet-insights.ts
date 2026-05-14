// ============================================================
// Mock: Insights (aba "insights" do Google Sheets)
// ============================================================

import type { InsightRow } from "@/types/sheet-rows";

export const mockInsights: InsightRow[] = [
  { date: "2024-04-28", insight_type: "positive", title: "ROAS do Google Shopping acima da meta", description: "A campanha Shopping — Catálogo Completo atingiu ROAS de 8,24x, superando a meta de 6x. O segmento de calçados responde por 62% das conversões.", metric: "roas", value: 8.24, comparison_value: 6.0, source: "google_ads", priority: 1 },
  { date: "2024-04-28", insight_type: "positive", title: "Remarketing Meta Ads com melhor CPA do mix", description: "A campanha de Remarketing — Visitantes 30 dias está com CPA de R$ 22,04, 36% abaixo da média do mix. Aumento de budget recomendado.", metric: "cpa", value: 22.04, comparison_value: 34.66, source: "meta_ads", priority: 1 },
  { date: "2024-04-28", insight_type: "warning", title: "YouTube com ROAS abaixo do limiar de rentabilidade", description: "Vídeo — Awareness | YouTube está com ROAS de 3,43x. Avaliar pausa ou redução de budget. Considerar redistribuição para Shopping.", metric: "roas", value: 3.43, comparison_value: 4.0, source: "google_ads", priority: 1 },
  { date: "2024-04-28", insight_type: "positive", title: "Search Console: impressões orgânicas crescendo", description: "As impressões orgânicas cresceram 14,5% vs. período anterior. Artigo 'Dicas para correr melhor' entrou para top 3 para 4 queries relevantes.", metric: "impressions", value: 284000, comparison_value: 248000, source: "search_console", priority: 2 },
  { date: "2024-04-28", insight_type: "info", title: "Pico de conversões às terças e quartas-feiras", description: "Análise dos últimos 28 dias mostra que 38% das conversões ocorrem entre terça e quarta. Recomenda-se aumentar lances nesses dias.", source: "system", priority: 2 },
  { date: "2024-04-28", insight_type: "warning", title: "Mobile com taxa de rejeição 18% maior que desktop", description: "Usuários mobile têm bounce rate de 52% vs. 34% no desktop. Verificar experiência mobile nas páginas de produto.", metric: "bounce_rate", value: 52, comparison_value: 34, source: "ga4", priority: 2 },
  { date: "2024-04-28", insight_type: "info", title: "Público feminino 25-34 é o segmento mais rentável", description: "Mulheres entre 25-34 anos representam 28% das sessões mas 41% das conversões. Considerar maior concentração de verba nesse segmento.", source: "ga4", priority: 3 },
];
