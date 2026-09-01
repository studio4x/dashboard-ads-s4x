import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { PlatformHealthService } from "@/services/platform-health-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:health:read", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const snapshot = await PlatformHealthService.getSnapshot();
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    return apiErrorResponse(error, "Erro ao carregar a saúde da plataforma.");
  }
}
