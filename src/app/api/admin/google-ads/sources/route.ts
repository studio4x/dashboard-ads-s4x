import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { GoogleAdsService } from "@/services/google-ads-service";
import type { GoogleAdsAccessibleAccount } from "@/types/google-ads-api";

const SYNC_INTERVALS = new Set(["manual", "one_hour", "six_hours", "twelve_hours", "daily", "weekly"]);

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    return NextResponse.json(await GoogleAdsService.listSources());
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível listar as fontes Google Ads.");
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:source:create", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const dashboardId = typeof body.dashboardId === "string" ? body.dashboardId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const historyDays = Number(body.historyDays);
    const lookbackDays = Number(body.lookbackDays);
    const syncInterval = typeof body.syncInterval === "string" ? body.syncInterval : "";
    const rawAccount = body.account && typeof body.account === "object" && !Array.isArray(body.account) ? body.account as Record<string, unknown> : null;
    if (!connectionId || !clientId || !dashboardId || name.length < 3 || !rawAccount) {
      return NextResponse.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    }
    if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 730 || !Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 90) {
      return NextResponse.json({ error: "Janelas de importação inválidas." }, { status: 400 });
    }
    if (!SYNC_INTERVALS.has(syncInterval)) return NextResponse.json({ error: "Intervalo de sincronização inválido." }, { status: 400 });
    const customerId = String(rawAccount.customerId || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(customerId)) return NextResponse.json({ error: "Customer ID inválido." }, { status: 400 });
    const account: GoogleAdsAccessibleAccount = {
      customerId, formattedCustomerId: String(rawAccount.formattedCustomerId || customerId),
      descriptiveName: String(rawAccount.descriptiveName || customerId), manager: rawAccount.manager === true,
      testAccount: typeof rawAccount.testAccount === "boolean" ? rawAccount.testAccount : null,
      currencyCode: typeof rawAccount.currencyCode === "string" ? rawAccount.currencyCode : null,
      timeZone: typeof rawAccount.timeZone === "string" ? rawAccount.timeZone : null,
      status: typeof rawAccount.status === "string" ? rawAccount.status : null,
      level: Number.isFinite(Number(rawAccount.level)) ? Number(rawAccount.level) : null,
      parentManagerCustomerId: rawAccount.parentManagerCustomerId ? String(rawAccount.parentManagerCustomerId).replace(/\D/g, "") : null,
      parentManagerName: typeof rawAccount.parentManagerName === "string" ? rawAccount.parentManagerName : null,
      loginCustomerId: rawAccount.loginCustomerId ? String(rawAccount.loginCustomerId).replace(/\D/g, "") : null,
      loginCustomerName: typeof rawAccount.loginCustomerName === "string" ? rawAccount.loginCustomerName : null,
      directlyAccessible: rawAccount.directlyAccessible === true,
    };
    const source = await GoogleAdsService.createSource({ connectionId, clientId, dashboardId, name, account, historyDays, lookbackDays, syncInterval });
    return NextResponse.json({ success: true, source }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível vincular a fonte Google Ads.");
  }
}
