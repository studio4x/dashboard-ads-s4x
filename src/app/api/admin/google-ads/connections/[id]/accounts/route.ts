import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { GoogleAdsService } from "@/services/google-ads-service";

export const maxDuration = 120;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:accounts", limit: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { id } = await context.params;
    return NextResponse.json(await GoogleAdsService.discoverAccounts(id));
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível listar as contas Google Ads.");
  }
}
