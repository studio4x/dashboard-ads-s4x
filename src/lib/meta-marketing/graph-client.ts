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

export class MetaGraphError extends Error {
  code?: number;
  subcode?: number;
  transient: boolean;

  constructor(message: string, body?: GraphErrorBody) {
    super(message);
    this.name = "MetaGraphError";
    this.code = body?.error?.code;
    this.subcode = body?.error?.error_subcode;
    this.transient = Boolean(body?.error?.is_transient);
  }
}

export class MetaGraphClient {
  private readonly baseUrl: string;
  private readonly appSecretProof: string;
  private readonly accessToken: string;

  constructor(
    accessToken: string,
    apiVersion: string,
    appSecret: string,
  ) {
    this.accessToken = accessToken;
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`;
    this.appSecretProof = createHmac("sha256", appSecret).update(accessToken).digest("hex");
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

  async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const response = await fetch(this.buildUrl(path, params), {
      method: "GET",
      headers: { Authorization: `Bearer ${this.accessToken}` },
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as T & GraphErrorBody;
    if (!response.ok || body?.error) {
      const safeMessage = body?.error?.message || `Meta Graph API respondeu HTTP ${response.status}.`;
      throw new MetaGraphError(safeMessage, body);
    }
    return body as T;
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
