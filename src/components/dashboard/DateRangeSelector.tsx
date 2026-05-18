"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { DateRangePreset, getDateRangePreset } from "@/lib/dashboard/date-utils";
import { cn } from "@/lib/utils";

interface DateRangeSelectorProps {
  currentPreset?: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  className?: string;
  variant?: "default" | "minimal";
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
  variant = "default",
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRange = getDateRangePreset(currentPreset);

  const isMinimal = variant === "minimal";

  const formatDateRange = (from: Date, to: Date) => {
    const fmt = (d: Date) => {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };
    return `${fmt(from)} a ${fmt(to)}`;
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 transition-colors",
          isMinimal 
            ? "px-0 py-0 bg-transparent text-sm font-semibold text-slate-700"
            : "px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
        )}
      >
        {!isMinimal && <Calendar size={16} className="text-slate-400" />}
        <span>
          {currentRange.label}{" "}
          <span className={cn("text-xs font-normal ml-1", isMinimal ? "text-slate-400" : "text-slate-500")}>
            ({formatDateRange(currentRange.from, currentRange.to)})
          </span>
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-fade-in">
            <div className="p-1.5 flex flex-col gap-1">
              {presets.map((preset) => {
                const range = getDateRangePreset(preset.value);
                const isSelected = currentPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => {
                      onPresetChange(preset.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-start px-3 py-1.5 rounded-lg text-left transition-colors w-full",
                      isSelected 
                        ? "bg-blue-50 text-blue-700 font-semibold" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium">{preset.label}</span>
                      {isSelected && <Check size={14} className="text-blue-700" />}
                    </div>
                    <span className={cn("text-[10px] font-normal mt-0.5", isSelected ? "text-blue-500" : "text-slate-400")}>
                      {formatDateRange(range.from, range.to)}
                    </span>
                  </button>
                );
              })}
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
