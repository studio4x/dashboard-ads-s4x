import { createHmac } from "node:crypto";
import type {
  MetaAccessOrigin,
  MetaAdAccountAsset,
  MetaBusinessAsset,
} from "@/types/meta-marketing";

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    is_transient?: boolean;
    fbtrace_id?: string;
  };
};

type GraphCollection<T> = {
  data?: T[];
  paging?: { next?: string };
};

type MetaGraphClientOptions = {
  requestTimeoutMs?: number;
  maxAttempts?: number;
  baseRetryDelayMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_RETRY_DELAY_MS = 1_000;
const RETRYABLE_META_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(Math.max(0, seconds * 1000), 10_000);
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.min(Math.max(0, timestamp - Date.now()), 10_000) : 0;
}

function isRetryableResponse(status: number, body: GraphErrorBody) {
  return status === 429
    || status >= 500
    || Boolean(body?.error?.is_transient)
    || RETRYABLE_META_CODES.has(Number(body?.error?.code));
}

export class MetaGraphError extends Error {
  code?: number;
  subcode?: number;
  transient: boolean;
  httpStatus?: number;

  constructor(message: string, body?: GraphErrorBody, httpStatus?: number) {
    super(message);
    this.name = "MetaGraphError";
    this.code = body?.error?.code;
    this.subcode = body?.error?.error_subcode;
    this.transient = Boolean(body?.error?.is_transient);
    this.httpStatus = httpStatus;
  }
}

export class MetaGraphClient {
  private readonly baseUrl: string;
  private readonly appSecretProof: string;
  private readonly accessToken: string;
  private readonly requestTimeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseRetryDelayMs: number;

  constructor(
    accessToken: string,
    apiVersion: string,
    appSecret: string,
    options: MetaGraphClientOptions = {},
  ) {
    this.accessToken = accessToken;
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`;
    this.appSecretProof = createHmac("sha256", appSecret).update(accessToken).digest("hex");
    this.requestTimeoutMs = Math.max(1_000, options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
    this.maxAttempts = Math.max(1, Math.min(5, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS));
    this.baseRetryDelayMs = Math.max(0, options.baseRetryDelayMs ?? DEFAULT_BASE_RETRY_DELAY_MS);
  }

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}) {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}/${path.replace(/^\//, "")}`);
    if (url.hostname !== "graph.facebook.com") {
      throw new Error("Host de paginação Meta inválido.");
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
    url.searchParams.set("appsecret_proof", this.appSecretProof);
    return url;
  }

  private retryDelay(attempt: number, response?: Response) {
    const serverDelay = response ? retryAfterMs(response) : 0;
    const exponentialDelay = Math.min(this.baseRetryDelayMs * (3 ** Math.max(0, attempt - 1)), 8_000);
    return Math.max(serverDelay, exponentialDelay);
  }

  async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = this.buildUrl(path, params);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      let response: Response;

      try {
        response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${this.accessToken}` },
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        if (attempt < this.maxAttempts) {
          await sleep(this.retryDelay(attempt));
          continue;
        }
        if (timedOut) {
          throw new Error(`Meta Graph API excedeu ${Math.round(this.requestTimeoutMs / 1000)} segundos por tentativa após ${this.maxAttempts} tentativa(s).`);
        }
        throw new Error(`Falha de rede ao consultar a Meta Graph API após ${this.maxAttempts} tentativa(s): ${error instanceof Error ? error.message : "erro desconhecido"}`);
      } finally {
        clearTimeout(timeout);
      }

      const body = (await response.json().catch(() => ({}))) as T & GraphErrorBody;
      if (response.ok && !body?.error) return body as T;

      const safeMessage = body?.error?.message || `Meta Graph API respondeu HTTP ${response.status}.`;
      const graphError = new MetaGraphError(safeMessage, body, response.status);
      const retryable = isRetryableResponse(response.status, body);

      if (retryable && attempt < this.maxAttempts) {
        await sleep(this.retryDelay(attempt, response));
        continue;
      }

      if (retryable && response.status >= 500) {
        throw new MetaGraphError(
          `Meta Graph API temporariamente indisponível (HTTP ${response.status}) após ${attempt} tentativa(s).`,
          body,
          response.status,
        );
      }
      throw graphError;
    }

    throw new Error("Meta Graph API não concluiu a requisição.");
  }

  async getAll<T>(path: string, params: Record<string, string | number | undefined> = {}, maxPages = 100) {
    const rows: T[] = [];
    let next: string | null = path;
    let pageParams = params;
    let pageCount = 0;

    while (next && pageCount < maxPages) {
      const page: GraphCollection<T> = await this.get<GraphCollection<T>>(next, pageParams);
      rows.push(...(page.data || []));
      next = page.paging?.next || null;
      pageParams = {};
      pageCount += 1;
    }

    if (next) throw new Error(`Paginação Meta excedeu o limite seguro de ${maxPages} páginas.`);
    return rows;
  }
}

type RawMetaAdAccount = {
  id?: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business?: { id?: string; name?: string };
  user_tasks?: string[];
};

function normalizeAccount(account: RawMetaAdAccount, origin: MetaAccessOrigin, business?: MetaBusinessAsset): MetaAdAccountAsset | null {
  const accountId = String(account.account_id || account.id || "").replace(/^act_/, "").trim();
  if (!accountId) return null;
  const accountBusiness = account.business;
  return {
    id: `act_${accountId}`,
    account_id: accountId,
    name: String(account.name || `Conta ${accountId}`),
    account_status: account.account_status ?? null,
    currency: account.currency || null,
    timezone_name: account.timezone_name || null,
    business_id: business?.id || accountBusiness?.id || null,
    business_name: business?.name || accountBusiness?.name || null,
    access_origin: origin,
    user_tasks: Array.isArray(account.user_tasks) ? account.user_tasks : [],
  };
}

export async function discoverMetaAssets(client: MetaGraphClient) {
  const businessFields = "id,name,verification_status";
  const accountFields = "id,account_id,name,account_status,currency,timezone_name,business,user_tasks";
  const warnings: string[] = [];

  const businesses = await client.getAll<MetaBusinessAsset>("me/businesses", {
    fields: businessFields,
    limit: 100,
  });
  const directAccounts = await client.getAll<RawMetaAdAccount>("me/adaccounts", {
    fields: accountFields,
    limit: 200,
  });

  const accountMap = new Map<string, MetaAdAccountAsset>();
  directAccounts.forEach((raw) => {
    const normalized = normalizeAccount(raw, "user");
    if (normalized) accountMap.set(normalized.account_id, normalized);
  });

  for (let offset = 0; offset < businesses.length; offset += 4) {
    await Promise.all(
      businesses.slice(offset, offset + 4).map(async (business) => {
      for (const [edge, origin] of [["owned_ad_accounts", "owned"], ["client_ad_accounts", "client"]] as const) {
        try {
          const rows = await client.getAll<RawMetaAdAccount>(`${business.id}/${edge}`, {
            fields: accountFields,
            limit: 200,
          });
          rows.forEach((raw) => {
            const normalized = normalizeAccount(raw, origin, business);
            if (!normalized) return;
            const existing = accountMap.get(normalized.account_id);
            if (!existing || existing.access_origin === "user" || origin === "client") {
              accountMap.set(normalized.account_id, normalized);
            }
          });
        } catch (error) {
          warnings.push(`Não foi possível listar ${edge} de ${business.name}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        }
      }
      }),
    );
  }

  return {
    businesses: businesses.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    accounts: Array.from(accountMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    warnings,
  };
}
