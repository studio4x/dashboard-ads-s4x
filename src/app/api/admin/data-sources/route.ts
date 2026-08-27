import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { DataSourceService } from "@/services/data-source-service";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    return NextResponse.json(await DataSourceService.getAllSources());
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível listar as fontes conectadas.");
  }
}
