import { google } from "googleapis";
import type { GoogleAdsApiRow, GoogleAdsErrorClassification, GoogleAdsQueryResult, GoogleAdsSettings } from "@/types/google-ads-api";
import { classifyGoogleAdsError } from "./error-classification";
import {
  requireGoogleAdsClientSecret,
  requireGoogleAdsDeveloperToken,
  resolveGoogleAdsApiVersion,
  resolveGoogleAdsClientId,
} from "./settings";

type GoogleAdsErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    requestId?: string;
    details?: Array<{
      requestId?: string;
      errors?: Array<{ message?: string; errorCode?: Record<string, unknown> }>;
    }>;
  };
};

function googleAdsErrorDetails(body: GoogleAdsErrorBody) {
  return body.error?.details?.flatMap((detail) => detail.errors || []) || [];
}

function googleAdsErrorCodes(body: GoogleAdsErrorBody) {
  return Array.from(new Set(googleAdsErrorDetails(body)
    .flatMap((detail) => Object.values(detail.errorCode || {}))
    .filter((value): value is string => typeof value === "string" && Boolean(value))));
}

export class GoogleAdsApiError extends Error {
  readonly statusCode: number;
  readonly apiStatus: string | null;
  readonly requestId: string | null;
  readonly errorCode: string | null;
  readonly errorCodes: string[];
  readonly classification: GoogleAdsErrorClassification | null;
  readonly transient: boolean;
  readonly authRelated: boolean;

  constructor(message: string, statusCode: number, body: GoogleAdsErrorBody, requestId: string | null) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.statusCode = statusCode;
    this.apiStatus = body.error?.status || null;
    this.errorCodes = googleAdsErrorCodes(body);
    this.errorCode = this.errorCodes[0] || null;
    this.requestId = requestId || body.error?.requestId || body.error?.details?.find((detail) => detail.requestId)?.requestId || null;
    this.classification = classifyGoogleAdsError({ statusCode, apiStatus: this.apiStatus, errorCodes: this.errorCodes, message });
    this.transient = statusCode === 429 || statusCode >= 500;
    this.authRelated = statusCode === 401 || ["AUTHENTICATION_ERROR", "OAUTH_TOKEN_HEADER_INVALID", "CUSTOMER_NOT_ENABLED"].includes(String(this.errorCode));
  }
}

export function classifyGoogleAdsApiError(error: unknown): GoogleAdsErrorClassification | null {
  if (!(error instanceof GoogleAdsApiError)) return null;
  return classifyGoogleAdsError({ statusCode: error.statusCode, apiStatus: error.apiStatus, errorCodes: error.errorCodes, message: error.message });
}

function normalizeCustomerId(value: string) {
  const normalized = String(value || "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(normalized)) throw new Error("Customer ID Google Ads inválido.");
  return normalized;
}

export function formatGoogleAdsCustomerId(value: string) {
  const id = normalizeCustomerId(value);
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`;
}

export class GoogleAdsRestClient {
  private readonly settings: GoogleAdsSettings;
  private readonly refreshToken: string;
  private accessToken: string | null = null;

  constructor(settings: GoogleAdsSettings, refreshToken: string) {
    this.settings = settings;
    this.refreshToken = refreshToken;
  }

  private async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    const clientId = resolveGoogleAdsClientId(this.settings);
    if (!clientId) throw new Error("OAuth Client ID Google Ads não configurado.");
    const oauth = new google.auth.OAuth2(clientId, requireGoogleAdsClientSecret());
    oauth.setCredentials({ refresh_token: this.refreshToken });
    const response = await oauth.getAccessToken();
    const token = String(response.token || "").trim();
    if (!token) throw new Error("Não foi possível renovar o acesso Google Ads.");
    this.accessToken = token;
    return token;
  }

  private async request(path: string, init?: RequestInit, loginCustomerId?: string | null) {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${await this.getAccessToken()}`);
    headers.set("developer-token", requireGoogleAdsDeveloperToken());
    headers.set("content-type", "application/json");
    if (loginCustomerId) headers.set("login-customer-id", normalizeCustomerId(loginCustomerId));

    const response = await fetch(`https://googleads.googleapis.com/${resolveGoogleAdsApiVersion(this.settings)}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || (body as GoogleAdsErrorBody).error) {
      const errorBody = body as GoogleAdsErrorBody;
      const detailMessage = googleAdsErrorDetails(errorBody)[0]?.message;
      const safeMessage = detailMessage || errorBody.error?.message || `Google Ads API respondeu HTTP ${response.status}.`;
      throw new GoogleAdsApiError(safeMessage.slice(0, 900), response.status, errorBody, response.headers.get("request-id"));
    }
    return { body, requestId: response.headers.get("request-id") };
  }

  async listAccessibleCustomers() {
    const { body } = await this.request("/customers:listAccessibleCustomers");
    const resourceNames = (body as { resourceNames?: string[] }).resourceNames || [];
    return resourceNames.map((name) => normalizeCustomerId(name));
  }

  async search(customerId: string, query: string, loginCustomerId?: string | null): Promise<GoogleAdsQueryResult> {
    const target = normalizeCustomerId(customerId);
    const { body, requestId } = await this.request(
      `/customers/${target}/googleAds:searchStream`,
      { method: "POST", body: JSON.stringify({ query }) },
      loginCustomerId,
    );
    const chunks = Array.isArray(body) ? body : [body];
    const rows = chunks.flatMap((chunk) => {
      const results = (chunk as { results?: GoogleAdsApiRow[] })?.results;
      return Array.isArray(results) ? results : [];
    });
    const requestIds = [requestId, ...chunks.map((chunk) => String((chunk as { requestId?: string }).requestId || ""))]
      .filter((value): value is string => Boolean(value));
    return { rows, requestIds: Array.from(new Set(requestIds)) };
  }
}
