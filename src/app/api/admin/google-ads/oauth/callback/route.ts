import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { exchangeGoogleAdsAuthorizationCode, GOOGLE_ADS_OAUTH_STATE_COOKIE } from "@/lib/google-ads-api/oauth";
import { getGoogleAdsSettings } from "@/lib/google-ads-api/settings";
import { storeGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";

export const dynamic = "force-dynamic";

function validState(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function redirect(request: Request, status: string) {
  const response = NextResponse.redirect(new URL(`/admin/google-ads-api?connection=${status}`, request.url));
  response.cookies.set(GOOGLE_ADS_OAUTH_STATE_COOKIE, "", { path: "/api/admin/google-ads/oauth", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return redirect(request, "denied");
  const code = String(url.searchParams.get("code") || "");
  const state = String(url.searchParams.get("state") || "");
  const expectedState = String((await cookies()).get(GOOGLE_ADS_OAUTH_STATE_COOKIE)?.value || "");
  if (!code || !state || !expectedState || !validState(expectedState, state)) return redirect(request, "invalid_state");
  try {
    const settings = await getGoogleAdsSettings();
    const token = await exchangeGoogleAdsAuthorizationCode(settings, code, url.origin);
    const googleUserId = token.googleUserId || token.email;
    if (!googleUserId) throw new Error("A identidade da conta Google não foi retornada.");
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const supabase = await createAdminClient({ actor: "api_admin", action: "complete_google_ads_oauth" });
    const { data: existing, error: existingError } = await supabase.from("google_ads_connections")
      .select("id").eq("google_user_id", googleUserId).eq("status", "active").maybeSingle();
    if (existingError) throw existingError;
    const values = {
      name: token.email || `Google ${googleUserId}`, google_user_id: googleUserId,
      google_user_email: token.email, granted_scopes: token.scope, status: "active",
      last_validated_at: new Date().toISOString(), last_error: null, created_by: user?.id || null,
    };
    if (existing?.id) {
      const { error } = await supabase.from("google_ads_connections").update(values).eq("id", existing.id);
      if (error) throw error;
      await storeGoogleAdsRefreshToken(existing.id, token.refreshToken);
    } else {
      const { data: connection, error } = await supabase.from("google_ads_connections").insert(values).select("id").single();
      if (error) throw error;
      try {
        await storeGoogleAdsRefreshToken(connection.id, token.refreshToken);
      } catch (vaultError) {
        await supabase.from("google_ads_connections").delete().eq("id", connection.id);
        throw vaultError;
      }
    }
    return redirect(request, "success");
  } catch (error) {
    console.error("[GOOGLE_ADS_OAUTH_CALLBACK]", { message: error instanceof Error ? error.message : "unknown" });
    return redirect(request, "error");
  }
}
