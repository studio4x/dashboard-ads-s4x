import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function validateSource(sourceId: string) {
  const supabase = await createAdminClient();
  const { data: source, error } = await supabase.from("data_sources").select("id,type").eq("id", sourceId).eq("type", "google_ads").maybeSingle();
  if (error) throw error;
  return source || null;
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;
  const sourceId = String(request.nextUrl.searchParams.get("sourceId") || "").trim();
  if (!sourceId) return NextResponse.json({ error: "sourceId é obrigatório." }, { status: 400 });

  try {
    if (!(await validateSource(sourceId))) return NextResponse.json({ error: "Fonte Google Ads não encontrada." }, { status: 404 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from("google_ads_action_dismissals").select("action_key,action_title,dismissed_at").eq("data_source_id", sourceId).order("dismissed_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ items: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao carregar sugestões descartadas do Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível carregar as sugestões descartadas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;
  const csrfError = enforceSameOrigin(request);
  if (csrfError) return csrfError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:action-dismissals", limit: 30, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const sourceId = String(body.sourceId || "").trim();
  const actionKey = String(body.actionKey || "").trim();
  const actionTitle = String(body.actionTitle || "").trim().replace(/\s+/g, " ");
  const dismissed = body.dismissed !== false;
  if (!sourceId || !actionKey || !actionTitle) return NextResponse.json({ error: "sourceId, actionKey e actionTitle são obrigatórios." }, { status: 400 });
  if (actionKey.length > 300 || actionTitle.length > 500) return NextResponse.json({ error: "Identificação da sugestão é muito longa." }, { status: 400 });

  try {
    const [source, profile] = await Promise.all([validateSource(sourceId), getSessionProfile()]);
    if (!source) return NextResponse.json({ error: "Fonte Google Ads não encontrada." }, { status: 404 });
    const supabase = await createAdminClient();
    if (!dismissed) {
      const { error } = await supabase.from("google_ads_action_dismissals").delete().eq("data_source_id", sourceId).eq("action_key", actionKey);
      if (error) throw error;
      return NextResponse.json({ dismissed: false, actionKey });
    }
    const { data, error } = await supabase.from("google_ads_action_dismissals").upsert({ data_source_id: sourceId, action_key: actionKey, action_title: actionTitle, dismissed_by: profile?.id || null, dismissed_at: new Date().toISOString() }, { onConflict: "data_source_id,action_key" }).select("action_key,action_title,dismissed_at").single();
    if (error) throw error;
    return NextResponse.json({ dismissed: true, item: data });
  } catch (error) {
    console.error("Erro ao salvar descarte de sugestão Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível atualizar o descarte da sugestão." }, { status: 500 });
  }
}
