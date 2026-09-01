import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { FinancialAlertService } from "@/services/financial-alert-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:financial-alerts:list", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { clientId } = await params;
    const accounts = await FinancialAlertService.listClientAccounts(clientId);
    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:financial-alerts:update", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const { clientId } = await params;
    const body = parsed.body || {};
    const provider = String(body.provider || "");
    if (provider !== "google_ads" && provider !== "meta_ads") {
      return NextResponse.json({ success: false, error: "Plataforma inválida." }, { status: 400 });
    }
    const setting = await FinancialAlertService.saveClientAccountSetting(clientId, {
      dataSourceId: String(body.dataSourceId || ""),
      provider,
      accountId: String(body.accountId || ""),
      enabled: Boolean(body.enabled),
      thresholdAmount: Number(body.thresholdAmount),
      repeatIntervalHours: body.repeatIntervalHours === undefined ? 24 : Number(body.repeatIntervalHours),
    });
    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
