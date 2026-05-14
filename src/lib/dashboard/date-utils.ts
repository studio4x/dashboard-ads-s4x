import { 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  startOfYesterday, 
  endOfYesterday, 
  format, 
  parseISO, 
  isWithinInterval,
  subMonths
} from "date-fns";

export type DateRangePreset = 
  | "last_7_days" 
  | "last_14_days" 
  | "last_30_days" 
  | "this_month" 
  | "last_month" 
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export function getDateRangePreset(preset: DateRangePreset, customRange?: { from: Date, to: Date }): DateRange {
  const today = new Date();
  
  switch (preset) {
    case "last_7_days":
      return {
        from: subDays(today, 7),
        to: today,
        label: "Últimos 7 dias"
      };
    case "last_14_days":
      return {
        from: subDays(today, 14),
        to: today,
        label: "Últimos 14 dias"
      };
    case "last_30_days":
      return {
        from: subDays(today, 30),
        to: today,
        label: "Últimos 30 dias"
      };
    case "this_month":
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
        label: "Mês atual"
      };
    case "last_month": {
      const lastMonth = subMonths(today, 1);
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
      return getDateRangePreset("last_30_days");
    default:
      return getDateRangePreset("last_30_days");
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
