import type { GoogleAdsRestClient } from "./client";
import { buildDeveloperTokenSummary, buildDiscoveryWarnings, type DiscoveryWarning } from "./discovery-diagnostics.ts";
import { googleAdsQueries } from "./queries.ts";
import type { GoogleAdsAccessibleAccount, GoogleAdsApiRow, GoogleAdsDiscoveryDiagnostic } from "../../types/google-ads-api.ts";
import { deduplicateGoogleAdsAccounts } from "./account-utils.ts";

type UnknownRecord = Record<string, unknown>;
type GoogleAdsDiscoveryClient = Pick<GoogleAdsRestClient, "listAccessibleCustomers" | "search">;

function text(record: UnknownRecord | undefined, key: string) {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
}

function bool(record: UnknownRecord | undefined, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function normalizeId(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function formatGoogleAdsCustomerId(value: string) {
  const customerId = normalizeId(value);
  if (!/^\d{10}$/.test(customerId)) throw new Error("Customer ID Google Ads inválido.");
  return `${customerId.slice(0, 3)}-${customerId.slice(3, 6)}-${customerId.slice(6)}`;
}

function directAccount(row: GoogleAdsApiRow, customerId: string): GoogleAdsAccessibleAccount {
  const customer = row.customer;
  return {
    customerId,
    formattedCustomerId: formatGoogleAdsCustomerId(customerId),
    descriptiveName: text(customer, "descriptiveName") || `Conta ${formatGoogleAdsCustomerId(customerId)}`,
    manager: bool(customer, "manager") === true,
    testAccount: bool(customer, "testAccount"),
    currencyCode: text(customer, "currencyCode") || null,
    timeZone: text(customer, "timeZone") || null,
    status: text(customer, "status") || null,
    level: 0,
    parentManagerCustomerId: null,
    parentManagerName: null,
    loginCustomerId: null,
    loginCustomerName: null,
    directlyAccessible: true,
  };
}

function childAccount(
  row: GoogleAdsApiRow,
  manager: GoogleAdsAccessibleAccount,
  loginManager: GoogleAdsAccessibleAccount,
): GoogleAdsAccessibleAccount | null {
  const child = row.customerClient;
  const customerId = normalizeId(child?.clientCustomer);
  if (!/^\d{10}$/.test(customerId) || customerId === manager.customerId || bool(child, "hidden") === true) return null;
  const relativeLevel = Number(child?.level ?? 1);
  return {
    customerId,
    formattedCustomerId: formatGoogleAdsCustomerId(customerId),
    descriptiveName: text(child, "descriptiveName") || `Conta ${formatGoogleAdsCustomerId(customerId)}`,
    manager: bool(child, "manager") === true,
    testAccount: bool(child, "testAccount"),
    currencyCode: text(child, "currencyCode") || null,
    timeZone: text(child, "timeZone") || null,
    status: text(child, "status") || null,
    level: Number(manager.level || 0) + (Number.isFinite(relativeLevel) ? relativeLevel : 1),
    parentManagerCustomerId: manager.customerId,
    parentManagerName: manager.descriptiveName,
    loginCustomerId: loginManager.customerId,
    loginCustomerName: loginManager.descriptiveName,
    directlyAccessible: false,
  };
}

type GoogleAdsApiErrorLike = Error & {
  statusCode?: number;
  apiStatus?: string | null;
  errorCode?: string | null;
  errorCodes?: string[];
  requestId?: string | null;
  classification?: GoogleAdsDiscoveryDiagnostic["classification"];
};

function googleAdsApiError(error: unknown): GoogleAdsApiErrorLike | null {
  return error instanceof Error && error.name === "GoogleAdsApiError" ? error as GoogleAdsApiErrorLike : null;
}

function diagnosticFor(
  operation: GoogleAdsDiscoveryDiagnostic["operation"],
  customerId: string,
  loginCustomerId: string | null,
  error: unknown,
): GoogleAdsDiscoveryDiagnostic {
  const apiError = googleAdsApiError(error);
  return {
    operation,
    customerId,
    loginCustomerId,
    statusCode: apiError?.statusCode ?? null,
    apiStatus: apiError?.apiStatus ?? null,
    errorCode: apiError?.errorCode ?? null,
    errorCodes: apiError?.errorCodes || [],
    requestId: apiError?.requestId ?? null,
    classification: apiError?.classification ?? null,
    message: error instanceof Error ? error.message.slice(0, 900) : "erro desconhecido",
  };
}

export type GoogleAdsDiscoveryResult = {
  accounts: GoogleAdsAccessibleAccount[];
  warnings: string[];
  summaryWarnings: string[];
  diagnostics: GoogleAdsDiscoveryDiagnostic[];
};

export async function discoverGoogleAdsAccounts(client: GoogleAdsDiscoveryClient): Promise<GoogleAdsDiscoveryResult> {
  const accessibleIds = await client.listAccessibleCustomers();
  const warningRecords: DiscoveryWarning[] = [];
  const diagnostics: GoogleAdsDiscoveryDiagnostic[] = [];
  const direct: GoogleAdsAccessibleAccount[] = [];

  for (const customerId of accessibleIds) {
    try {
      const result = await client.search(customerId, googleAdsQueries.customer);
      direct.push(directAccount(result.rows[0] || {}, customerId));
    } catch (error) {
      const diagnostic = diagnosticFor("customer", customerId, null, error);
      diagnostics.push(diagnostic);
      console.warn("[GOOGLE_ADS_DISCOVERY_ERROR]", diagnostic);
      if (!diagnostic.classification) {
        warningRecords.push({ diagnostic, message: `Não foi possível validar ${formatGoogleAdsCustomerId(customerId)}: ${diagnostic.message}` });
      }
    }
  }

  const discovered = [...direct];
  const managerQueue = direct
    .filter((account) => account.manager)
    .map((account) => ({ manager: account, loginManager: account }));
  const queriedManagers = new Set<string>();

  while (managerQueue.length > 0) {
    const item = managerQueue.shift();
    if (!item) break;
    const { manager, loginManager } = item;
    const managerKey = `${loginManager.customerId}:${manager.customerId}`;
    if (queriedManagers.has(managerKey)) continue;
    queriedManagers.add(managerKey);
    try {
      const result = await client.search(manager.customerId, googleAdsQueries.directCustomerClients, loginManager.customerId);
      result.rows.forEach((row) => {
        const account = childAccount(row, manager, loginManager);
        if (!account) return;
        discovered.push(account);
        if (account.manager) managerQueue.push({ manager: account, loginManager });
      });
    } catch (error) {
      const diagnostic = diagnosticFor("hierarchy", manager.customerId, loginManager.customerId, error);
      diagnostics.push(diagnostic);
      console.warn("[GOOGLE_ADS_DISCOVERY_ERROR]", diagnostic);
      if (!diagnostic.classification) {
        warningRecords.push({ diagnostic, message: `Não foi possível consultar a hierarquia de ${manager.formattedCustomerId}: ${diagnostic.message}` });
      }
    }
  }

  const developerTokenDiagnostics = diagnostics.filter((diagnostic) => diagnostic.classification === "developer_token_production_access_required");
  return {
    accounts: deduplicateGoogleAdsAccounts(discovered),
    warnings: buildDiscoveryWarnings(warningRecords),
    summaryWarnings: buildDeveloperTokenSummary(developerTokenDiagnostics),
    diagnostics,
  };
}
