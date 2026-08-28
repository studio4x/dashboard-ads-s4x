import assert from "node:assert/strict";
import test from "node:test";
import { classifyGoogleAdsError } from "../src/lib/google-ads-api/error-classification.ts";
import { buildDeveloperTokenSummary, buildDiscoveryWarnings, type DiscoveryWarning } from "../src/lib/google-ads-api/discovery-diagnostics.ts";
import type { GoogleAdsDiscoveryDiagnostic } from "../src/types/google-ads-api.ts";

function diagnostic(overrides: Partial<GoogleAdsDiscoveryDiagnostic> = {}): GoogleAdsDiscoveryDiagnostic {
  return {
    operation: "customer",
    customerId: "1234567890",
    loginCustomerId: null,
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCode: "DEVELOPER_TOKEN_NOT_APPROVED",
    errorCodes: ["DEVELOPER_TOKEN_NOT_APPROVED"],
    requestId: "request-123",
    classification: "developer_token_production_access_required",
    message: "The developer token is only approved for use with test accounts.",
    ...overrides,
  };
}

function warning(overrides: Partial<GoogleAdsDiscoveryDiagnostic> = {}): DiscoveryWarning {
  const item = diagnostic(overrides);
  return { diagnostic: item, message: `Não foi possível validar ${item.customerId}: ${item.message}` };
}

test("classifica somente o Developer Token restrito a contas de teste", () => {
  assert.equal(classifyGoogleAdsError({
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCodes: ["DEVELOPER_TOKEN_NOT_APPROVED"],
    message: "The developer token is only approved for use with test accounts.",
  }), "developer_token_production_access_required");
  assert.equal(classifyGoogleAdsError({
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCodes: ["USER_PERMISSION_DENIED"],
    message: "User does not have permission to access customer.",
  }), null);
});

test("não transforma qualquer HTTP 403 em problema de nível do token", () => {
  assert.equal(classifyGoogleAdsError({
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCodes: [],
    message: "The customer is suspended.",
  }), null);
  assert.equal(classifyGoogleAdsError({
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCodes: ["DEVELOPER_TOKEN_PROHIBITED"],
    message: "The developer token is not allowed with this project.",
  }), null);
});

test("fallback textual exige evidência de contas de teste e nível de acesso", () => {
  assert.equal(classifyGoogleAdsError({
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCodes: [],
    message: "The developer token is restricted to test accounts; request Basic access for production.",
  }), "developer_token_production_access_required");
  assert.equal(classifyGoogleAdsError({
    statusCode: 403,
    apiStatus: "PERMISSION_DENIED",
    errorCodes: [],
    message: "The developer token is invalid.",
  }), null);
});

test("múltiplas contas bloqueadas geram um único resumo", () => {
  const diagnostics = [
    diagnostic({ customerId: "1234567890" }),
    diagnostic({ customerId: "2345678901" }),
    diagnostic({ customerId: "3456789012" }),
  ];
  assert.equal(buildDeveloperTokenSummary(diagnostics).length, 1);
  assert.match(buildDeveloperTokenSummary(diagnostics)[0], /3 contas/);
});

test("mistura contas válidas e bloqueadas sem esconder as válidas", () => {
  const blocked = diagnostic({ customerId: "1234567890" });
  const warnings = buildDiscoveryWarnings([]);
  const summary = buildDeveloperTokenSummary([blocked]);
  const validAccounts = [{ customerId: "2345678901", manager: false }];
  assert.equal(validAccounts.length, 1);
  assert.equal(warnings.length, 0);
  assert.equal(summary.length, 1);
});

test("mistura Developer Token e permissão mantém o erro de permissão separado", () => {
  const permissionWarning = warning({
    customerId: "2345678901",
    errorCode: "USER_PERMISSION_DENIED",
    errorCodes: ["USER_PERMISSION_DENIED"],
    classification: null,
    message: "User does not have permission to access customer.",
  });
  assert.equal(buildDeveloperTokenSummary([diagnostic()]).length, 1);
  assert.equal(buildDiscoveryWarnings([permissionWarning]).length, 1);
  assert.match(buildDiscoveryWarnings([permissionWarning])[0], /permission to access customer/);
});

test("erros repetidos de uma mesma causa não geram dezenas de warnings", () => {
  const records = [
    warning({ errorCode: "USER_PERMISSION_DENIED", errorCodes: ["USER_PERMISSION_DENIED"], classification: null, customerId: "1234567890" }),
    warning({ errorCode: "USER_PERMISSION_DENIED", errorCodes: ["USER_PERMISSION_DENIED"], classification: null, customerId: "2345678901" }),
    warning({ errorCode: "USER_PERMISSION_DENIED", errorCodes: ["USER_PERMISSION_DENIED"], classification: null, customerId: "3456789012" }),
  ];
  const warnings = buildDiscoveryWarnings(records);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /3 contas/);
});

test("após a validação voltar a funcionar, o resumo desaparece", () => {
  assert.deepEqual(buildDeveloperTokenSummary([]), []);
  assert.deepEqual(buildDiscoveryWarnings([]), []);
});
