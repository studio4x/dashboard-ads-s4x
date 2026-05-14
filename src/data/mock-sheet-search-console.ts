// ============================================================
// Mock: Search Console (aba "search_console" do Google Sheets)
// ============================================================

import type { SearchConsoleRow } from "@/types/sheet-rows";

export const mockSearchConsoleQueries: SearchConsoleRow[] = [
  { date: "2024-04-28", query: "loja xyz", page: "https://lojaxyz.com.br/", country: "BRA", device: "MOBILE", impressions: 4820, clicks: 3842, ctr: 79.7, position: 1.1 },
  { date: "2024-04-28", query: "tênis feminino barato", page: "https://lojaxyz.com.br/produtos/calcados", country: "BRA", device: "MOBILE", impressions: 12840, clicks: 684, ctr: 5.3, position: 3.2 },
  { date: "2024-04-28", query: "roupa fitness academia", page: "https://lojaxyz.com.br/produtos/roupas-fitness", country: "BRA", device: "DESKTOP", impressions: 8420, clicks: 420, ctr: 4.99, position: 4.1 },
  { date: "2024-04-28", query: "como escolher tênis de corrida", page: "https://lojaxyz.com.br/blog/dicas-corrida", country: "BRA", device: "MOBILE", impressions: 18240, clicks: 1020, ctr: 5.59, position: 2.8 },
  { date: "2024-04-28", query: "mochila colegial feminina", page: "https://lojaxyz.com.br/produtos/mochilas", country: "BRA", device: "MOBILE", impressions: 6840, clicks: 284, ctr: 4.15, position: 5.4 },
  { date: "2024-04-28", query: "loja de roupas online", page: "https://lojaxyz.com.br/", country: "BRA", device: "DESKTOP", impressions: 42800, clicks: 428, ctr: 1.00, position: 12.3 },
  { date: "2024-04-28", query: "comprar legging fitness", page: "https://lojaxyz.com.br/produtos/roupas-fitness", country: "BRA", device: "MOBILE", impressions: 9840, clicks: 392, ctr: 3.98, position: 6.2 },
  { date: "2024-04-28", query: "tênis adidas corrida", page: "https://lojaxyz.com.br/produtos/calcados", country: "BRA", device: "MOBILE", impressions: 28400, clicks: 284, ctr: 1.00, position: 18.4 },
  { date: "2024-04-28", query: "dicas para correr melhor", page: "https://lojaxyz.com.br/blog/dicas-corrida", country: "BRA", device: "DESKTOP", impressions: 14200, clicks: 710, ctr: 5.00, position: 3.6 },
  { date: "2024-04-28", query: "mochila viagem barata", page: "https://lojaxyz.com.br/produtos/mochilas", country: "BRA", device: "TABLET", impressions: 5420, clicks: 216, ctr: 3.98, position: 7.1 },
];

export const mockSearchConsoleKpis = {
  total_impressions: 284000, total_clicks: 8420, avg_ctr: 2.96, avg_position: 8.4,
  prev_total_impressions: 248000, prev_total_clicks: 7240, prev_avg_ctr: 2.92, prev_avg_position: 9.2,
};
