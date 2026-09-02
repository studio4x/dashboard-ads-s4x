import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { OperationalActivityService } from "@/services/operational-activity-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:activity:read", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const limit = Number(searchParams.get("limit") || 600);
    const items = await OperationalActivityService.getTimeline({ clientId, limit });
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, "Erro ao carregar a atividade operacional.");
  }
}
