import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile, requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_STATUS = new Set(["pending", "in_progress", "completed", "validated"]);

type AnalyticsRow = {
  observed_date: string;
  metrics: Record<string, unknown> | null;
};

function normalizeTitle(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function actionKey(title: string) {
  return createHash("sha256").update(normalizeTitle(title), "utf8").digest("hex").slice(0, 32);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00Z`).getTime());
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

async function resolvePeriod(sourceId: string, from: string | null, to: string | null) {
  if (isIsoDate(from) && isIsoDate(to) && from <= to) return { from, to };
  const supabase = await createAdminClient();
  const { data: latest, error } = await supabase
    .from("google_ads_analytics_rows")
    .select("observed_date")
    .eq("data_source_id", sourceId)
    .eq("dataset", "campaign_daily")
    .order("observed_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!latest?.observed_date) return null;
  const resolvedTo = String(latest.observed_date);
  return { from: addDays(resolvedTo, -29), to: resolvedTo };
}

async function captureMetrics(sourceId: string, from: string | null, to: string | null) {
  const period = await resolvePeriod(sourceId, from, to);
  if (!period) return null;

  const supabase = await createAdminClient();
  const rows: AnalyticsRow[] = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("google_ads_analytics_rows")
      .select("observed_date,metrics")
      .eq("data_source_id", sourceId)
      .eq("dataset", "campaign_daily")
      .gte("observed_date", period.from)
      .lte("observed_date", period.to)
      .order("observed_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as AnalyticsRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  const impressions = rows.reduce((sum, row) => sum + numberValue(row.metrics?.impressions), 0);
  const clicks = rows.reduce((sum, row) => sum + numberValue(row.metrics?.clicks), 0);
  const cost = rows.reduce((sum, row) => sum + numberValue(row.metrics?.costMicros) / 1_000_000, 0);
  const conversions = rows.reduce((sum, row) => sum + numberValue(row.metrics?.conversions), 0);

  const auctionFields = [
    "searchImpressionShare",
    "searchBudgetLostImpressionShare",
    "searchRankLostImpressionShare",
  ] as const;
  const auction: Record<string, number | null> = {};
  for (const field of auctionFields) {
    let weighted = 0;
    let weight = 0;
    for (const row of rows) {
      const raw = row.metrics?.[field];
      if (raw == null) continue;
      const value = Number(raw);
      const rowImpressions = numberValue(row.metrics?.impressions);
      if (!Number.isFinite(value) || rowImpressions <= 0) continue;
      weighted += value * rowImpressions;
      weight += rowImpressions;
    }
    auction[field] = weight ? weighted / weight : null;
  }

  return {
    period,
    metrics: {
      cost,
      impressions,
      clicks,
      conversions,
      ctr: impressions ? clicks / impressions * 100 : 0,
      cpc: clicks ? cost / clicks : 0,
      cvr: clicks ? conversions / clicks * 100 : 0,
      cpa: conversions ? cost / conversions : null,
    },
    auction,
    capturedAt: new Date().toISOString(),
  };
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
      .select("action_key,action_title,status,note,completed,completed_at,started_at,validated_at,metrics_before,metrics_after,period_from,period_to,updated_at")
      .eq("data_source_id", sourceId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const items = (data || []).map((item) => ({
      ...item,
      status: VALID_STATUS.has(String(item.status)) ? item.status : item.completed ? "completed" : "pending",
    }));

    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
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
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const sourceId = String(body.sourceId || "").trim();
  const title = String(body.actionTitle || "").trim().replace(/\s+/g, " ");
  const explicitStatus = String(body.status || "").trim();
  const legacyCompleted = body.completed === true;
  const status = VALID_STATUS.has(explicitStatus) ? explicitStatus : legacyCompleted ? "completed" : "pending";
  const note = body.note == null ? null : String(body.note).trim().slice(0, 3000);
  const periodFrom = isIsoDate(body.from) ? body.from : null;
  const periodTo = isIsoDate(body.to) ? body.to : null;

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

    const supabase = await createAdminClient();
    const key = actionKey(title);
    const { data: existing, error: existingError } = await supabase
      .from("google_ads_action_progress")
      .select("status,note,started_at,completed_at,validated_at,metrics_before,metrics_after,period_from,period_to")
      .eq("data_source_id", sourceId)
      .eq("action_key", key)
      .maybeSingle();
    if (existingError) throw existingError;

    const now = new Date().toISOString();
    const active = status !== "pending";
    const isCompleted = status === "completed" || status === "validated";
    const isValidated = status === "validated";

    let metricsBefore = existing?.metrics_before || null;
    let metricsAfter = existing?.metrics_after || null;
    if (active && !metricsBefore) {
      metricsBefore = await captureMetrics(sourceId, periodFrom, periodTo);
    }
    if (isValidated) {
      metricsAfter = await captureMetrics(sourceId, periodFrom, periodTo);
    } else if (status !== "validated" && existing?.status === "validated") {
      metricsAfter = existing.metrics_after || null;
    }

    const resolvedStoredPeriod = metricsBefore?.period || metricsAfter?.period || null;
    const payload = {
      data_source_id: sourceId,
      action_key: key,
      action_title: title,
      status,
      note: note == null ? existing?.note || null : note || null,
      completed: isCompleted,
      started_at: active ? existing?.started_at || now : existing?.started_at || null,
      completed_at: isCompleted ? existing?.completed_at || now : null,
      validated_at: isValidated ? now : null,
      completed_by: isCompleted ? profile?.id || null : null,
      metrics_before: metricsBefore,
      metrics_after: metricsAfter,
      period_from: periodFrom || resolvedStoredPeriod?.from || existing?.period_from || null,
      period_to: periodTo || resolvedStoredPeriod?.to || existing?.period_to || null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("google_ads_action_progress")
      .upsert(payload, { onConflict: "data_source_id,action_key" })
      .select("action_key,action_title,status,note,completed,completed_at,started_at,validated_at,metrics_before,metrics_after,period_from,period_to,updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("Erro ao salvar progresso das ações Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível salvar o progresso da ação." }, { status: 500 });
  }
}
