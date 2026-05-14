// ============================================================
// Mock: GA4 Events (aba "ga4_events" do Google Sheets)
// ============================================================

import type { EventRow, PageRow } from "@/types/sheet-rows";

export const mockGa4Events: EventRow[] = [
  { date: "2024-04-28", event_name: "purchase", event_count: 297, users: 280, sessions: 297, conversions: 297, source: "google", medium: "cpc" },
  { date: "2024-04-28", event_name: "add_to_cart", event_count: 1842, users: 1620, sessions: 1780, conversions: 0, source: "(direct)", medium: "(none)" },
  { date: "2024-04-28", event_name: "begin_checkout", event_count: 684, users: 640, sessions: 672, conversions: 0 },
  { date: "2024-04-28", event_name: "view_item", event_count: 8420, users: 6840, sessions: 7920, conversions: 0 },
  { date: "2024-04-28", event_name: "search", event_count: 2180, users: 1960, sessions: 2100, conversions: 0 },
  { date: "2024-04-28", event_name: "generate_lead", event_count: 142, users: 138, sessions: 142, conversions: 142, source: "google", medium: "cpc" },
  { date: "2024-04-28", event_name: "sign_up", event_count: 84, users: 84, sessions: 84, conversions: 84 },
  { date: "2024-04-28", event_name: "contact_form_submit", event_count: 56, users: 54, sessions: 56, conversions: 56 },
];

export const mockGa4Pages: PageRow[] = [
  { date: "2024-04-28", page_path: "/", page_title: "Home | Loja XYZ", sessions: 4820, users: 4210, page_views: 6840, avg_session_duration: 182, bounce_rate: 42.3, goal_completions: 48 },
  { date: "2024-04-28", page_path: "/produtos/calcados", page_title: "Calçados | Loja XYZ", sessions: 2840, users: 2540, page_views: 4120, avg_session_duration: 248, bounce_rate: 35.8, goal_completions: 32 },
  { date: "2024-04-28", page_path: "/produtos/roupas-fitness", page_title: "Roupas Fitness | Loja XYZ", sessions: 2180, users: 1980, page_views: 3240, avg_session_duration: 224, bounce_rate: 38.2, goal_completions: 24 },
  { date: "2024-04-28", page_path: "/checkout", page_title: "Finalizar Compra | Loja XYZ", sessions: 684, users: 640, page_views: 1020, avg_session_duration: 312, bounce_rate: 12.4, goal_completions: 297 },
  { date: "2024-04-28", page_path: "/blog/dicas-corrida", page_title: "5 Dicas para Correr Melhor | Blog", sessions: 1420, users: 1380, page_views: 1560, avg_session_duration: 342, bounce_rate: 68.2 },
  { date: "2024-04-28", page_path: "/sobre", page_title: "Sobre a Loja XYZ", sessions: 420, users: 400, page_views: 480, avg_session_duration: 142, bounce_rate: 58.4 },
  { date: "2024-04-28", page_path: "/contato", page_title: "Contato | Loja XYZ", sessions: 320, users: 312, page_views: 380, avg_session_duration: 128, bounce_rate: 48.2, goal_completions: 56 },
];

export const mockGa4Kpis = {
  total_sessions: 28420, total_users: 22840, new_users: 14280,
  avg_session_duration: 218, bounce_rate: 43.2, total_conversions: 297,
  conversion_rate: 1.05, prev_total_sessions: 24800, prev_total_users: 19600,
};
