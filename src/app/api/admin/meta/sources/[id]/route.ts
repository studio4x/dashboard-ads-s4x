import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { MetaMarketingService } from "@/services/meta-marketing-service";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:meta:source:delete", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { id } = await context.params;
    await MetaMarketingService.deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível remover a fonte Meta.");
  }
}
