import type { GoogleAdsAccessibleAccount } from "../../types/google-ads-api.ts";

export function deduplicateGoogleAdsAccounts(accounts: GoogleAdsAccessibleAccount[]) {
  const map = new Map<string, GoogleAdsAccessibleAccount>();
  for (const account of accounts) {
    const current = map.get(account.customerId);
    if (!current || (!current.directlyAccessible && account.directlyAccessible)) {
      map.set(account.customerId, account);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.manager !== b.manager) return a.manager ? -1 : 1;
    return a.descriptiveName.localeCompare(b.descriptiveName, "pt-BR");
  });
}
