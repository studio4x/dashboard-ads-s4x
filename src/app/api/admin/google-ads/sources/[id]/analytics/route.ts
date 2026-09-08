import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { GoogleAdsService } from "@/services/google-ads-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:source:analytics", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { id } = await context.params;
    const url = new URL(request.url);
    return NextResponse.json(await GoogleAdsService.queryAnalytics(id, {
      dataset: url.searchParams.get("dataset"), from: url.searchParams.get("from"), to: url.searchParams.get("to"),
      campaignId: url.searchParams.get("campaign_id"), adGroupId: url.searchParams.get("ad_group_id"),
      device: url.searchParams.get("device"), network: url.searchParams.get("network"), limit: Number(url.searchParams.get("limit") || 1000),
    }));
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível consultar os dados analíticos Google Ads.");
  }
}
