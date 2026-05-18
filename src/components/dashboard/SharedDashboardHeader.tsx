"use client";

import React from "react";
import { CalendarDays, Info } from "lucide-react";
import { DateRangeSelector } from "./DateRangeSelector";
import { useDashboard } from "./DashboardDataContext";
import { cn } from "@/lib/utils";

interface SharedDashboardHeaderProps {
  clientName?: string;
  dashboardName?: string;
  pageTitle: string;
  pageSubtitle?: string;
}

export function SharedDashboardHeader({
  clientName,
  dashboardName,
  pageTitle,
  pageSubtitle
}: SharedDashboardHeaderProps) {
  const { rangePreset, updateRange, data } = useDashboard();

  const metricsSource = data?.config?.Fonte || data?.config?.fonte || (data?.source === "mock" ? "Mocks" : "Google Sheets");
  const accountId = data?.meta?.Conta_ID || data?.meta?.conta_id || data?.meta?.Conta || null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Logo / Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
             <div className="text-2xl sm:text-3xl font-black tracking-tighter text-blue-600">
               Studio 4x
             </div>
             <div className="hidden sm:block h-12 w-px bg-slate-200" />
             <div className="flex flex-col">
               <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                 {pageTitle}
               </h1>
               <p className="text-xs sm:text-sm text-slate-500 font-medium">
                 {clientName} • {dashboardName}
               </p>
               
               {/* Badges de Fonte e Conta */}
               <div className="flex items-center gap-2 mt-1 flex-wrap">
                 {accountId && (
                   <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                     ID Conta Google: {accountId}
                   </span>
                 )}
               </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status Indicator */}
          {data && (
            <div className="hidden lg:flex flex-col items-end mr-4">
               <div className={cn(
                 "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                 data.source === "mock" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
               )}>
                 {data.source === "mock" ? "Modo Teste" : "Dados Reais"}
               </div>
               <span className="text-[10px] text-slate-400">
                 {data.lastUpdated ? `Sincronizado: ${data.lastUpdated}` : "Sincronizando..."}
               </span>
            </div>
          )}

          {/* Period Selector */}
          <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm w-full sm:w-auto min-w-[240px]">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-400" />
              <DateRangeSelector 
                currentPreset={rangePreset} 
                onPresetChange={updateRange}
                variant="minimal"
              />
            </div>
          </div>
          
          <div className="flex lg:hidden items-center gap-2 px-1">
             <Info size={14} className="text-blue-600" />
             <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Link Privado</span>
          </div>
        </div>
      </div>
      
      {/* Visual Subtitle / Breadcrumb for mobile */}
      {pageSubtitle && (
        <div className="bg-slate-50 px-4 sm:px-8 py-2 border-b border-slate-200">
          <p className="text-xs text-slate-500 font-medium">{pageSubtitle}</p>
        </div>
      )}
    </header>
  );
}
