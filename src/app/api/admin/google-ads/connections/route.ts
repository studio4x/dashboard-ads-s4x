import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { GoogleAdsService } from "@/services/google-ads-service";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    return NextResponse.json(await GoogleAdsService.listConnections());
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível listar as conexões Google Ads.");
  }
}
