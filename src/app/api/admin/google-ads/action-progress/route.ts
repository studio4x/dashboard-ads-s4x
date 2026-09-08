import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeTitle(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function actionKey(title: string) {
  return createHash("sha256").update(normalizeTitle(title), "utf8").digest("hex").slice(0, 32);
}

async function validateSource(sourceId: string) {
  const supabase = await createAdminClient();
  const { data: source, error } = await supabase
    .from("data_sources")
    .select("id,type,status")
    .eq("id", sourceId)
    .eq("type", "google_ads")
    .maybeSingle();

  if (error) throw error;
  return source || null;
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const sourceId = String(request.nextUrl.searchParams.get("sourceId") || "").trim();
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId é obrigatório." }, { status: 400 });
  }

  try {
    const source = await validateSource(sourceId);
    if (!source) {
      return NextResponse.json({ error: "Fonte Google Ads não encontrada." }, { status: 404 });
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("google_ads_action_progress")
      .select("action_key,action_title,completed,completed_at,updated_at")
      .eq("data_source_id", sourceId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao carregar progresso das ações Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível carregar o progresso das ações." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const sourceId = String(body.sourceId || "").trim();
  const title = String(body.actionTitle || "").trim().replace(/\s+/g, " ");
  const completed = body.completed === true;

  if (!sourceId || !title) {
    return NextResponse.json({ error: "sourceId e actionTitle são obrigatórios." }, { status: 400 });
  }
  if (title.length > 320) {
    return NextResponse.json({ error: "Título da ação é muito longo." }, { status: 400 });
  }

  try {
    const [source, profile] = await Promise.all([validateSource(sourceId), getSessionProfile()]);
    if (!source) {
      return NextResponse.json({ error: "Fonte Google Ads não encontrada." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const supabase = await createAdminClient();
    const payload = {
      data_source_id: sourceId,
      action_key: actionKey(title),
      action_title: title,
      completed,
      completed_at: completed ? now : null,
      completed_by: completed ? profile?.id || null : null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("google_ads_action_progress")
      .upsert(payload, { onConflict: "data_source_id,action_key" })
      .select("action_key,action_title,completed,completed_at,updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("Erro ao salvar progresso das ações Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível salvar o progresso da ação." }, { status: 500 });
  }
}
