import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { AutomationExecutionService } from "@/services/automation-execution-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:client:automation-history:read", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const history = await AutomationExecutionService.listForClient(clientId, Number(searchParams.get("limit") || 100));
    return NextResponse.json({ success: true, history });
  } catch (error) {
    return apiErrorResponse(error, "Erro ao carregar o histórico de automações.");
  }
}
