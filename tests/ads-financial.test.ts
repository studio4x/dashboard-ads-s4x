import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleAdsFinancialStatus,
  buildMetaAdsFinancialStatus,
  calculateAverageDailySpend,
  calculateEstimatedDaysRemaining,
  metaMoneyToCurrency,
  microsToCurrency,
  resolveAdsFinancialStatuses,
} from "../src/lib/ads-financial.ts";

test("converte micros Google para unidade monetária", () => {
  assert.equal(microsToCurrency("3450000"), 3.45);
  assert.equal(microsToCurrency("invalido"), 0);
});

test("normaliza AccountBudget finito e calcula restante", () => {
  const status = buildGoogleAdsFinancialStatus({
    accountId: "123", accountName: "Conta Google", currency: "BRL",
    rows: [{ accountBudget: { status: "APPROVED", adjustedSpendingLimitMicros: "10000000000", amountServedMicros: "6550000000" } }],
    averageDailySpend: 100,
  });
  assert.equal(status.status, "available");
  assert.equal(status.accountBudgetLimit, 10000);
  assert.equal(status.accountBudgetConsumed, 6550);
  assert.equal(status.accountBudgetRemaining, 3450);
  assert.equal(status.estimatedDaysRemaining, 34.5);
});

test("identifica AccountBudget ilimitado sem inventar valor", () => {
  const status = buildGoogleAdsFinancialStatus({ rows: [{ adjustedSpendingLimitType: "INFINITE", status: "APPROVED" }] });
  assert.equal(status.status, "unlimited");
  assert.equal(status.accountBudgetRemaining, null);
  assert.equal(status.estimatedDaysRemaining, null);
});

test("distingue AccountBudget ausente e erro parcial", () => {
  assert.equal(buildGoogleAdsFinancialStatus({ rows: [] }).status, "not_available");
  assert.equal(buildGoogleAdsFinancialStatus({ error: "USER_PERMISSION_DENIED" }).status, "error");
});

test("limita restante Google a zero quando servido supera o limite", () => {
  const status = buildGoogleAdsFinancialStatus({ rows: [{ adjustedSpendingLimitMicros: 1000000, amountServedMicros: 2000000 }] });
  assert.equal(status.remainingUntilLimit, 0);
  assert.equal(status.estimatedDaysRemaining, 0);
  assert.equal(status.alertStatus, "critical");
});

test("calcula média recente apenas nos dias com gasto positivo", () => {
  const average = calculateAverageDailySpend([
    { date: "2026-08-22", cost: 100 }, { date: "2026-08-23", cost: 0 },
    { date: "2026-08-24", cost: 200 }, { date: "2026-08-28", cost: 300 },
  ]);
  assert.equal(average, 200);
  assert.equal(calculateEstimatedDaysRemaining(0, 200), 0);
  assert.equal(calculateEstimatedDaysRemaining(1000, 0), null);
});

test("Meta calcula disponibilidade até spend cap", () => {
  const status = buildMetaAdsFinancialStatus({
    account: { account_id: "456", name: "Conta Meta", currency: "BRL", spend_cap: "5000", amount_spent: "3157.90" },
    averageDailySpend: 100,
  });
  assert.equal(metaMoneyToCurrency("3157.90"), 3157.9);
  assert.equal(status.remainingUntilLimit, 1842.1);
  assert.equal(status.spendingLimit, 5000);
  assert.equal(status.amountSpent, 3157.9);
  assert.equal(status.estimatedDaysRemaining, 18.4);
});

test("Meta sem spend cap não cria disponibilidade", () => {
  const status = buildMetaAdsFinancialStatus({ account: { balance: "842.35", currency: "BRL" } });
  assert.equal(status.outstandingBalance, 842.35);
  assert.equal(status.availableAmount, null);
  assert.equal(status.estimatedDaysRemaining, null);
  assert.match(status.outstandingBalanceLabel || "", /faturamento/);
});

test("Meta pré-paga permite saldo disponível com confirmação explícita", () => {
  const status = buildMetaAdsFinancialStatus({ account: { balance: "120", currency: "BRL", is_prepay_account: true }, averageDailySpend: 20 });
  assert.equal(status.availableAmount, 120);
  assert.equal(status.availableAmountLabel, "Saldo pré-pago disponível");
  assert.equal(status.estimatedDaysRemaining, 6);
});

test("Meta sem dados e erro parcial não quebram performance", () => {
  assert.equal(buildMetaAdsFinancialStatus({ account: { currency: "BRL" } }).status, "not_available");
  assert.equal(buildMetaAdsFinancialStatus({ error: "campo indisponível" }).status, "error");
});

test("resolve Meta direto pelo contrato genérico mesmo com fallback intermediário vazio", () => {
  const metaStatus = buildMetaAdsFinancialStatus({
    account: { account_id: "456", name: "Conta Meta", currency: "BRL", balance: "5951" },
  });
  const resolved = resolveAdsFinancialStatuses({
    metaFinancialStatuses: [],
    metaPayload: { financialStatuses: [] },
    financialStatuses: [metaStatus],
    financialStatus: metaStatus,
  });

  assert.equal(resolved.googleStatus, null);
  assert.deepEqual(resolved.metaStatuses, [metaStatus]);
  assert.deepEqual(resolved.allStatuses, [metaStatus]);
});

test("resolve e deduplica contratos Google, Meta e integrado", () => {
  const googleStatus = buildGoogleAdsFinancialStatus({
    accountId: "123",
    accountName: "Conta Google",
    rows: [{ adjustedSpendingLimitMicros: "10000000", amountServedMicros: "4000000" }],
  });
  const metaStatus = buildMetaAdsFinancialStatus({
    account: { account_id: "456", name: "Conta Meta", currency: "BRL", balance: "120", is_prepay_account: true },
  });
  const resolved = resolveAdsFinancialStatuses({
    googleFinancialStatus: googleStatus,
    metaFinancialStatuses: [metaStatus],
    financialStatuses: [googleStatus, metaStatus],
    googlePayload: { financialStatus: googleStatus },
    metaPayload: { financialStatuses: [metaStatus], financialStatus: metaStatus },
  });

  assert.equal(resolved.googleStatus, googleStatus);
  assert.deepEqual(resolved.metaStatuses, [metaStatus]);
  assert.deepEqual(resolved.allStatuses, [googleStatus, metaStatus]);
});
