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
import { MOCK_META_ADS_S4X_PAYLOAD } from "@/data/mock-sheet-meta-ads-s4x";
import { getDefaultTemplateMetricConfig, normalizeTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";

import { DashboardAggregator } from "./dashboard-aggregator";
import { parseISO } from "date-fns";
import { isDateInRange } from "./date-utils";
import { DashboardTemplateCatalogService } from "@/services/dashboard-template-catalog-service";
import { getVisiblePages } from "@/lib/dashboard/templates";

function resolveTemplateBaseId(dashboard: any, templateDefinition: any) {
  return (
    templateDefinition?.sheetTemplateId
    || dashboard?.template_config?.templateId
    || dashboard?.dashboard_type
    || "google_ads_s4x"
  );
}

function extractAvailableDateRange(data: any): { from: string; to: string } | null {
  const candidates = [
    data?.dailyPerformance,
    data?.overview,
    data?.google_ads,
    data?.meta_ads,
    data?.campaigns,
    data?.keywords,
    data?.searchTerms,
    data?.adGroups,
    data?.adsAndAssets,
  ];

  const dates: string[] = [];
  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      const raw = String(row?.date || row?.data || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) dates.push(raw);
    }
  }

  if (dates.length === 0) return null;
  dates.sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

export async function getDashboardData(
  dashboardId: string,
  options?: { from?: string, to?: string, bypassRls?: boolean }
) {
  const useMocks = process.env.GOOGLE_SHEETS_USE_MOCKS === "true";
  const range = options?.from && options?.to ? { 
    from: parseISO(options.from), 
    to: parseISO(options.to) 
  } : null;

  // 1. Tenta buscar snapshot no Banco de Dados (Supabase) primeiro
  try {
    const snapshot = await DashboardService.getLatestSnapshot(dashboardId, { bypassRls: options?.bypassRls });
    if (snapshot && snapshot.payload_json) {
      let data = snapshot.payload_json;
      const availableDateRange = extractAvailableDateRange(data);
      
      // Se houver range, calculamos os resumos comparativos e filtramos os dados
      let summary = null;
      let google_ads_summary = null;
      let meta_ads_summary = null;

      // Identifica se é o novo payload S4X
      const isS4X = data.diagnostics?.snapshotVersion?.startsWith("google_ads_s4x");
      const isMetaS4X = data.diagnostics?.snapshotVersion?.startsWith("meta_ads_s4x");
      const isIntegratedS4X = data.diagnostics?.snapshotVersion?.startsWith("google_meta_ads_s4x");
      
      if (range) {
        if (isS4X) {
          // No novo payload, usamos dailyPerformance para o sumário geral
          if (data.dailyPerformance) {
            google_ads_summary = DashboardAggregator.compare(data.dailyPerformance, range);
            data.dailyPerformance = data.dailyPerformance.filter((row: any) => isDateInRange(row.date, range));
            data.overview = data.dailyPerformance; // Garantir que overview tenha dados para gráficos
            summary = google_ads_summary; // O sumário geral do dashboard é o do Google Ads no template S4X
          }
        } else if (isMetaS4X) {
          if (data.dailyPerformance) {
            meta_ads_summary = DashboardAggregator.compare(data.dailyPerformance, range);
            data.dailyPerformance = data.dailyPerformance.filter((row: any) => isDateInRange(row.date, range));
            data.overview = data.dailyPerformance;
            summary = meta_ads_summary;
          }
        } else if (isIntegratedS4X) {
          if (data.dailyPerformance) {
            summary = DashboardAggregator.compare(data.dailyPerformance, range);
            data.dailyPerformance = data.dailyPerformance.filter((row: any) => isDateInRange(row.date, range));
            data.overview = data.dailyPerformance;
          }
          if (data.google_ads) {
            google_ads_summary = DashboardAggregator.compare(data.google_ads, range);
            data.google_ads = data.google_ads.filter((row: any) => isDateInRange(row.date, range));
          }
          if (data.meta_ads) {
            meta_ads_summary = DashboardAggregator.compare(data.meta_ads, range);
            data.meta_ads = data.meta_ads.filter((row: any) => isDateInRange(row.date, range));
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
      } else if (isMetaS4X) {
        summary = { 
          current: {
            total_spend: data.summary.cost,
            total_revenue: 0,
            total_conversions: data.summary.conversions,
            total_clicks: data.summary.clicks,
            total_impressions: data.summary.impressions,
            reach: data.summary.reach,
            postEngagement: data.summary.postEngagement,
            ctr: data.summary.ctr,
            cpc: data.summary.avgCpc,
            cpa: data.summary.cpa,
            roas: 0,
          },
          previous: null,
          change: {}
        };
        meta_ads_summary = summary;
        data.overview = data.dailyPerformance || [];
      } else if (isIntegratedS4X) {
        summary = {
          current: {
            total_spend: data.summary.cost || 0,
            total_revenue: data.summary.conversionValue || 0,
            total_conversions: data.summary.conversions || 0,
            total_clicks: data.summary.clicks || 0,
            total_impressions: data.summary.impressions || 0,
            reach: data.summary.reach || 0,
            postEngagement: data.summary.postEngagement || 0,
            ctr: data.summary.ctr || 0,
            cpc: data.summary.avgCpc || 0,
            cpa: data.summary.cpa || 0,
            roas: data.summary.roas || 0,
          },
          previous: null,
          change: {}
        };
        google_ads_summary = data.google_ads_summary || null;
        meta_ads_summary = data.meta_ads_summary || null;
        data.overview = data.dailyPerformance || [];
      }

      // 2. Busca informações do dashboard para o template
      const dashboard = await DashboardService.getDashboardById(dashboardId, { bypassRls: options?.bypassRls });
      const templateDefinition = await DashboardTemplateCatalogService.getTemplateDefinition(dashboard?.dashboard_type || "google_ads_s4x").catch(() => null);
      const templateBaseId = resolveTemplateBaseId(dashboard, templateDefinition);
      const templatePageKeys = templateDefinition?.visiblePages?.length ? templateDefinition.visiblePages : getVisiblePages(templateBaseId);

      return {
        ...data,
        overview: data.overview && data.overview.length > 0 ? data.overview : data.dailyPerformance || [],
        google_ads: isIntegratedS4X
          ? (data.google_ads || [])
          : (data.google_ads && data.google_ads.length > 0 ? data.google_ads : data.dailyPerformance || []),
        meta_ads: isIntegratedS4X
          ? (data.meta_ads || [])
          : (data.meta_ads || []),
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
        lastUpdated: `${new Date(snapshot.imported_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (UTC-3)`,
        templateId: templateBaseId,
        templateBaseId,
        templateVersion: templateDefinition?.version || dashboard?.template_version || "1.0",
        platform: dashboard?.platform || "google_ads",
        metaObjectives: dashboard?.meta_objectives || data?.metaObjectives || [],
        metaPrimaryObjective: dashboard?.meta_primary_objective || data?.metaPrimaryObjective || null,
        templateConfig: normalizeTemplateMetricConfig(
          templateDefinition?.metricConfig || dashboard?.template_config || data?.templateConfig,
          templateBaseId,
          dashboard?.meta_objectives || data?.metaObjectives || [],
          dashboard?.meta_primary_objective || data?.metaPrimaryObjective || null
        ),
        templatePageKeys,
        metaValidationStatus: dashboard?.meta_validation_status || data?.metaValidationStatus || "not_configured",
        metaValidationNotes: dashboard?.meta_validation_notes || data?.metaValidationNotes || {},
        availableDateRange,
      };
    }
  } catch (dbError) {
    console.error("Erro ao buscar snapshot no banco:", dbError);
  }

  // 2. Se não houver snapshot, verifica se deve usar mocks
  if (useMocks) {
    const dashboard = await DashboardService.getDashboardById(dashboardId, { bypassRls: options?.bypassRls }).catch(() => null);
    const templateId = dashboard?.dashboard_type || "google_ads_s4x";
    const templateDefinition = await DashboardTemplateCatalogService.getTemplateDefinition(templateId).catch(() => null);
    const templateBaseId = resolveTemplateBaseId(dashboard, templateDefinition);
    const templatePageKeys = templateDefinition?.visiblePages?.length ? templateDefinition.visiblePages : getVisiblePages(templateBaseId);

    if (templateId === "google_ads_s4x") {
      const availableDateRange = extractAvailableDateRange(mockGoogleAdsS4XPayload);
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
        templateBaseId: "google_ads_s4x",
        templateVersion: templateDefinition?.version || "1.0",
        platform: "google_ads",
        templateConfig: getDefaultTemplateMetricConfig("google_ads_s4x"),
        templatePageKeys: getVisiblePages("google_ads_s4x"),
        availableDateRange,
      };
    }

    if (templateId === "meta_ads_s4x") {
      let mockPayload = JSON.parse(JSON.stringify(MOCK_META_ADS_S4X_PAYLOAD));
      let metaSummary = null;
      if (range) {
        metaSummary = DashboardAggregator.compare(mockPayload.dailyPerformance, range);
        mockPayload.dailyPerformance = mockPayload.dailyPerformance.filter((row: any) => isDateInRange(row.date, range));
      } else {
        metaSummary = {
          current: {
            total_spend: mockPayload.summary.cost,
            total_revenue: 0,
            total_conversions: mockPayload.summary.conversions,
            total_clicks: mockPayload.summary.clicks,
            total_impressions: mockPayload.summary.impressions,
            reach: mockPayload.summary.reach,
            postEngagement: mockPayload.summary.postEngagement,
            ctr: mockPayload.summary.ctr,
            cpc: mockPayload.summary.avgCpc,
            cpa: mockPayload.summary.cpa,
            roas: 0,
          },
          previous: null,
          change: {}
        };
      }
      return {
        ...mockPayload,
        overview: mockPayload.dailyPerformance,
        meta_ads: mockPayload.dailyPerformance,
        google_ads: [],
        ga4_events: [],
        audience: [],
        search_console: [],
        insights: [],
        campaigns: [],
        keywords: [],
        summary: metaSummary,
        meta_ads_summary: metaSummary,
        google_ads_summary: null,
        source: "mock",
        templateId: "meta_ads_s4x",
        templateBaseId: "meta_ads_s4x",
        templateVersion: templateDefinition?.version || "1.0",
        platform: "meta_ads",
        metaObjectives: mockPayload.metaObjectives || [],
        metaPrimaryObjective: mockPayload.metaPrimaryObjective || null,
        templateConfig: getDefaultTemplateMetricConfig(
          "meta_ads_s4x",
          mockPayload.metaObjectives || [],
          mockPayload.metaPrimaryObjective || null
        ),
        metaValidationStatus: mockPayload.metaValidationStatus || "not_configured",
        metaValidationNotes: mockPayload.metaValidationNotes || {},
        templatePageKeys: getVisiblePages("meta_ads_s4x"),
        availableDateRange: extractAvailableDateRange(mockPayload),
      };
    }

    const legacyMock = {
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
      templateId: templateBaseId,
      templateBaseId,
      templateVersion: "1.0",
      platform: dashboard?.platform || (templateId.includes("google_meta") ? "mixed" : templateId.includes("meta") ? "meta_ads" : "google_ads"),
      templateConfig: templateDefinition?.metricConfig || dashboard?.template_config || getDefaultTemplateMetricConfig(templateBaseId as any),
      templatePageKeys,
    } as any;

    return {
      ...legacyMock,
      availableDateRange: extractAvailableDateRange(legacyMock),
    };
  }

  return null;
}
