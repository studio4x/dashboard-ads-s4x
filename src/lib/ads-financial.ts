export type AdsFinancialProvider = "google_ads" | "meta_ads";

export type AdsFinancialStatusKind =
  | "available"
  | "not_available"
  | "unlimited"
  | "not_applicable"
  | "error";

export type AdsFinancialAlertStatus = "healthy" | "attention" | "critical" | "unknown";

export interface AdsFinancialStatus {
  provider: AdsFinancialProvider;
  accountId?: string | null;
  accountName?: string | null;
  currency: string | null;
  availableAmount: number | null;
  availableAmountLabel: string | null;
  outstandingBalance: number | null;
  outstandingBalanceLabel: string | null;
  spendingLimit: number | null;
  amountSpent: number | null;
  remainingUntilLimit: number | null;
  accountBudgetLimit: number | null;
  accountBudgetConsumed: number | null;
  accountBudgetRemaining: number | null;
  billingMode: string | null;
  sourceField: string | null;
  supported: boolean;
  status: AdsFinancialStatusKind;
  notes: string[];
  updatedAt: string | null;
  averageDailySpend: number | null;
  estimatedDaysRemaining: number | null;
  alertStatus: AdsFinancialAlertStatus;
}

type FinancialBase = Pick<AdsFinancialStatus, "provider" | "currency" | "updatedAt"> & Partial<AdsFinancialStatus>;

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function read(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
  }
  return null;
}

