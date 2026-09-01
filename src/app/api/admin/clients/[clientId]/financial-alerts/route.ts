import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { EnhancedFinancialAlertService } from "@/services/enhanced-financial-alert-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:financial-alerts:list", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { clientId } = await params;
    const accounts = await EnhancedFinancialAlertService.listClientAccounts(clientId);
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
    const setting = await EnhancedFinancialAlertService.saveClientAccountSetting(clientId, {
      dataSourceId: String(body.dataSourceId || ""),
      provider,
      accountId: String(body.accountId || ""),
      enabled: Boolean(body.enabled),
      thresholdAmount: Number(body.thresholdAmount),
      amountAlertEnabled: body.amountAlertEnabled === undefined ? true : Boolean(body.amountAlertEnabled),
      daysAlertEnabled: Boolean(body.daysAlertEnabled),
      thresholdDays: body.thresholdDays === undefined ? 2 : Number(body.thresholdDays),
      repeatIntervalHours: body.repeatIntervalHours === undefined ? 24 : Number(body.repeatIntervalHours),
    });
    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:financial-alerts:action", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const { clientId } = await params;
    const body = parsed.body || {};
    const settingId = String(body.settingId || "");
    if (!settingId) return NextResponse.json({ success: false, error: "Configuração financeira não informada." }, { status: 400 });

    const accounts = await EnhancedFinancialAlertService.listClientAccounts(clientId);
    if (!accounts.some((account: any) => account.id === settingId)) {
      return NextResponse.json({ success: false, error: "Configuração financeira não pertence ao cliente." }, { status: 404 });
    }

    const action = String(body.action || "inspect");
    if (action === "inspect") {
      const result = await EnhancedFinancialAlertService.inspectSetting(settingId);
      return NextResponse.json({ success: true, result });
    }
    if (action === "run") {
      const result = await EnhancedFinancialAlertService.runSetting(settingId);
      return NextResponse.json({ success: true, result });
    }
    if (action === "test_notification") {
      const result = await EnhancedFinancialAlertService.sendTestNotification(settingId);
      return NextResponse.json({ success: true, result });
    }
    return NextResponse.json({ success: false, error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
