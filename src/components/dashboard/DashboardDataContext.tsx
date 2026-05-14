"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "next/navigation";

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
  source: "mock" | "google_sheets";
  lastUpdated?: string;
}

interface DashboardDataContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  needsImport: boolean;
  refresh: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsImport, setNeedsImport] = useState(false);

  const fetchData = async () => {
    if (!dashboardId) return;
    
    setLoading(true);
    setError(null);
    setNeedsImport(false);
    
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/data`);
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
  };

  useEffect(() => {
    fetchData();
  }, [dashboardId]);

  return (
    <DashboardDataContext.Provider value={{ data, loading, error, needsImport, refresh: fetchData }}>
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
