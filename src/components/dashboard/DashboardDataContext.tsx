"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDateRangePreset, formatDateISO, DateRangePreset } from "@/lib/dashboard/date-utils";
import type { DashboardTemplateMetricConfig } from "@/lib/dashboard/template-metric-config";

interface DashboardData {
  // Legado / Geral (Mantidos como não-opcionais para evitar quebra de componentes existentes)
  overview: any[];
  google_ads: any[];
  meta_ads: any[];
  ga4_events: any[];
  audience: any[];
  search_console: any[];
  insights: any[];
  campaigns: any[];
  keywords: any[];
  
  // Google Ads S4X
  dailyPerformance?: any[];
  adGroups?: any[];
  searchTerms?: any[];
  negativeKeywords?: any[];
  adsAndAssets?: any[];
  meta?: any;
  config?: any;
  diagnostics?: any;
  googlePayload?: any;
  metaPayload?: any;

  // Sumários e Metadados
  summary?: any;
  google_ads_summary?: any;
  meta_ads_summary?: any;
  templateId?: string;
  templateBaseId?: string;
  templateVersion?: string;
  platform?: string;
  metaObjectives?: string[];
  metaPrimaryObjective?: string | null;
  metaValidationStatus?: "not_configured" | "ok" | "missing_metrics";
  metaValidationNotes?: Record<string, unknown>;
  templateConfig?: DashboardTemplateMetricConfig;
  templatePageKeys?: string[];
  viewerRole?: string;
  source: "mock" | "google_sheets" | "google_sheets_cache" | "meta_ads";
  lastUpdated?: string;
  availableDateRange?: { from: string; to: string } | null;
}

interface DashboardDataContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  needsImport: boolean;
  from: string;
  to: string;
  rangePreset: DateRangePreset;
  includeToday: boolean;
  updateRange: (
    preset: DateRangePreset, 
    customDates?: { from: Date; to: Date },
    includeTodayOverride?: boolean
  ) => void;
  refresh: () => Promise<void>;
  isShared: boolean;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

interface DashboardDataProviderProps {
  children: React.ReactNode;
  overrideDashboardId?: string;
  shareToken?: string;
}

export function DashboardDataProvider({ children, overrideDashboardId, shareToken }: DashboardDataProviderProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const dashboardId = overrideDashboardId || (params.dashboardId as string);

  // Derive presets directly from URL search params (prevents state-sync issues)
  const rangePreset = (searchParams.get("period") as DateRangePreset) || "last_30_days";
  const includeToday = searchParams.get("include_today") === "true";

  // We read the query parameters:
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");

  // Let's resolve the actual start and end dates:
  let customDates: { from: Date; to: Date } | undefined = undefined;
  if (urlFrom && urlTo) {
    const parseDate = (dStr: string) => {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    customDates = {
      from: parseDate(urlFrom),
      to: parseDate(urlTo)
    };
  }

  const range = getDateRangePreset(rangePreset, customDates, includeToday);
  const from = urlFrom || formatDateISO(range.from);
  const to = urlTo || formatDateISO(range.to);
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsImport, setNeedsImport] = useState(false);

  const fetchData = useCallback(async () => {
    if (!dashboardId) return;
    
    setLoading(true);
    setError(null);
    setNeedsImport(false);
    
    try {
      const url = `/api/dashboards/${dashboardId}/data?from=${from}&to=${to}`;
      const response = await fetch(url, {
        headers: shareToken ? { "x-share-token": shareToken } : undefined,
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404 && result.needsImport) {
          setNeedsImport(true);
        } else {
          setError(result.error || "Erro ao carregar dados do dashboard.");
        }
        setData(null);
      } else {
        setData(result);
      }
    } catch (err: any) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }, [dashboardId, from, to, shareToken]);

  const updateRange = (
    preset: DateRangePreset, 
    customDatesOverride?: { from: Date; to: Date },
    includeTodayOverride?: boolean
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    
    const activeIncludeToday = includeTodayOverride !== undefined ? includeTodayOverride : includeToday;
    params.set("include_today", activeIncludeToday ? "true" : "false");
    
    if (customDatesOverride && (preset === "custom" || preset === "all_time")) {
      params.set("from", formatDateISO(customDatesOverride.from));
      params.set("to", formatDateISO(customDatesOverride.to));
    } else if (preset === "custom" || preset === "all_time") {
      // Preserve current from/to if we are just switching/saving custom without new parameters
      params.set("from", from);
      params.set("to", to);
    } else {
      const newRange = getDateRangePreset(preset, undefined, activeIncludeToday);
      params.set("from", formatDateISO(newRange.from));
      params.set("to", formatDateISO(newRange.to));
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when user changes tab/page inside the same dashboard.
  useEffect(() => {
    fetchData();
  }, [pathname, fetchData]);

  return (
    <DashboardDataContext.Provider value={{ 
      data, 
      loading, 
      error, 
      needsImport, 
      from, 
      to, 
      rangePreset, 
      includeToday,
      updateRange, 
      refresh: fetchData,
      isShared: !!shareToken
    }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error("useDashboard deve ser usado dentro de um DashboardDataProvider");
  }
  return context;
}
