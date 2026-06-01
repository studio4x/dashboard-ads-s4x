import { NextResponse } from "next/server";
import { ShareService } from "@/services/share-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:sharelinks:create", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const dashboardId = requireString(body, "dashboardId");
    const name = typeof body.name === "string" ? body.name : undefined;
    const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt : undefined;

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId is required" }, { status: 400 });
    }

    const result = await ShareService.createShareLink(dashboardId, name, expiresAt);

    // Ocultar token_hash do retorno
    const { token_hash, ...safeLink } = result.link;

    // Retorna o link salvo (sem hash) e o rawToken
    return NextResponse.json({
      link: safeLink,
      rawToken: result.rawToken
    });
  } catch (error: any) {
    console.error("Error creating share link:", error);
    return apiErrorResponse(error);
  }
}
