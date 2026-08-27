import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { getGoogleAdsSettings } from "@/lib/google-ads-api/settings";
import { buildGoogleAdsAuthorizationUrl, GOOGLE_ADS_OAUTH_STATE_COOKIE } from "@/lib/google-ads-api/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:oauth", limit: 10, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  try {
    const settings = await getGoogleAdsSettings();
    const state = randomBytes(32).toString("hex");
    const response = NextResponse.redirect(buildGoogleAdsAuthorizationUrl(settings, state, new URL(request.url).origin));
    response.cookies.set(GOOGLE_ADS_OAUTH_STATE_COOKIE, state, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/api/admin/google-ads/oauth", maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin/google-ads-api?connection=configuration_error", request.url));
  }
}
