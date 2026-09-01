import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleAdsFinancialStatus,
  buildMetaAdsFinancialStatus,
} from "../src/lib/ads-financial.ts";
import {
  evaluateFinancialAlertState,
  resolveAlertableFinancialAmount,
} from "../src/lib/financial-alerts.ts";

test("150 acima do limite 100 não alerta", () => {
  const result = evaluateFinancialAlertState({
    enabled: true,
    amount: 150,
    threshold: 100,
    previousState: "healthy",
  });
  assert.equal(result.shouldAlert, false);
  assert.equal(result.decision, "healthy");
});

test("99 abaixo do limite 100 alerta ao cruzar", () => {
  const result = evaluateFinancialAlertState({
    enabled: true,
    amount: 99,
    threshold: 100,
    previousState: "healthy",
  });
  assert.equal(result.shouldAlert, true);
  assert.equal(result.decision, "crossed_below_threshold");
});

test("permanece abaixo após uma hora e não repete", () => {
  const result = evaluateFinancialAlertState({
    enabled: true,
    amount: 90,
    threshold: 100,
    previousState: "below_threshold",
    lastNotifiedAt: "2026-09-01T10:00:00Z",
    observedAt: "2026-09-01T11:00:00Z",
    repeatIntervalHours: 24,
  });
  assert.equal(result.shouldAlert, false);
  assert.equal(result.decision, "still_below_suppressed");
});

test("permanece abaixo após 24 horas e permite repetição", () => {
  const result = evaluateFinancialAlertState({
    enabled: true,
    amount: 90,
    threshold: 100,
    previousState: "below_threshold",
    lastNotifiedAt: "2026-09-01T10:00:00Z",
    observedAt: "2026-09-02T10:00:00Z",
    repeatIntervalHours: 24,
  });
  assert.equal(result.shouldAlert, true);
  assert.equal(result.decision, "repeat_alert_due");
});

test("volta acima do limite e retorna para healthy", () => {
  const result = evaluateFinancialAlertState({
    enabled: true,
    amount: 130,
    threshold: 100,
    previousState: "below_threshold",
  });
  assert.equal(result.newState, "healthy");
  assert.equal(result.shouldAlert, false);
});

test("depois de healthy uma nova queda alerta imediatamente", () => {
  const result = evaluateFinancialAlertState({
    enabled: true,
    amount: 80,
    threshold: 100,
    previousState: "healthy",
  });
  assert.equal(result.shouldAlert, true);
  assert.equal(result.decision, "crossed_below_threshold");
});

test("outstandingBalance isolado nunca é tratado como saldo disponível", () => {
  const status = buildMetaAdsFinancialStatus({
    account: { balance: "80", currency: "BRL" },
  });
  assert.equal(status.outstandingBalance, 80);
  assert.equal(resolveAlertableFinancialAmount(status), null);
});

test("status not_available não gera valor alertável", () => {
  const status = buildMetaAdsFinancialStatus({ account: { currency: "BRL" } });
  assert.equal(status.status, "not_available");
  assert.equal(resolveAlertableFinancialAmount(status), null);
});

test("Google Ads unlimited nunca gera valor alertável", () => {
  const status = buildGoogleAdsFinancialStatus({
    currency: "BRL",
    rows: [{ adjustedSpendingLimitType: "INFINITE" }],
  });
  assert.equal(status.status, "unlimited");
  assert.equal(resolveAlertableFinancialAmount(status), null);
});

test("Google Ads usa orçamento restante quando AccountBudget é finito", () => {
  const status = buildGoogleAdsFinancialStatus({
    currency: "BRL",
    rows: [{
      status: "APPROVED",
      adjustedSpendingLimitMicros: "500000000",
      amountServedMicros: "450000000",
    }],
  });
  const alertable = resolveAlertableFinancialAmount(status);
  assert.equal(status.status, "available");
  assert.equal(alertable?.amount, 50);
  assert.equal(alertable?.sourceField, "remainingUntilLimit");
});

test("alerta desativado nunca dispara", () => {
  const result = evaluateFinancialAlertState({
    enabled: false,
    amount: 1,
    threshold: 100,
    previousState: "healthy",
  });
  assert.equal(result.shouldAlert, false);
  assert.equal(result.decision, "alert_disabled");
});

test("contas com thresholds diferentes são avaliadas independentemente", () => {
  const a = evaluateFinancialAlertState({
    enabled: true,
    amount: 150,
    threshold: 100,
    previousState: "healthy",
  });
  const b = evaluateFinancialAlertState({
    enabled: true,
    amount: 150,
    threshold: 200,
    previousState: "healthy",
  });
  assert.equal(a.shouldAlert, false);
  assert.equal(b.shouldAlert, true);
});

test("Meta e Google compartilham a mesma regra de threshold sem misturar conceitos financeiros", () => {
  const meta = buildMetaAdsFinancialStatus({
    account: { balance: "80", currency: "BRL", is_prepay_account: true },
  });
  const google = buildGoogleAdsFinancialStatus({
    currency: "BRL",
    rows: [{
      status: "APPROVED",
      adjustedSpendingLimitMicros: "500000000",
      amountServedMicros: "350000000",
    }],
  });
  const metaAmount = resolveAlertableFinancialAmount(meta)?.amount ?? null;
  const googleAmount = resolveAlertableFinancialAmount(google)?.amount ?? null;
  assert.equal(evaluateFinancialAlertState({ enabled: true, amount: metaAmount, threshold: 100, previousState: "healthy" }).shouldAlert, true);
  assert.equal(evaluateFinancialAlertState({ enabled: true, amount: googleAmount, threshold: 100, previousState: "healthy" }).shouldAlert, false);
});

test("prioriza saldo pré-pago disponível quando confirmado pela Meta", () => {
  const status = buildMetaAdsFinancialStatus({
    account: { balance: "72.5", currency: "BRL", is_prepay_account: true },
  });
  const alertable = resolveAlertableFinancialAmount(status);
  assert.equal(alertable?.amount, 72.5);
  assert.equal(alertable?.sourceField, "availableAmount");
});
