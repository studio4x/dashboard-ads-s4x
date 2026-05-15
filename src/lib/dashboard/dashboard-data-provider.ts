import { DashboardStore } from "@/data/dashboard-store";
import { DashboardService } from "@/services/dashboard-service";
import * as mockOverview from "@/data/mock-sheet-overview";
import * as mockGoogleAds from "@/data/mock-sheet-google-ads";
import * as mockMetaAds from "@/data/mock-sheet-meta-ads";
import * as mockGa4 from "@/data/mock-sheet-ga4-events";
import * as mockAudience from "@/data/mock-sheet-audience";
import * as mockSC from "@/data/mock-sheet-search-console";
import * as mockInsights from "@/data/mock-sheet-insights";
import { mockGoogleAdsS4XPayload } from "@/data/mock-sheet-google-ads-s4x";

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

      // Identifica se é o novo payload S4X
      const isS4X = data.diagnostics?.snapshotVersion?.startsWith("google_ads_s4x");

      if (range) {
        if (isS4X) {
          // No novo payload, usamos dailyPerformance para o sumário geral
          if (data.dailyPerformance) {
            google_ads_summary = DashboardAggregator.compare(data.dailyPerformance, range);
            data.dailyPerformance = data.dailyPerformance.filter((row: any) => isDateInRange(row.date, range));
            data.overview = data.dailyPerformance; // Garantir que overview tenha dados para gráficos
            summary = google_ads_summary; // O sumário geral do dashboard é o do Google Ads no template S4X
          }
        } else {
          // Legado
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
      } else if (isS4X) {
        // Se não houver range mas for S4X, usamos o summary pré-calculado no payload
        // Envolvemos em { current } para manter compatibilidade com kpi-generator
        summary = { 
          current: {
            total_spend: data.summary.cost,
            total_revenue: data.summary.conversionValue,
            total_conversions: data.summary.conversions,
            total_clicks: data.summary.clicks,
            total_impressions: data.summary.impressions,
            ctr: data.summary.ctr,
            cpc: data.summary.avgCpc,
            cpa: data.summary.cpa,
            roas: data.summary.roas,
          },
          previous: null,
          change: {}
        };
        google_ads_summary = summary;
        data.overview = data.dailyPerformance || []; // Fallback sem range
      }

      // 2. Busca informações do dashboard para o template
      const dashboard = await DashboardService.getDashboardById(dashboardId);

      return {
        ...data,
        overview: data.overview || [],
        google_ads: data.google_ads || [],
        meta_ads: data.meta_ads || [],
        ga4_events: data.ga4_events || [],
        audience: data.audience || [],
        search_console: data.search_console || [],
        insights: data.insights || [],
        campaigns: data.campaigns || [],
        keywords: data.keywords || [],
        summary: summary || data.summary,
        google_ads_summary: google_ads_summary || data.google_ads_summary,
        meta_ads_summary: meta_ads_summary || data.meta_ads_summary,
        source: snapshot.source_type || "google_sheets",
        lastUpdated: new Date(snapshot.imported_at).toLocaleString("pt-BR"),
        templateId: dashboard?.dashboard_type || "google_ads_s4x",
        templateVersion: dashboard?.template_version || "1.0",
        platform: dashboard?.platform || "google_ads"
      };
    }
  } catch (dbError) {
    console.error("Erro ao buscar snapshot no banco:", dbError);
  }

  // 2. Se não houver snapshot, verifica se deve usar mocks
  if (useMocks) {
    const dashboard = await DashboardService.getDashboardById(dashboardId).catch(() => null);
    const templateId = dashboard?.dashboard_type || "google_ads_s4x";

    if (templateId === "google_ads_s4x") {
      return {
        ...mockGoogleAdsS4XPayload,
        // Mantém campos legado vazios ou mapeados para evitar quebra de componentes antigos
        overview: [],
        google_ads: mockGoogleAdsS4XPayload.dailyPerformance,
        meta_ads: [],
        ga4_events: mockGa4.mockGa4Events,
        audience: mockAudience.mockAudienceChannel,
        search_console: mockSC.mockSearchConsoleQueries,
        insights: mockInsights.mockInsights,
        source: "mock",
        templateId: "google_ads_s4x",
        templateVersion: "1.0",
        platform: "google_ads"
      };
    }

    return {
      overview: mockOverview.mockOverviewRows,
      google_ads: mockGoogleAds.mockGoogleAdsDaily,
      meta_ads: mockMetaAds.mockMetaAdsDaily,
      campaigns: [
        ...mockGoogleAds.mockGoogleAdsCampaigns,
        ...mockMetaAds.mockMetaAdsCampaigns
      ],
      dailyPerformance: mockGoogleAds.mockGoogleAdsDaily, // Mapeia para suportar S4X
      ga4_events: mockGa4.mockGa4Events,
      audience: mockAudience.mockAudienceChannel,
      search_console: mockSC.mockSearchConsoleQueries,
      keywords: mockGoogleAds.mockKeywords,
      insights: mockInsights.mockInsights,
      source: "mock",
      templateId: "google_ads_s4x",
      templateVersion: "1.0",
      platform: "google_ads"
    };
  }

  return null;
}
