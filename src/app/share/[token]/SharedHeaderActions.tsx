"use client";

import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";

export function SharedHeaderActions() {
  const { rangePreset, includeToday, updateRange, from, to } = useDashboard();
  
  return (
    <div className="flex items-center gap-4">
      <DateRangeSelector 
        currentPreset={rangePreset} 
        onPresetChange={updateRange} 
        includeToday={includeToday}
        from={from}
        to={to}
      />
      <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-xs text-slate-400">Modo Leitura</span>
        <span className="text-xs font-medium text-slate-600">Compartilhamento Seguro</span>
      </div>
    </div>
  );
}
