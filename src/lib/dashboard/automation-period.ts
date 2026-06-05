import { endOfMonth, format, startOfMonth, startOfWeek, subDays, subMonths, subWeeks, endOfWeek } from "date-fns";
import type { DateRangePreset } from "@/lib/dashboard/date-utils";

export type AutomationPeriodPreset = Exclude<DateRangePreset, "custom">;
export const AUTOMATION_TIME_ZONE = "America/Sao_Paulo";

export const AUTOMATION_PERIOD_OPTIONS: Array<{ value: AutomationPeriodPreset; label: string }> = [
  { value: "last_7_days", label: "Últimos 7 dias" },
  { value: "last_14_days", label: "Últimos 14 dias" },
  { value: "last_30_days", label: "Últimos 30 dias" },
  { value: "last_week", label: "Semana passada (Segunda a Domingo)" },
  { value: "this_month", label: "Mês atual" },
  { value: "last_month", label: "Mês anterior" },
  { value: "all_time", label: "Todo o período" },
];

export function normalizeAutomationPeriodPreset(value: unknown): AutomationPeriodPreset {
  const candidate = String(value || "").trim() as AutomationPeriodPreset;
  return AUTOMATION_PERIOD_OPTIONS.some((option) => option.value === candidate)
    ? candidate
    : "last_7_days";
}

export function getAutomationReferenceDate(referenceDate = new Date(), timeZone = AUTOMATION_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value || referenceDate.getFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value || referenceDate.getMonth() + 1);
  const day = Number(parts.find((part) => part.type === "day")?.value || referenceDate.getDate());
  return new Date(year, month - 1, day);
}

export function formatAutomationDateKey(date: Date, timeZone = AUTOMATION_TIME_ZONE) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function resolveAutomationPeriodPresetFromDays(days: unknown): AutomationPeriodPreset {
  const value = Number(days);
  if (value === 7) return "last_7_days";
  if (value === 14) return "last_14_days";
  if (value === 30) return "last_30_days";
  return "last_7_days";
}

export function resolveAutomationPeriodRange(
  preset: AutomationPeriodPreset,
  includeToday = false,
  referenceDate = new Date()
) {
  const today = referenceDate;
  const reference = includeToday ? today : subDays(today, 1);

  switch (preset) {
    case "last_7_days":
      return {
        from: subDays(reference, 6),
        to: reference,
        label: "Últimos 7 dias",
      };
    case "last_14_days":
      return {
        from: subDays(reference, 13),
        to: reference,
        label: "Últimos 14 dias",
      };
    case "last_30_days":
      return {
        from: subDays(reference, 29),
        to: reference,
        label: "Últimos 30 dias",
      };
    case "last_week": {
      const weekRef = subWeeks(reference, 1);
      return {
        from: startOfWeek(weekRef, { weekStartsOn: 1 }),
        to: endOfWeek(weekRef, { weekStartsOn: 1 }),
        label: "Semana passada (Segunda a Domingo)",
      };
    }
    case "this_month":
      return {
        from: startOfMonth(reference),
        to: reference,
        label: "Mês atual",
      };
    case "last_month": {
      const lastMonth = subMonths(reference, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: "Mês anterior",
      };
    }
    case "all_time":
    default:
      return {
        from: subDays(reference, 29),
        to: reference,
        label: "Todo o período",
      };
  }
}

export function resolveAutomationPeriodDays(
  preset: AutomationPeriodPreset,
  includeToday = false,
  referenceDate = new Date()
) {
  const range = resolveAutomationPeriodRange(preset, includeToday, referenceDate);
  const diffMs = range.to.getTime() - range.from.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(90, days));
}

export function formatAutomationPeriodSummary(
  preset: AutomationPeriodPreset,
  includeToday = false,
  referenceDate = new Date()
) {
  const range = resolveAutomationPeriodRange(preset, includeToday, referenceDate);
  const formatDate = (date: Date) => format(date, "dd/MM/yyyy");
  return `${range.label} (${formatDate(range.from)} a ${formatDate(range.to)})`;
}
