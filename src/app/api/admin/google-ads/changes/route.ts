import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsMutationService } from "@/services/google-ads-mutation-service";
import { getSessionProfile } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { googleAdsHighRiskWritesEnabled, googleAdsWritesEnabled } from "@/lib/google-ads-api/risk-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const sourceId = String(request.nextUrl.searchParams.get("sourceId") || "").trim();
  if (!sourceId) return NextResponse.json({ error: "sourceId é obrigatório." }, { status: 400 });
  try {
    const items = await GoogleAdsMutationService.history(sourceId);
    const supabase = await createAdminClient({ actor: "api_admin", action: "read_google_ads_write_controls" });
    const { data: source } = await supabase.from("google_ads_sources").select("write_enabled").eq("data_source_id", sourceId).maybeSingle();
    return NextResponse.json({ items, controls: { sourceEnabled: source?.write_enabled === true, globalEnabled: googleAdsWritesEnabled(), highRiskEnabled: googleAdsHighRiskWritesEnabled() } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao listar alterações Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível carregar o histórico de alterações." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;
  const csrfError = enforceSameOrigin(request);
  if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:write-controls", limit: 10, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  const profile = await getSessionProfile();
  if (profile?.role !== "owner") return NextResponse.json({ error: "Somente owner pode alterar a escrita por fonte." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const sourceId = String(body.sourceId || "").trim();
    if (!sourceId || typeof body.enabled !== "boolean") return NextResponse.json({ error: "sourceId e enabled são obrigatórios." }, { status: 400 });
    const supabase = await createAdminClient({ actor: "api_admin", action: "update_google_ads_write_controls" });
    const { error } = await supabase.from("google_ads_sources").update({ write_enabled: body.enabled, updated_at: new Date().toISOString() }).eq("data_source_id", sourceId);
    if (error) throw error;
    return NextResponse.json({ sourceEnabled: body.enabled });
  } catch (error) {
    console.error("Erro ao alterar controle de escrita Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível alterar o controle de escrita." }, { status: 500 });
  }
}
