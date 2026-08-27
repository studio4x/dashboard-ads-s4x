import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";
import { MetaMarketingService } from "@/services/meta-marketing-service";
import type { MetaAdAccountAsset } from "@/types/meta-marketing";

const SYNC_INTERVALS = new Set(["manual", "one_hour", "six_hours", "twelve_hours", "daily", "weekly"]);

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    return NextResponse.json(await MetaMarketingService.listSources());
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível listar as fontes Meta.");
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:meta:source:create", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const connectionId = requireString(body, "connectionId");
    const clientId = requireString(body, "clientId");
    const dashboardId = requireString(body, "dashboardId");
    const name = requireString(body, "name", { min: 3, max: 180 });
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : null;
    const businessName = typeof body.businessName === "string" ? body.businessName.trim().slice(0, 180) : null;
    const historyDays = Number(body.historyDays);
    const lookbackDays = Number(body.lookbackDays);
    const syncInterval = typeof body.syncInterval === "string" ? body.syncInterval : "";
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    if (!connectionId || !clientId || !dashboardId || !name) return NextResponse.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 730 || !Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 90) {
      return NextResponse.json({ error: "Janelas de importação inválidas." }, { status: 400 });
    }
    if (!SYNC_INTERVALS.has(syncInterval)) return NextResponse.json({ error: "Intervalo de sincronização inválido." }, { status: 400 });
    const safeAccounts: MetaAdAccountAsset[] = accounts.slice(0, 100).flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const value = item as Record<string, unknown>;
      const accountId = String(value.account_id || "").replace(/^act_/, "").trim();
      const accountName = String(value.name || "").trim();
      const accessOrigin = value.access_origin === "owned" || value.access_origin === "client" ? value.access_origin : "user";
      if (!/^\d{5,30}$/.test(accountId) || !accountName) return [];
      return [{
        id: `act_${accountId}`, account_id: accountId, name: accountName.slice(0, 180),
        account_status: Number.isFinite(Number(value.account_status)) ? Number(value.account_status) : null,
        currency: typeof value.currency === "string" ? value.currency.slice(0, 12) : null,
        timezone_name: typeof value.timezone_name === "string" ? value.timezone_name.slice(0, 80) : null,
        business_id: typeof value.business_id === "string" ? value.business_id.slice(0, 40) : null,
        business_name: typeof value.business_name === "string" ? value.business_name.slice(0, 180) : null,
        access_origin: accessOrigin,
      }];
    });
    if (safeAccounts.length !== accounts.length || safeAccounts.length < 1) return NextResponse.json({ error: "Seleção de contas de anúncios inválida." }, { status: 400 });
    const source = await MetaMarketingService.createSource({ connectionId, clientId, dashboardId, name, businessId, businessName, accounts: safeAccounts, historyDays, lookbackDays, syncInterval });
    return NextResponse.json({ success: true, source }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, error instanceof Error ? error.message : "Não foi possível criar a fonte Meta.");
  }
}