function round(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function microsToCurrency(valueInMicros: unknown) {
  const parsed = finiteNumber(valueInMicros);
  return parsed === null ? 0 : parsed / 1_000_000;
}

/** Meta returns these account money fields in the account currency, not Google-style micros. */
export function metaMoneyToCurrency(valueInAccountCurrency: unknown) {
  return finiteNumber(valueInAccountCurrency);
}

export function calculateAverageDailySpend(rows: unknown[], days = 7) {
  const validRows = rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
  const dates = validRows
    .map((row) => String(row.date || "").slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  if (!dates.length || days <= 0) return null;

  const latest = new Date(`${dates[dates.length - 1]}T12:00:00Z`);
  latest.setUTCDate(latest.getUTCDate() - (days - 1));
  const start = latest.toISOString().slice(0, 10);
  const daily = new Map<string, number>();
  for (const row of validRows) {
    const date = String(row.date || "").slice(0, 10);
    if (date < start || date > dates[dates.length - 1]) continue;
    const cost = finiteNumber(row.cost);
    if (cost !== null && cost > 0) daily.set(date, (daily.get(date) || 0) + cost);
  }
  const positiveDays = Array.from(daily.values()).filter((value) => value > 0);
  return positiveDays.length ? round(positiveDays.reduce((sum, value) => sum + value, 0) / positiveDays.length, 4) : null;
}

export function calculateEstimatedDaysRemaining(remainingAmount: unknown, averageDailySpend: unknown) {
  const remaining = finiteNumber(remainingAmount);
  const average = finiteNumber(averageDailySpend);
  if (remaining === null) return null;
  if (remaining <= 0) return 0;
  if (average === null || average <= 0) return null;
  return round(remaining / average, 1);
}

export function deriveFinancialAlertStatus(estimatedDaysRemaining: number | null): AdsFinancialAlertStatus {
  if (estimatedDaysRemaining === null) return "unknown";
  if (estimatedDaysRemaining <= 3) return "critical";
  if (estimatedDaysRemaining <= 7) return "attention";
  return "healthy";
}

function finish(base: FinancialBase, values: Partial<AdsFinancialStatus>): AdsFinancialStatus {
  const result = {
    provider: base.provider,
    accountId: values.accountId ?? null,
    accountName: values.accountName ?? null,
    currency: base.currency ?? null,
    availableAmount: null,
    availableAmountLabel: null,
    outstandingBalance: null,
    outstandingBalanceLabel: null,
    spendingLimit: null,
    amountSpent: null,
    remainingUntilLimit: null,
    accountBudgetLimit: null,
    accountBudgetConsumed: null,
    accountBudgetRemaining: null,
    billingMode: null,
    sourceField: null,
    supported: false,
    status: "not_available" as AdsFinancialStatusKind,
    notes: [],
    updatedAt: base.updatedAt ?? null,
    averageDailySpend: null,
    estimatedDaysRemaining: null,
    alertStatus: "unknown" as AdsFinancialAlertStatus,
    ...values,
  };
  result.estimatedDaysRemaining = result.estimatedDaysRemaining ?? calculateEstimatedDaysRemaining(
    result.remainingUntilLimit ?? result.accountBudgetRemaining ?? result.availableAmount,
    result.averageDailySpend,
  );
  result.alertStatus = result.alertStatus === "unknown"
    ? deriveFinancialAlertStatus(result.estimatedDaysRemaining)
    : result.alertStatus;
  return result;
}

export function buildGoogleAdsFinancialStatus(params: {
  rows?: unknown[];
  currency?: string | null;
  updatedAt?: string | null;
  averageDailySpend?: number | null;
  error?: string | null;
  accountId?: string | null;
  accountName?: string | null;
}): AdsFinancialStatus {
  const base = { provider: "google_ads" as const, currency: params.currency || null, updatedAt: params.updatedAt || null };
  if (params.error) {
    return finish(base, {
      accountId: params.accountId,
      accountName: params.accountName,
      status: "error",
      notes: [`Consulta de orçamento de conta indisponível: ${params.error}`],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }

  const rows = (params.rows || [])
    .map((row) => row && typeof row === "object" ? ((row as Record<string, unknown>).accountBudget || row) : row)
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
  const budget = rows.find((row) => String(read(row, "status") || "").toUpperCase() === "APPROVED") || rows[0];
  if (!budget) {
    return finish(base, {
      accountId: params.accountId,
      accountName: params.accountName,
      status: "not_available",
      notes: ["Nenhum AccountBudget aplicável foi disponibilizado para esta conta."],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }

  const limitType = String(read(budget, "adjustedSpendingLimitType", "adjusted_spending_limit_type") || "").toUpperCase();
  if (limitType === "INFINITE") {
    return finish(base, {
      accountId: params.accountId,
      accountName: params.accountName,
      billingMode: "account_budget",
      sourceField: "account_budget.adjusted_spending_limit_type",
      supported: true,
      status: "unlimited",
      notes: ["O AccountBudget informa limite de gastos ilimitado."],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }

  const limit = microsToCurrency(read(budget, "adjustedSpendingLimitMicros", "adjusted_spending_limit_micros"));
  const consumedMicros = finiteNumber(read(budget, "amountServedMicros", "amount_served_micros"));
  const consumed = consumedMicros === null ? null : consumedMicros / 1_000_000;
  if (limit === 0 && consumed === null) {
    return finish(base, {
      accountId: params.accountId,
      accountName: params.accountName,
      status: "not_available",
      notes: ["O AccountBudget não retornou um limite finito e consumido válidos."],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }
  if (consumed === null) {
    return finish(base, {
      accountId: params.accountId,
      accountName: params.accountName,
      status: "error",
      notes: ["O AccountBudget retornou o limite, mas não informou amount_served_micros válido."],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }

  const remaining = Math.max(limit - consumed, 0);
  return finish(base, {
    accountId: params.accountId,
    accountName: params.accountName,
    billingMode: "account_budget",
    sourceField: "account_budget.adjusted_spending_limit_micros,account_budget.amount_served_micros",
    supported: true,
    status: "available",
    accountBudgetLimit: round(limit),
    accountBudgetConsumed: round(consumed),
    accountBudgetRemaining: round(remaining),
    spendingLimit: round(limit),
    amountSpent: round(consumed),
    remainingUntilLimit: round(remaining),
    notes: ["Orçamento de conta restante não é um saldo financeiro universal ou pré-pago."],
    averageDailySpend: params.averageDailySpend ?? null,
  });
}

export function buildMetaAdsFinancialStatus(params: {
  account?: Record<string, unknown> | null;
  currency?: string | null;
  updatedAt?: string | null;
  averageDailySpend?: number | null;
  error?: string | null;
  accountId?: string | null;
  accountName?: string | null;
}): AdsFinancialStatus {
  const account = params.account || {};
  const accountId = params.accountId || String(read(account, "account_id", "accountId", "id") || "").replace(/^act_/, "") || null;
  const accountName = params.accountName || String(read(account, "name", "accountName") || "") || null;
  const currency = params.currency || String(read(account, "currency") || "") || null;
  const base = { provider: "meta_ads" as const, currency, updatedAt: params.updatedAt || null };
  if (params.error) {
    return finish(base, { accountId, accountName, status: "error", notes: [`Consulta financeira da conta indisponível: ${params.error}`], averageDailySpend: params.averageDailySpend ?? null });
  }

  const spendCap = metaMoneyToCurrency(read(account, "spend_cap", "spendCap"));
  const amountSpent = metaMoneyToCurrency(read(account, "amount_spent", "amountSpent"));
  const balance = metaMoneyToCurrency(read(account, "balance"));
  const isPrepay = read(account, "is_prepay_account", "isPrepayAccount") === true;

  if (spendCap !== null && spendCap > 0 && amountSpent !== null && amountSpent >= 0) {
    const remaining = Math.max(spendCap - amountSpent, 0);
    return finish(base, {
      accountId, accountName, billingMode: isPrepay ? "prepay_with_spend_cap" : "spend_cap",
      sourceField: "spend_cap,amount_spent", supported: true, status: "available",
      spendingLimit: round(spendCap), amountSpent: round(amountSpent), remainingUntilLimit: round(remaining),
      outstandingBalance: balance, outstandingBalanceLabel: balance === null ? null : "Saldo / valor de faturamento informado pela Meta",
      notes: ["Disponibilidade calculada exclusivamente até o limite de gastos informado pela Meta."],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }

  if (balance !== null) {
    if (isPrepay) {
      return finish(base, {
        accountId, accountName, billingMode: "prepay", sourceField: "balance,is_prepay_account", supported: true,
        status: "available", availableAmount: round(balance), availableAmountLabel: "Saldo pré-pago disponível",
        notes: ["A conta foi identificada pela Meta como pré-paga; balance foi tratado como valor disponível."],
        averageDailySpend: params.averageDailySpend ?? null,
      });
    }
    return finish(base, {
      accountId, accountName, sourceField: "balance", supported: true, status: "available",
      outstandingBalance: round(balance), outstandingBalanceLabel: "Saldo / valor de faturamento informado pela Meta",
      notes: ["balance não foi tratado como crédito restante porque o modelo pré-pago não foi confirmado."],
      averageDailySpend: params.averageDailySpend ?? null,
    });
  }

  return finish(base, {
    accountId, accountName, status: "not_available",
    notes: ["Informação financeira não disponibilizada de forma conclusiva pela Meta API."],
    averageDailySpend: params.averageDailySpend ?? null,
  });
}

export function buildFinancialErrorStatus(params: {
  provider: AdsFinancialProvider;
  currency?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  updatedAt?: string | null;
  message: string;
}) {
  return finish(
    { provider: params.provider, currency: params.currency || null, updatedAt: params.updatedAt || null },
    { accountId: params.accountId, accountName: params.accountName, status: "error", notes: [params.message] },
  );
}
