import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { MetaMarketingService } from "@/services/meta-marketing-service";

export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:meta:source:sync", limit: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { id } = await context.params;
    return NextResponse.json(await MetaMarketingService.syncSource(id));
  } catch (error) {
    return apiErrorResponse(error, error instanceof Error ? error.message : "Não foi possível sincronizar a fonte Meta.");
  }
}
