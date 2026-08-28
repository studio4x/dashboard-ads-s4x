import type { GoogleAdsErrorClassification } from "../../types/google-ads-api.ts";

export type GoogleAdsErrorClassificationInput = {
  statusCode: number;
  apiStatus: string | null;
  errorCodes: string[];
  message: string;
};

const NON_DEVELOPER_TOKEN_ERROR_CODES = new Set([
  "USER_PERMISSION_DENIED",
  "DEVELOPER_TOKEN_PROHIBITED",
  "DEVELOPER_TOKEN_INVALID",
  "DEVELOPER_TOKEN_NOT_ON_ALLOWLIST",
  "CUSTOMER_NOT_ENABLED",
  "INVALID_LOGIN_CUSTOMER_ID_SERVING_CUSTOMER_ID_COMBINATION",
]);

function hasProductionAccessMessage(message: string) {
  const normalized = message.toLowerCase();
  const testAccountEvidence = /test\s+accounts?|non[- ]test\s+accounts?|production\s+accounts?/.test(normalized);
  const accessLevelEvidence = /basic\s+access|standard\s+access|access\s+level|developer\s+token/.test(normalized);
  return testAccountEvidence && accessLevelEvidence;
}

export function classifyGoogleAdsError(input: GoogleAdsErrorClassificationInput): GoogleAdsErrorClassification | null {
  if (input.statusCode !== 403) return null;
  if (input.errorCodes.includes("DEVELOPER_TOKEN_NOT_APPROVED")) return "developer_token_production_access_required";
  if (input.errorCodes.some((code) => NON_DEVELOPER_TOKEN_ERROR_CODES.has(code))) return null;
  return input.apiStatus === "PERMISSION_DENIED" && hasProductionAccessMessage(input.message)
    ? "developer_token_production_access_required"
    : null;
}
