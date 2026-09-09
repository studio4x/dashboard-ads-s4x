import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsApiError } from "@/lib/google-ads-api/client";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { assertStoredGoogleAdsChangePolicy } from "@/services/google-ads-change-policy";
import { GoogleAdsMutationService } from "@/services/google-ads-mutation-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;
  const csrfError = enforceSameOrigin(request);
  if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:change-execute", limit: 8, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  try {
    const body = record(await request.json());
    const requestId = String(body.requestId || "").trim();
    const previewHash = String(body.previewHash || "").trim();
    const confirmation = String(body.confirmation || "").trim().toUpperCase();
    const acceptedConfirmations = new Set(["APLICAR", "CONFIRMAR ALTERAÇÃO DE LANCES", "CONFIRMAR ALTERAÇÃO CRÍTICA"]);
    if (!requestId || !previewHash || !acceptedConfirmations.has(confirmation)) {
      return NextResponse.json({ error: "Confirmação explícita obrigatória antes de alterar o Google Ads." }, { status: 400 });
    }

    await assertStoredGoogleAdsChangePolicy(requestId);
    const profile = await getSessionProfile();
    const result = await GoogleAdsMutationService.execute({ requestId, previewHash, confirmation, actorId: profile?.id || null, actorRole: profile?.role || null });
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao executar alteração Google Ads:", error);
    const stale = error instanceof Error && error.name === "STALE_PREVIEW";
    const status = stale ? 409 : error instanceof GoogleAdsApiError && [401, 403].includes(error.statusCode) ? 403 : 400;
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Não foi possível aplicar a alteração.",
      code: stale ? "STALE_PREVIEW" : error instanceof GoogleAdsApiError ? error.errorCode : null,
      googleRequestId: error instanceof GoogleAdsApiError ? error.requestId : null,
    }, { status });
  }
}
