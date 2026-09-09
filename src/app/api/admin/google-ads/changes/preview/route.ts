import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsApiError } from "@/lib/google-ads-api/client";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { assertGoogleAdsChangePolicy } from "@/services/google-ads-change-policy";
import { GoogleAdsMutationService, type GoogleAdsPlatformOperation } from "@/services/google-ads-mutation-service";
import { isGoogleAdsPlatformOperation } from "@/types/google-ads-mutations";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 90;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const ALLOWED_ORIGINS = new Set(["S4X_ANALYSIS", "GOOGLE_RECOMMENDATION", "MANUAL", "AI_DRAFT"]);

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;
  const csrfError = enforceSameOrigin(request);
  if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:change-preview", limit: 20, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  try {
    const body = record(await request.json());
    const sourceId = String(body.sourceId || "").trim();
    const operationType = String(body.operationType || "").trim() as GoogleAdsPlatformOperation;
    const target = record(body.target);
    const requestedOrigin = String(body.origin || "MANUAL").trim().toUpperCase();
    const origin = ALLOWED_ORIGINS.has(requestedOrigin) ? requestedOrigin : "MANUAL";
    if (!sourceId || !isGoogleAdsPlatformOperation(operationType)) {
      return NextResponse.json({ error: "Solicitação de alteração inválida." }, { status: 400 });
    }

    await assertGoogleAdsChangePolicy(sourceId, operationType, target);
    const profile = await getSessionProfile();
    const preview = await GoogleAdsMutationService.preview({ sourceId, operationType, target, origin, actorId: profile?.id || null });
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
