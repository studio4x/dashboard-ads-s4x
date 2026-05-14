import { DashboardStore } from "@/data/dashboard-store";
import { DashboardService } from "@/services/dashboard-service";
import * as mockOverview from "@/data/mock-sheet-overview";
import * as mockGoogleAds from "@/data/mock-sheet-google-ads";
import * as mockMetaAds from "@/data/mock-sheet-meta-ads";
import * as mockGa4 from "@/data/mock-sheet-ga4-events";
import * as mockAudience from "@/data/mock-sheet-audience";
import * as mockSC from "@/data/mock-sheet-search-console";
import * as mockInsights from "@/data/mock-sheet-insights";

import { DashboardAggregator } from "./dashboard-aggregator";
import { parseISO } from "date-fns";
import { isDateInRange } from "./date-utils";

export async function getDashboardData(dashboardId: string, options?: { from?: string, to?: string }) {
  const useMocks = process.env.GOOGLE_SHEETS_USE_MOCKS === "true";
  const range = options?.from && options?.to ? { 
    from: parseISO(options.from), 
    to: parseISO(options.to) 
  } : null;

  // 1. Tenta buscar snapshot no Banco de Dados (Supabase) primeiro
  try {
    const snapshot = await DashboardService.getLatestSnapshot(dashboardId);
    if (snapshot && snapshot.payload_json) {
      let data = snapshot.payload_json;
      
      // Se houver range, calculamos os resumos comparativos e filtramos os dados
      let summary = null;
      let google_ads_summary = null;
      let meta_ads_summary = null;

      if (range) {
        if (data.overview) {
          summary = DashboardAggregator.compare(data.overview, range);
          data.overview = data.overview.filter((row: any) => isDateInRange(row.date, range));
        }
        if (data.google_ads) {
          google_ads_summary = DashboardAggregator.compare(data.google_ads, range);
          data.google_ads = data.google_ads.filter((row: any) => isDateInRange(row.date, range));
        }
        if (data.meta_ads) {
          meta_ads_summary = DashboardAggregator.compare(data.meta_ads, range);
          data.meta_ads = data.meta_ads.filter((row: any) => isDateInRange(row.date, range));
        }
      }

      return {
        ...data,
        summary,
        google_ads_summary,
        meta_ads_summary,
        source: snapshot.source_type || "google_sheets",
        lastUpdated: new Date(snapshot.imported_at).toLocaleString("pt-BR")
      };
    }
  } catch (dbError) {
    console.error("Erro ao buscar snapshot no banco:", dbError);
  }

  // 2. Se não houver snapshot, verifica se deve usar mocks
  if (useMocks) {
    return {
      overview: mockOverview.mockOverviewRows,
      google_ads: mockGoogleAds.mockGoogleAdsDaily,
      meta_ads: mockMetaAds.mockMetaAdsDaily,
      campaigns: [
        ...mockGoogleAds.mockGoogleAdsCampaigns,
        ...mockMetaAds.mockMetaAdsCampaigns
      ],
      ga4_events: mockGa4.mockGa4Events,
      audience: mockAudience.mockAudienceChannel,
      search_console: mockSC.mockSearchConsoleQueries,
      keywords: mockGoogleAds.mockKeywords,
      insights: mockInsights.mockInsights,
      source: "mock"
    };
  }

  // 2. Fallback para Cache em memória (DashboardStore) - apenas se GOOGLE_SHEETS_USE_MOCKS for true ou para testes rápidos
  if (useMocks) {
    const data = DashboardStore.getData(dashboardId);
    if (data) {
      return {
        ...data,
        source: "google_sheets_cache"
      };
    }
  }

  // Retorna nulo se nada for encontrado (forçando nova importação)
  return null;
}
