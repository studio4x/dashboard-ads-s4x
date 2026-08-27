import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { MetaMarketingService } from "@/services/meta-marketing-service";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    return NextResponse.json(await MetaMarketingService.listConnections());
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível listar as conexões Meta.");
  }
}
