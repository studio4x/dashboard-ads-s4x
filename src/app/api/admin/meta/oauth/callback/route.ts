import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { exchangeMetaAuthorizationCode, debugMetaAccessToken, META_OAUTH_STATE_COOKIE } from "@/lib/meta-marketing/oauth";
import { getMetaMarketingSettings, requireMetaAppSecret, resolveMetaApiVersion } from "@/lib/meta-marketing/settings";
import { MetaGraphClient } from "@/lib/meta-marketing/graph-client";
import { storeMetaAccessToken } from "@/lib/meta-marketing/token-vault";

export const dynamic = "force-dynamic";

function validState(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function redirect(request: Request, status: string) {
  const response = NextResponse.redirect(new URL(`/admin/meta-marketing?connection=${status}`, request.url));
  response.cookies.set(META_OAUTH_STATE_COOKIE, "", { path: "/api/admin/meta/oauth", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return redirect(request, "denied");
  const code = String(url.searchParams.get("code") || "");
  const state = String(url.searchParams.get("state") || "");
  const cookieStore = await cookies();
  const expectedState = String(cookieStore.get(META_OAUTH_STATE_COOKIE)?.value || "");
  if (!code || !state || !expectedState || !validState(expectedState, state)) return redirect(request, "invalid_state");

  try {
    const settings = await getMetaMarketingSettings();
    const tokenResponse = await exchangeMetaAuthorizationCode(settings, code, url.origin);
    const debug = await debugMetaAccessToken(settings, tokenResponse.access_token!);
    const graph = new MetaGraphClient(tokenResponse.access_token!, resolveMetaApiVersion(settings), requireMetaAppSecret());
    const profile = await graph.get<{ id: string; name?: string }>("me", { fields: "id,name" });
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const supabase = await createAdminClient({ actor: "api_admin", action: "complete_meta_oauth" });
    const { data: existing, error: existingError } = await supabase
      .from("meta_business_connections")
      .select("id")
      .eq("meta_user_id", profile.id)
      .eq("status", "active")
      .maybeSingle();
    if (existingError) throw existingError;
    const expirySeconds = Number(debug.expires_at || 0) || (tokenResponse.expires_in ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in : 0);
    const values = {
      name: profile.name || `Meta ${profile.id}`,
      meta_user_id: profile.id,
      meta_user_name: profile.name || null,
      token_expires_at: expirySeconds > 0 ? new Date(expirySeconds * 1000).toISOString() : null,
      granted_scopes: debug.scopes || [],
      status: "active",
      last_validated_at: new Date().toISOString(),
      last_error: null,
      created_by: user?.id || null,
    };
    const connectionId = existing?.id;
    if (connectionId) {
      const { error } = await supabase.from("meta_business_connections").update(values).eq("id", connectionId);
      if (error) throw error;
      await storeMetaAccessToken(connectionId, tokenResponse.access_token!);
    } else {
      const { data: connection, error } = await supabase.from("meta_business_connections").insert(values).select("id").single();
      if (error) throw error;
      await storeMetaAccessToken(connection.id, tokenResponse.access_token!);
    }
    return redirect(request, "success");
  } catch (error) {
    console.error("[META_OAUTH_CALLBACK]", { message: error instanceof Error ? error.message : "unknown" });
    return redirect(request, "error");
  }
}
