import type { GoogleAdsDiscoveryDiagnostic } from "../../types/google-ads-api.ts";

export type DiscoveryWarning = { diagnostic: GoogleAdsDiscoveryDiagnostic; message: string };

function warningKey(diagnostic: GoogleAdsDiscoveryDiagnostic) {
  return `${diagnostic.operation}:${diagnostic.errorCode || diagnostic.apiStatus || diagnostic.message}`;
}

export function buildDiscoveryWarnings(records: DiscoveryWarning[]) {
  const groups = new Map<string, DiscoveryWarning[]>();
  records.forEach((record) => {
    const key = warningKey(record.diagnostic);
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  return Array.from(groups.values()).map((group) => {
    const first = group[0].diagnostic;
    if (group.length === 1) return group[0].message;
    const code = first.errorCode || first.apiStatus || "erro semelhante";
    if (first.operation === "hierarchy") {
      return `Não foi possível consultar a hierarquia de ${group.length} gerenciadores pelo mesmo motivo (${code}). Consulte os detalhes técnicos.`;
    }
    return `Não foi possível validar ${group.length} contas pelo mesmo motivo (${code}). Consulte os detalhes técnicos.`;
  });
}

export function buildDeveloperTokenSummary(diagnostics: GoogleAdsDiscoveryDiagnostic[]) {
  const affected = new Set(diagnostics.map((diagnostic) => `${diagnostic.customerId}:${diagnostic.loginCustomerId || ""}`));
  if (!affected.size) return [];
  const accountLabel = affected.size === 1 ? "1 conta foi encontrada" : `${affected.size} contas foram encontradas`;
  return [`O Developer Token atual ainda não possui acesso a contas Google Ads de produção. ${accountLabel}, mas a Google Ads API bloqueou a validação dos dados. Aguarde a aprovação de Basic Access ou utilize uma conta Google Ads de teste.`];
}
