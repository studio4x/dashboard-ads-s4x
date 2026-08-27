import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { getMetaMarketingSettings } from "@/lib/meta-marketing/settings";
import { buildMetaAuthorizationUrl, META_OAUTH_STATE_COOKIE } from "@/lib/meta-marketing/oauth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const rateLimitError = enforceRateLimit(request, { key: "admin:meta:oauth", limit: 10, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;
  try {
    const settings = await getMetaMarketingSettings();
    const state = randomBytes(32).toString("hex");
    const response = NextResponse.redirect(buildMetaAuthorizationUrl(settings, state, new URL(request.url).origin));
    response.cookies.set(META_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/admin/meta/oauth",
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin/meta-marketing?connection=configuration_error", request.url));
  }
}
