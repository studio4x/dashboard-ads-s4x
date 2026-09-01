import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { FinancialAlertAuditService } from "@/services/financial-alert-audit-service";

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
    const history = await FinancialAlertAuditService.getHistory(limit);
    return NextResponse.json({ success: true, ...history });
  } catch (error) {
    return apiErrorResponse(error, "Erro ao carregar o histórico de alertas financeiros.");
  }
}
