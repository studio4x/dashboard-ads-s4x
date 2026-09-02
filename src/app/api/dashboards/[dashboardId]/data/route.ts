import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { getSessionProfile, requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { normalizeFinancialAccountId } from "@/lib/financial-alerts";
import { EnhancedFinancialAlertService } from "@/services/enhanced-financial-alert-service";

function attachFinancialAlert(status: any, settings: any[]) {
  if (!status || typeof status !== "object") return status;
  const provider = String(status.provider || "");
  const accountId = normalizeFinancialAccountId(status.accountId);
  const match = settings.find((setting) => (
    String(setting.provider) === provider
    && normalizeFinancialAccountId(setting.accountId).replace(/-/g, "") === accountId.replace(/-/g, "")
  ));
  if (!match) return status;
  return {
    ...status,
    alertThresholdAmount: Number(match.thresholdAmount),
    alertAmountEnabled: Boolean(match.amountAlertEnabled),
    alertDaysEnabled: Boolean(match.daysAlertEnabled),
    alertThresholdDays: Number(match.thresholdDays ?? 2),
    configuredFinancialAlertState: match.lastState || "unknown",
    configuredFinancialAlertTrigger: match.lastTriggerType || null,
  };
}

function attachFinancialAlerts(data: any, settings: any[]) {
  if (!data || settings.length === 0) return data;
  const decorateList = (value: any) => Array.isArray(value) ? value.map((item) => attachFinancialAlert(item, settings)) : value;
  return {
    ...data,
    financialStatus: attachFinancialAlert(data.financialStatus, settings),
    financialStatuses: decorateList(data.financialStatuses),
    googleFinancialStatus: attachFinancialAlert(data.googleFinancialStatus, settings),
    metaFinancialStatuses: decorateList(data.metaFinancialStatuses),
    googlePayload: data.googlePayload ? {
      ...data.googlePayload,
      financialStatus: attachFinancialAlert(data.googlePayload.financialStatus, settings),
      financialStatuses: decorateList(data.googlePayload.financialStatuses),
    } : data.googlePayload,
    metaPayload: data.metaPayload ? {
      ...data.metaPayload,
      financialStatus: attachFinancialAlert(data.metaPayload.financialStatus, settings),
      financialStatuses: decorateList(data.metaPayload.financialStatuses),
    } : data.metaPayload,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const rateLimitError = enforceRateLimit(request, { key: "dashboard:data:read", limit: 120, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { dashboardId } = await params;
    let viewerRole: string = "viewer";
    const { searchParams } = new URL(request.url);
    const shareTokenHeader = request.headers.get("x-share-token");
    const shareTokenQuery = searchParams.get("share_token");
    const shareToken = (shareTokenHeader || shareTokenQuery || "").trim() || null;

    if (shareToken) {
      const { ShareService } = await import("@/services/share-service");
      const shareData = await ShareService.validateShareToken(shareToken);
      if (!shareData.isValid || shareData.link?.dashboard_id !== dashboardId) {
        return NextResponse.json({ error: "Token inválido, expirado ou não autorizado para este dashboard." }, { status: 403 });
      }
      viewerRole = "viewer";
    } else {
      const authError = await requireDashboardAccess(dashboardId);
      if (authError) return authError;
      const profile = await getSessionProfile();
      viewerRole = profile?.role || "viewer";
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const [data, financialAlertSettings] = await Promise.all([
      getDashboardData(dashboardId, {
        from: from || undefined,
        to: to || undefined,
        bypassRls: Boolean(shareToken),
      }),
      EnhancedFinancialAlertService.getDashboardPublicSettings(dashboardId).catch(() => []),
    ]);

    if (!data && process.env.GOOGLE_SHEETS_USE_MOCKS !== "true") {
      return NextResponse.json({
        error: "Dados não encontrados. Por favor, execute uma importação na área administrativa.",
        needsImport: true,
      }, { status: 404 });
    }

    const enrichedData = attachFinancialAlerts(data, financialAlertSettings);
    return NextResponse.json({ ...enrichedData, viewerRole, financialAlertSettings });
  } catch (error: any) {
    console.error("Dashboard Data API Error:", error);
    return apiErrorResponse(error, "Erro ao carregar dados do dashboard.");
  }
}
