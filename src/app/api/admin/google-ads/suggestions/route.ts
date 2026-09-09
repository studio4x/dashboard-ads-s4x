import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { generateGoogleAdsRsaDraft } from "@/lib/ai/google-ads-rsa-draft";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(); if (guard) return guard;
  const csrfError = enforceSameOrigin(request); if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:ai-draft", limit: 6, windowMs: 60_000 }); if (rateLimitError) return rateLimitError;
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = body.input && typeof body.input === "object" ? body.input as Record<string, unknown> : body;
    const currentAd = record(input.currentAd);
    const evidence = Array.isArray(input.evidence) ? input.evidence.map((item) => {
      const value = record(item);
      return { text: String(value.text || ""), qualityScore: value.qualityScore == null ? null : Number(value.qualityScore), clicks: Number(value.clicks || 0), conversions: Number(value.conversions || 0) };
    }) : [];
    const result = await generateGoogleAdsRsaDraft({
      objective: String(input.objective || "Melhorar relevância do anúncio").slice(0, 500),
      keywords: strings(input.keywords).slice(0, 20),
      currentAd: { headlines: strings(currentAd.headlines), descriptions: strings(currentAd.descriptions), finalUrls: strings(currentAd.finalUrls) },
      evidence,
      landingPage: String(input.landingPage || "").slice(0, 500),
    });
    return NextResponse.json({ draft: { headlines: result.headlines, descriptions: result.descriptions }, provider: result.provider, generatedWithAi: result.generatedWithAi, fallbackUsed: result.fallbackUsed, warning: "Rascunho criado. Revise e edite tudo antes de preparar qualquer alteração." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar o rascunho." }, { status: 400 }); }
}
