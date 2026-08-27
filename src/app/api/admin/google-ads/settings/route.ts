import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { getGoogleAdsRedirectUri, getGoogleAdsSettings, resolveGoogleAdsApiVersion, resolveGoogleAdsClientId } from "@/lib/google-ads-api/settings";

const SYNC_INTERVALS = new Set(["manual", "one_hour", "six_hours", "twelve_hours", "daily", "weekly"]);

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const settings = await getGoogleAdsSettings();
    return NextResponse.json({
      settings,
      status: {
        clientIdConfigured: Boolean(resolveGoogleAdsClientId(settings)),
        clientSecretConfigured: Boolean(String(process.env.GOOGLE_ADS_CLIENT_SECRET || "").trim()),
        developerTokenConfigured: Boolean(String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim()),
        clientIdFromEnvironment: !settings.client_id && Boolean(process.env.GOOGLE_ADS_CLIENT_ID),
        apiVersion: resolveGoogleAdsApiVersion(settings),
        redirectUri: getGoogleAdsRedirectUri(new URL(request.url).origin),
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar a configuração Google Ads.");
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:settings", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const apiVersion = typeof body.apiVersion === "string" ? body.apiVersion.trim() : "";
    const historyDays = Number(body.defaultHistoryDays);
    const lookbackDays = Number(body.defaultLookbackDays);
    const syncInterval = typeof body.defaultSyncInterval === "string" ? body.defaultSyncInterval : "";
    if (clientId && !/^[A-Za-z0-9_.-]{20,160}\.apps\.googleusercontent\.com$/.test(clientId)) {
      return NextResponse.json({ error: "OAuth Client ID Google inválido." }, { status: 400 });
    }
    if (!/^v\d+$/.test(apiVersion)) return NextResponse.json({ error: "Use uma versão no formato v25." }, { status: 400 });
    if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 730 || !Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 90) {
      return NextResponse.json({ error: "As janelas de histórico e reprocessamento são inválidas." }, { status: 400 });
    }
    if (!SYNC_INTERVALS.has(syncInterval)) return NextResponse.json({ error: "Intervalo de sincronização inválido." }, { status: 400 });
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const supabase = await createAdminClient({ actor: "api_admin", action: "update_google_ads_settings" });
    const { data, error } = await supabase.from("google_ads_settings").upsert({
      id: "default", client_id: clientId || null, api_version: apiVersion,
      default_history_days: historyDays, default_lookback_days: lookbackDays,
      default_sync_interval: syncInterval, updated_by: user?.id || null,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível salvar a configuração Google Ads.");
  }
}
