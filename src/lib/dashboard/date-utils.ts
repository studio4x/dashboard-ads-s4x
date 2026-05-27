import { 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  format, 
  parseISO, 
  isWithinInterval,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from "date-fns";

export type DateRangePreset = 
  | "last_7_days" 
  | "last_14_days" 
  | "last_30_days" 
  | "last_week"
  | "all_time"
  | "this_month" 
  | "last_month" 
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export function getDateRangePreset(
  preset: DateRangePreset, 
  customRange?: { from: Date, to: Date },
  includeToday = false
): DateRange {
  const today = new Date();
  const referenceDate = includeToday ? today : subDays(today, 1);
  
  switch (preset) {
    case "last_7_days":
      return {
        from: subDays(referenceDate, 6),
        to: referenceDate,
        label: "Últimos 7 dias"
      };
    case "last_14_days":
      return {
        from: subDays(referenceDate, 13),
        to: referenceDate,
        label: "Últimos 14 dias"
      };
    case "last_30_days":
      return {
        from: subDays(referenceDate, 29),
        to: referenceDate,
        label: "Últimos 30 dias"
      };
    case "last_week": {
      const weekRef = subWeeks(referenceDate, 1);
      return {
        from: startOfWeek(weekRef, { weekStartsOn: 1 }),
        to: endOfWeek(weekRef, { weekStartsOn: 1 }),
        label: "Semana passada (Seg-Dom)"
      };
    }
    case "all_time":
      if (customRange) {
        return {
          ...customRange,
          label: "Todo o período"
        };
      }
      return getDateRangePreset("last_30_days", undefined, includeToday);
    case "this_month":
      return {
        from: startOfMonth(referenceDate),
        to: referenceDate,
        label: "Mês atual"
      };
    case "last_month": {
      const lastMonth = subMonths(referenceDate, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: "Mês anterior"
      };
    }
    case "custom":
      if (customRange) {
        return {
          ...customRange,
          label: `${format(customRange.from, "dd/MM/yyyy")} - ${format(customRange.to, "dd/MM/yyyy")}`
        };
      }
      return getDateRangePreset("last_30_days", undefined, includeToday);
    default:
      return getDateRangePreset("last_30_days", undefined, includeToday);
  }
}

/**
 * Calcula o período anterior equivalente para comparação.
 */
export function getPreviousPeriod(currentRange: { from: Date, to: Date }): { from: Date, to: Date } {
  const durationDays = Math.ceil((currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return {
    from: subDays(currentRange.from, durationDays),
    to: subDays(currentRange.to, durationDays)
  };
}

export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isDateInRange(dateStr: string, range: { from: Date, to: Date }): boolean {
  try {
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start: range.from, end: range.to });
  } catch {
    return false;
  }
}
