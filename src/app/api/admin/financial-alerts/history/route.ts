import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";
import { FinancialAlertAuditService, parseFinancialAlertDateRange } from "@/services/financial-alert-audit-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const rateLimitError = enforceRateLimit(request, {
      key: "admin:financial-alerts:history",
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 500);
    const history = await FinancialAlertAuditService.getHistory(limit, 14);
    return NextResponse.json({ success: true, retentionDays: 14, ...history });
  } catch (error) {
    return apiErrorResponse(error, "Erro ao carregar o histórico de alertas financeiros.");
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const rateLimitError = enforceRateLimit(request, {
      key: "admin:financial-alerts:history:delete",
      limit: 5,
      windowMs: 60_000,
    });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;

    const startDate = requireString(parsed.body, "startDate");
    const endDate = requireString(parsed.body, "endDate");
    if (!startDate || !endDate || !parseFinancialAlertDateRange(startDate, endDate)) {
      return NextResponse.json(
        { error: "Informe um período válido, com data inicial menor ou igual à data final." },
        { status: 400 },
      );
    }

    const deleted = await FinancialAlertAuditService.purgeBetweenDates(startDate, endDate);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return apiErrorResponse(error, "Erro ao limpar o histórico de alertas financeiros.");
  }
}
