import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { GoogleAdsAdvancedMutationService } from "@/services/google-ads-advanced-mutation-service";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(); if (guard) return guard;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:geo-targets", limit: 30, windowMs: 60_000 }); if (rateLimitError) return rateLimitError;
  const sourceId = String(request.nextUrl.searchParams.get("sourceId") || "").trim(); const query = String(request.nextUrl.searchParams.get("q") || "").trim(); const countryCode = String(request.nextUrl.searchParams.get("countryCode") || "BR").trim();
  if (!sourceId || !query) return NextResponse.json({ error: "sourceId e q são obrigatórios." }, { status: 400 });
  try { return NextResponse.json({ items: await GoogleAdsAdvancedMutationService.geoSuggestions(sourceId, query, countryCode) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível buscar localizações." }, { status: 400 }); }
}
