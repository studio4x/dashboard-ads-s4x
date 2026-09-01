import assert from "node:assert/strict";
import test from "node:test";
import { selectPreferredSnapshotSourceIds, shouldPreferNativeOverSheet } from "../src/lib/dashboard/source-priority.ts";
import { deduplicateGoogleAdsAccounts, googleAdsAccountBelongsToManager } from "../src/lib/google-ads-api/account-utils.ts";
import { buildIntegratedAdsPayload } from "../src/lib/dashboard/integrated-payload.ts";

const sheetGoogle = { id: "sheet-google", type: "google_sheets", status: "active", sourceRole: "google_ads", lastImportStatus: "success" };
const sheetMeta = { id: "sheet-meta", type: "google_sheets", status: "active", sourceRole: "meta_ads", lastImportStatus: "success" };
const nativeGoogle = { id: "api-google", type: "google_ads", status: "active", lastImportStatus: "success" };
const nativeMeta = { id: "api-meta", type: "meta_ads", status: "active", lastImportStatus: "success" };

test("Google Ads API válida tem prioridade sobre Google Sheets", () => {
  assert.deepEqual(selectPreferredSnapshotSourceIds("google_ads_s4x", [sheetGoogle, nativeGoogle], sheetGoogle.id), [nativeGoogle.id]);
  assert.equal(shouldPreferNativeOverSheet("google_ads", [sheetGoogle, nativeGoogle]), true);
});

test("Google Sheets continua como fallback enquanto a API ainda não sincronizou", () => {
  assert.deepEqual(selectPreferredSnapshotSourceIds("google_ads_s4x", [sheetGoogle, { ...nativeGoogle, lastImportStatus: null }], nativeGoogle.id), [sheetGoogle.id]);
});

test("dashboard integrado escolhe exatamente uma fonte por plataforma", () => {
  assert.deepEqual(
    selectPreferredSnapshotSourceIds("google_meta_ads_s4x", [sheetGoogle, sheetMeta, nativeGoogle, nativeMeta]),
    [nativeGoogle.id, nativeMeta.id],
  );
});

test("payload integrado não substitui Google nativo por uma planilha de comparação", () => {
  const nativeGoogle = { diagnostics: { snapshotVersion: "google_ads_s4x_v1" }, dailyPerformance: [{ date: "2026-08-27", cost: 100 }], campaigns: [] };
  const previous = { googlePayload: nativeGoogle, metaPayload: null };
  const sheetGooglePayload = { diagnostics: { snapshotVersion: "google_ads_s4x_v1" }, dailyPerformance: [{ date: "2026-08-27", cost: 999 }] };
  const integrated = buildIntegratedAdsPayload({
    sourceRole: "google_ads", importedPayload: sheetGooglePayload, previousPayload: previous,
    sourceLabel: "prioridade", preferPreviousRolePayload: true,
  });
  assert.equal(integrated.googlePayload, nativeGoogle);
  assert.equal(integrated.google_ads[0].cost, 100);
});

test("descoberta deduplica Customer IDs e preserva o acesso direto", () => {
  const common = {
    formattedCustomerId: "123-456-7890", descriptiveName: "Cliente", manager: false,
    testAccount: false, currencyCode: "BRL", timeZone: "America/Sao_Paulo", status: "ENABLED", level: 1,
    parentManagerCustomerId: "9999999999", parentManagerName: "MCC",
  };
  const accounts = deduplicateGoogleAdsAccounts([
    { ...common, customerId: "1234567890", loginCustomerId: "9999999999", loginCustomerName: "MCC", directlyAccessible: false },
    { ...common, customerId: "1234567890", loginCustomerId: null, loginCustomerName: null, directlyAccessible: true },
  ]);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].directlyAccessible, true);
  assert.equal(accounts[0].loginCustomerId, null);
});

test("agrupa conta de sub-MCC pelo pai imediato sem trocar o login MCC raiz", () => {
  const account = {
    customerId: "1218041638", formattedCustomerId: "121-804-1638", descriptiveName: "RAI ARMAZÉNS", manager: false,
    testAccount: false, currencyCode: "BRL", timeZone: "America/Sao_Paulo", status: "ENABLED", level: 2,
    parentManagerCustomerId: "1418773114", parentManagerName: "GOOGLE&CO",
    loginCustomerId: "9876543210", loginCustomerName: "Agência Studio 4x", directlyAccessible: false,
  };
  assert.equal(googleAdsAccountBelongsToManager(account, "1418773114"), true);
  assert.equal(googleAdsAccountBelongsToManager(account, "9876543210"), false);
  assert.equal(googleAdsAccountBelongsToManager(account, ""), false);
});
