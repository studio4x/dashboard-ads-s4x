"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { DateRangePreset, getDateRangePreset, formatDateISO } from "@/lib/dashboard/date-utils";
import { cn } from "@/lib/utils";

interface DateRangeSelectorProps {
  currentPreset?: DateRangePreset;
  onPresetChange: (preset: DateRangePreset, customDates?: { from: Date, to: Date }, includeTodayOverride?: boolean) => void;
  className?: string;
  variant?: "default" | "minimal";
  includeToday?: boolean;
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
  includeToday = false,
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRange = getDateRangePreset(currentPreset, undefined, includeToday);

  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");

  const isMinimal = variant === "minimal";

  // Sync date inputs only when opening dropdown or when preset or includeToday shifts.
  // This avoids resetting values on every keystroke when typing custom dates.
  useEffect(() => {
    if (isOpen) {
      const range = getDateRangePreset(currentPreset, undefined, includeToday);
      setStartDateStr(formatDateISO(range.from));
      setEndDateStr(formatDateISO(range.to));
    }
  }, [isOpen, currentPreset, includeToday]);

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
          <div 
            className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-fade-in"
            style={{ padding: "8px" }}
          >
            <div className="flex flex-col gap-1">
              {presets.map((preset) => {
                const range = getDateRangePreset(preset.value, undefined, includeToday);
                const isSelected = currentPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => {
                      onPresetChange(preset.value, undefined, includeToday);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      background: isSelected ? "#EFF6FF" : "transparent",
                      color: isSelected ? "#1D4ED8" : "#475569",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#F8FAFC";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span style={{ fontSize: "13.5px", fontWeight: isSelected ? 600 : 500 }}>
                        {preset.label}
                      </span>
                      {isSelected && <Check size={14} style={{ color: "#1D4ED8" }} />}
                    </div>
                    <span style={{ fontSize: "10.5px", marginTop: "2px", color: isSelected ? "#3B82F6" : "#94A3B8" }}>
                      {formatDateRange(range.from, range.to)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Checkbox "Incluir dados de hoje" */}
            <div style={{ borderTop: "1px solid #F1F5F9", marginTop: "6px", paddingTop: "8px", paddingBottom: "2px", paddingLeft: "12px", paddingRight: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
                <input 
                  type="checkbox" 
                  checked={includeToday} 
                  onChange={(e) => {
                    onPresetChange(currentPreset, undefined, e.target.checked);
                  }}
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "4px",
                    border: "1px solid #CBD5E1",
                    accentColor: "#2563EB",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#475569" }}>
                  Incluir dados de hoje
                </span>
              </label>
            </div>

            <div style={{ borderTop: "1px solid #E2E8F0", marginTop: "8px", paddingTop: "8px", paddingLeft: "4px", paddingRight: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "8px", paddingLeft: "8px" }}>
                Período Personalizado
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "8px", paddingRight: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "10.5px", color: "#64748B" }}>De:</label>
                  <input 
                    type="date" 
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      fontSize: "12.5px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      color: "#1E293B",
                      outline: "none"
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "10.5px", color: "#64748B" }}>Até:</label>
                  <input 
                    type="date" 
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      fontSize: "12.5px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      color: "#1E293B",
                      outline: "none"
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    if (startDateStr && endDateStr) {
                      const [sy, sm, sd] = startDateStr.split("-").map(Number);
                      const [ey, em, ed] = endDateStr.split("-").map(Number);
                      const fromDate = new Date(sy, sm - 1, sd);
                      const toDate = new Date(ey, em - 1, ed);
                      onPresetChange("custom", { from: fromDate, to: toDate }, includeToday);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#2563EB",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "center",
                    marginTop: "4px",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; }}
                >
                  Aplicar Período
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
