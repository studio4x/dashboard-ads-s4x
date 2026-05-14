import { DashboardStore } from "@/data/dashboard-store";
import * as mockOverview from "@/data/mock-sheet-overview";
import * as mockGoogleAds from "@/data/mock-sheet-google-ads";
import * as mockMetaAds from "@/data/mock-sheet-meta-ads";
import * as mockGa4 from "@/data/mock-sheet-ga4-events";
import * as mockAudience from "@/data/mock-sheet-audience";
import * as mockSC from "@/data/mock-sheet-search-console";
import * as mockInsights from "@/data/mock-sheet-insights";

export async function getDashboardData(dashboardId: string) {
  const useMocks = process.env.GOOGLE_SHEETS_USE_MOCKS === "true";

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
      audience: mockAudience.mockAudienceChannel, // simplify for provider
      search_console: mockSC.mockSearchConsoleQueries,
      keywords: mockGoogleAds.mockKeywords,
      insights: mockInsights.mockInsights,
      source: "mock"
    };
  }

  // Modo Real
  const data = DashboardStore.getData(dashboardId);
  
  if (!data) {
    // Retorna nulo para indicar que precisa de importação
    return null;
  }

  return {
    ...data,
    source: "google_sheets"
  };
}
