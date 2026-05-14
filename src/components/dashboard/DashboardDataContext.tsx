"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getDateRangePreset, formatDateISO, DateRangePreset } from "@/lib/dashboard/date-utils";

interface DashboardData {
  overview: any[];
  google_ads: any[];
  meta_ads: any[];
  campaigns: any[];
  ga4_events: any[];
  audience: any[];
  search_console: any[];
  keywords: any[];
  insights: any[];
  summary?: any;
  google_ads_summary?: any;
  meta_ads_summary?: any;
  source: "mock" | "google_sheets";
  lastUpdated?: string;
}

interface DashboardDataContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  needsImport: boolean;
  from: string;
  to: string;
  rangePreset: DateRangePreset;
  updateRange: (preset: DateRangePreset) => void;
  refresh: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

interface DashboardDataProviderProps {
  children: React.ReactNode;
  overrideDashboardId?: string;
  shareToken?: string;
}

export function DashboardDataProvider({ children, overrideDashboardId, shareToken }: DashboardDataProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const dashboardId = overrideDashboardId || (params.dashboardId as string);

  // 1. Resolve o período inicial (URL ou Default)
  const [rangePreset, setRangePreset] = useState<DateRangePreset>(
    (searchParams.get("period") as DateRangePreset) || "last_30_days"
  );

  const range = getDateRangePreset(rangePreset);
  const from = searchParams.get("from") || formatDateISO(range.from);
  const to = searchParams.get("to") || formatDateISO(range.to);
  
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
      let url = `/api/dashboards/${dashboardId}/data?from=${from}&to=${to}`;
      if (shareToken) {
        url += `&share_token=${shareToken}`;
      }
      const response = await fetch(url);
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
  }, [dashboardId, from, to]);

  const updateRange = (preset: DateRangePreset) => {
    const newRange = getDateRangePreset(preset);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    params.set("from", formatDateISO(newRange.from));
    params.set("to", formatDateISO(newRange.to));
    
    setRangePreset(preset);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardDataContext.Provider value={{ 
      data, 
      loading, 
      error, 
      needsImport, 
      from, 
      to, 
      rangePreset, 
      updateRange, 
      refresh: fetchData 
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
