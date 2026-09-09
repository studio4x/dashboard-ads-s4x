import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { GoogleAdsAdvancedMutationService } from "@/services/google-ads-advanced-mutation-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(); if (guard) return guard;
  const sourceId = String(request.nextUrl.searchParams.get("sourceId") || "").trim();
  if (!sourceId) return NextResponse.json({ error: "sourceId é obrigatório." }, { status: 400 });
  try { return NextResponse.json({ items: await GoogleAdsAdvancedMutationService.recommendations(sourceId) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível consultar recomendações." }, { status: 400 }); }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(); if (guard) return guard;
  const csrfError = enforceSameOrigin(request); if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:recommendations", limit: 10, windowMs: 60_000 }); if (rateLimitError) return rateLimitError;
  try {
    const body = await request.json() as Record<string, unknown>; const sourceId = String(body.sourceId || "").trim(); const operationType = body.action === "dismiss" ? "dismiss_google_recommendation" : "apply_google_recommendation"; const recommendationResourceName = String(body.recommendationResourceName || "").trim();
    const preview = await GoogleAdsAdvancedMutationService.preview({ sourceId, operationType, target: { recommendationResourceName, recommendationType: body.recommendationType, parameters: body.parameters }, origin: "GOOGLE_RECOMMENDATION", actorId: null });
    return NextResponse.json({ preview });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível preparar a recomendação." }, { status: 400 }); }
}
