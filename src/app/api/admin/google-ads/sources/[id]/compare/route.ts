import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { GoogleAdsService } from "@/services/google-ads-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:source:compare", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { id } = await context.params;
    return NextResponse.json(await GoogleAdsService.compareWithGoogleSheets(id));
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível comparar Google Ads API e Google Sheets.");
  }
}
