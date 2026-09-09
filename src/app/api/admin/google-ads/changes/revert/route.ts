import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsApiError } from "@/lib/google-ads-api/client";
import { requireSameOrigin } from "@/lib/security/same-origin-request";
import { GoogleAdsMutationService } from "@/services/google-ads-mutation-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = record(await request.json());
    const requestId = String(body.requestId || "").trim();
    const confirmation = String(body.confirmation || "").trim().toUpperCase();
    if (!requestId || confirmation !== "DESFAZER") {
      return NextResponse.json({ error: "Confirmação explícita obrigatória para desfazer a alteração." }, { status: 400 });
    }
    const profile = await getSessionProfile();
    const result = await GoogleAdsMutationService.revert({ requestId, actorId: profile?.id || null });
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao reverter alteração Google Ads:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Não foi possível desfazer a alteração.",
      googleRequestId: error instanceof GoogleAdsApiError ? error.requestId : null,
      googleErrorCode: error instanceof GoogleAdsApiError ? error.errorCode : null,
    }, { status: 400 });
  }
}
