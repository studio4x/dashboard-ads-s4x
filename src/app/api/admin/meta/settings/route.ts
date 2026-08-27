import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { getMetaMarketingSettings, getMetaRedirectUri, resolveMetaAppId } from "@/lib/meta-marketing/settings";

const SYNC_INTERVALS = new Set(["manual", "one_hour", "six_hours", "twelve_hours", "daily", "weekly"]);

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const settings = await getMetaMarketingSettings();
    return NextResponse.json({
      settings,
      status: {
        appIdConfigured: Boolean(resolveMetaAppId(settings)),
        appSecretConfigured: Boolean(String(process.env.META_APP_SECRET || "").trim()),
        appIdFromEnvironment: !settings.app_id && Boolean(process.env.META_APP_ID),
        redirectUri: getMetaRedirectUri(new URL(request.url).origin),
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar a configuração da Meta.");
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:meta:settings", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;

    const appId = typeof body.appId === "string" ? body.appId.trim() : "";
    const loginConfigId = typeof body.loginConfigId === "string" ? body.loginConfigId.trim() : "";
    const apiVersion = typeof body.apiVersion === "string" ? body.apiVersion.trim() : "";
    const historyDays = Number(body.defaultHistoryDays);
    const lookbackDays = Number(body.defaultLookbackDays);
    const syncInterval = typeof body.defaultSyncInterval === "string" ? body.defaultSyncInterval : "";
    if ((appId && !/^\d{5,30}$/.test(appId)) || (loginConfigId && !/^\d{5,40}$/.test(loginConfigId))) {
      return NextResponse.json({ error: "App ID ou ID da configuração de login inválido." }, { status: 400 });
    }
    if (!/^v\d+\.\d+$/.test(apiVersion)) {
      return NextResponse.json({ error: "Use uma versão no formato v26.0." }, { status: 400 });
    }
    if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 730 || !Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 90) {
      return NextResponse.json({ error: "As janelas de histórico e reprocessamento são inválidas." }, { status: 400 });
    }
    if (!SYNC_INTERVALS.has(syncInterval)) {
      return NextResponse.json({ error: "Intervalo de sincronização inválido." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const supabase = await createAdminClient({ actor: "api_admin", action: "update_meta_settings" });
    const { data, error } = await supabase.from("meta_marketing_settings").upsert({
      id: "default",
      app_id: appId || null,
      login_config_id: loginConfigId || null,
      api_version: apiVersion,
      default_history_days: historyDays,
      default_lookback_days: lookbackDays,
      default_sync_interval: syncInterval,
      updated_by: user?.id || null,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível salvar a configuração da Meta.");
  }
}
