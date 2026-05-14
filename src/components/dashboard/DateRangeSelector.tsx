"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { DateRangePreset, getDateRangePreset } from "@/lib/dashboard/date-utils";
import { cn } from "@/lib/utils";

interface DateRangeSelectorProps {
  currentPreset?: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: "last_7_days", label: "Últimos 7 dias" },
  { value: "last_14_days", label: "Últimos 14 dias" },
  { value: "last_30_days", label: "Últimos 30 dias" },
  { value: "this_month", label: "Mês atual" },
  { value: "last_month", label: "Mês anterior" },
];

export function DateRangeSelector({
  currentPreset = "last_30_days",
  onPresetChange,
  className,
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRange = getDateRangePreset(currentPreset);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Calendar size={16} className="text-slate-400" />
        <span>{currentRange.label}</span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-fade-in">
            <div className="p-1.5 flex flex-col">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    onPresetChange(preset.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    currentPreset === preset.value 
                      ? "bg-blue-50 text-blue-700 font-semibold" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {preset.label}
                  {currentPreset === preset.value && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-2 bg-slate-50">
              <button 
                disabled
                className="w-full text-left px-2 py-1.5 text-xs text-slate-400 cursor-not-allowed"
              >
                Período personalizado (Breve)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
