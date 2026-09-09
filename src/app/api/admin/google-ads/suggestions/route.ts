import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { generateClientPerformanceSummary } from "@/lib/ai/client-performance-summary";

export const dynamic = "force-dynamic";
export const maxDuration = 90;
function parseDraft(value: string) {
  const lines = value.split(/\r?\n/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
  const split = value.split(/DESCRI(?:ÇÕES|COES)|DESCRIPTIONS/i);
  const headlineBlock = split[0] || value;
  const descriptionBlock = split[1] || "";
  return { headlines: headlineBlock.split(/\r?\n/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter((line) => line && line.length <= 30).slice(-15), descriptions: descriptionBlock.split(/\r?\n/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter((line) => line && line.length <= 90).slice(0, 4), raw: lines.join("\n") };
}
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(); if (guard) return guard;
  const csrfError = enforceSameOrigin(request); if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:ai-draft", limit: 6, windowMs: 60_000 }); if (rateLimitError) return rateLimitError;
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = body.input && typeof body.input === "object" ? body.input as Record<string, unknown> : body;
    const result = await generateClientPerformanceSummary({
      clientName: String(input.clientName || "Conta Google Ads").slice(0, 120),
      period: { from: "2026-01-01", to: "2026-01-30", days: 30 },
      previousPeriod: { from: "2025-12-02", to: "2025-12-31" },
      current: { cost: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, conversions: 0, cvr: 0, cpa: null },
      previous: { cost: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, conversions: 0, cvr: 0, cpa: null },
      executedOptimizations: [],
      nextActions: [`Gere um rascunho de RSA em português brasileiro com 10 títulos de até 30 caracteres e 4 descrições de até 90 caracteres. Palavras-chave: ${String(input.keywords || "").slice(0, 1500)}. Termos de pesquisa: ${String(input.searchTerms || "").slice(0, 1500)}. Anúncio atual: ${String(input.currentAd || "").slice(0, 2500)}. Página de destino: ${String(input.landingPage || "").slice(0, 500)}. Retorne somente blocos editáveis identificados como TÍTULOS e DESCRIÇÕES.`],
    });
    return NextResponse.json({ draft: parseDraft(result.text), provider: result.provider, generatedWithAi: result.generatedWithAi, fallbackUsed: result.fallbackUsed, warning: "Rascunho criado. Revise e edite tudo antes de preparar qualquer alteração." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar o rascunho." }, { status: 400 }); }
}
