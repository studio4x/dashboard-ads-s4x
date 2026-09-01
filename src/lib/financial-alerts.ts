import type { AdsFinancialStatus } from "@/lib/ads-financial";

export type FinancialAlertDecision =
  | "healthy"
  | "crossed_below_threshold"
  | "still_below_suppressed"
  | "repeat_alert_due"
  | "financial_value_unavailable"
  | "alert_disabled";

export type FinancialAlertState = "unknown" | "healthy" | "below_threshold";

export type AlertableFinancialAmount = {
  amount: number;
  label: string;
  sourceField: "availableAmount" | "remainingUntilLimit" | "accountBudgetRemaining";
};

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeFinancialAccountId(value: unknown) {
  return String(value || "").trim().replace(/^act_/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Returns only values that can safely represent availability / remaining budget.
 * outstandingBalance is deliberately ignored because it may represent billing due.
 */
export function resolveAlertableFinancialAmount(status: AdsFinancialStatus | null | undefined): AlertableFinancialAmount | null {
  if (!status || status.status !== "available" || status.supported !== true) return null;

  const availableAmount = finite(status.availableAmount);
  if (availableAmount !== null) {
    return {
      amount: availableAmount,
      label: status.availableAmountLabel || "Saldo disponível",
      sourceField: "availableAmount",
    };
  }

  const remainingUntilLimit = finite(status.remainingUntilLimit);
  if (remainingUntilLimit !== null) {
    return {
      amount: remainingUntilLimit,
      label: status.provider === "google_ads" ? "Orçamento de conta restante" : "Disponível até o limite",
      sourceField: "remainingUntilLimit",
    };
  }

  const accountBudgetRemaining = finite(status.accountBudgetRemaining);
  if (accountBudgetRemaining !== null) {
    return {
      amount: accountBudgetRemaining,
      label: "Orçamento de conta restante",
      sourceField: "accountBudgetRemaining",
    };
  }

  return null;
}

export function evaluateFinancialAlertState(params: {
  enabled: boolean;
  amount: number | null;
  threshold: number;
  previousState?: FinancialAlertState | null;
  lastNotifiedAt?: string | Date | null;
  observedAt?: string | Date;
  repeatIntervalHours?: number;
}) {
  const observedAt = params.observedAt ? new Date(params.observedAt) : new Date();
  const previousState: FinancialAlertState = params.previousState || "unknown";
  const repeatIntervalHours = Math.max(1, Number(params.repeatIntervalHours || 24));

  if (!params.enabled) {
    return { decision: "alert_disabled" as FinancialAlertDecision, shouldAlert: false, newState: previousState };
  }
  if (params.amount === null || !Number.isFinite(params.amount)) {
    return { decision: "financial_value_unavailable" as FinancialAlertDecision, shouldAlert: false, newState: previousState };
  }
  if (!Number.isFinite(params.threshold) || params.threshold < 0) {
    throw new Error("threshold inválido");
  }
  if (params.amount >= params.threshold) {
    return { decision: "healthy" as FinancialAlertDecision, shouldAlert: false, newState: "healthy" as FinancialAlertState };
  }
  if (previousState !== "below_threshold") {
    return { decision: "crossed_below_threshold" as FinancialAlertDecision, shouldAlert: true, newState: "below_threshold" as FinancialAlertState };
  }

  const lastNotifiedAt = params.lastNotifiedAt ? new Date(params.lastNotifiedAt) : null;
  const elapsedMs = lastNotifiedAt && !Number.isNaN(lastNotifiedAt.getTime())
    ? observedAt.getTime() - lastNotifiedAt.getTime()
    : Number.POSITIVE_INFINITY;
  const repeatMs = repeatIntervalHours * 60 * 60 * 1000;

  if (elapsedMs >= repeatMs) {
    return { decision: "repeat_alert_due" as FinancialAlertDecision, shouldAlert: true, newState: "below_threshold" as FinancialAlertState };
  }
  return { decision: "still_below_suppressed" as FinancialAlertDecision, shouldAlert: false, newState: "below_threshold" as FinancialAlertState };
}
