import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsApiError } from "@/lib/google-ads-api/client";
import { GoogleAdsMutationService, type GoogleAdsPlatformOperation } from "@/services/google-ads-mutation-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPERATIONS = new Set<GoogleAdsPlatformOperation>([
  "add_campaign_negative_keyword",
  "set_keyword_status",
  "set_ad_status",
  "set_ad_group_status",
  "set_campaign_budget",
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = record(await request.json());
    const sourceId = String(body.sourceId || "").trim();
    const operationType = String(body.operationType || "").trim() as GoogleAdsPlatformOperation;
    const target = record(body.target);
    if (!sourceId || !OPERATIONS.has(operationType)) {
      return NextResponse.json({ error: "Solicitação de alteração inválida." }, { status: 400 });
    }

    const profile = await getSessionProfile();
    const preview = await GoogleAdsMutationService.preview({ sourceId, operationType, target, actorId: profile?.id || null });
    return NextResponse.json({ preview }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao preparar alteração Google Ads:", error);
    const status = error instanceof GoogleAdsApiError && [401, 403].includes(error.statusCode) ? 403 : 400;
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Não foi possível preparar a alteração.",
      googleRequestId: error instanceof GoogleAdsApiError ? error.requestId : null,
      googleErrorCode: error instanceof GoogleAdsApiError ? error.errorCode : null,
    }, { status });
  }
}
