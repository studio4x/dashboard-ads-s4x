import { formatGoogleAdsCustomerId, GoogleAdsRestClient } from "./client";
import { googleAdsQueries } from "./queries";
import type { GoogleAdsAccessibleAccount, GoogleAdsApiRow } from "@/types/google-ads-api";
import { deduplicateGoogleAdsAccounts } from "./account-utils";

type UnknownRecord = Record<string, unknown>;

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
    loginCustomerId: null,
    loginCustomerName: null,
    directlyAccessible: true,
  };
}

function childAccount(row: GoogleAdsApiRow, manager: GoogleAdsAccessibleAccount): GoogleAdsAccessibleAccount | null {
  const child = row.customerClient;
  const customerId = normalizeId(child?.clientCustomer);
  if (!/^\d{10}$/.test(customerId) || bool(child, "hidden") === true) return null;
  return {
    customerId,
    formattedCustomerId: formatGoogleAdsCustomerId(customerId),
    descriptiveName: text(child, "descriptiveName") || `Conta ${formatGoogleAdsCustomerId(customerId)}`,
    manager: bool(child, "manager") === true,
    testAccount: bool(child, "testAccount"),
    currencyCode: text(child, "currencyCode") || null,
    timeZone: text(child, "timeZone") || null,
    status: text(child, "status") || null,
    level: Number(child?.level ?? 0),
    loginCustomerId: manager.customerId,
    loginCustomerName: manager.descriptiveName,
    directlyAccessible: customerId === manager.customerId,
  };
}

export async function discoverGoogleAdsAccounts(client: GoogleAdsRestClient) {
  const accessibleIds = await client.listAccessibleCustomers();
  const warnings: string[] = [];
  const direct: GoogleAdsAccessibleAccount[] = [];

  for (const customerId of accessibleIds) {
    try {
      const result = await client.search(customerId, googleAdsQueries.customer);
      direct.push(directAccount(result.rows[0] || {}, customerId));
    } catch (error) {
      warnings.push(`Não foi possível validar ${formatGoogleAdsCustomerId(customerId)}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
  }

  const discovered = [...direct];
  for (const manager of direct.filter((account) => account.manager)) {
    try {
      const result = await client.search(manager.customerId, googleAdsQueries.customerClients, manager.customerId);
      result.rows.forEach((row) => {
        const account = childAccount(row, manager);
        if (account) discovered.push(account);
      });
    } catch (error) {
      warnings.push(`Não foi possível consultar a hierarquia de ${manager.formattedCustomerId}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
  }

  return { accounts: deduplicateGoogleAdsAccounts(discovered), warnings };
}
