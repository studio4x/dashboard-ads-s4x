import { NextResponse } from "next/server";
import { DataSourceService } from "@/services/data-source-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

/**
 * Lista todas as fontes de dados Google Sheets.
 */
export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const sources = await DataSourceService.getAllSources();
    
    // Filtra apenas google_sheets por segurança, embora o service já retorne tudo
    const sheetSources = sources.filter((s: any) => s.type === "google_sheets");

    return NextResponse.json(sheetSources);
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}

/**
 * Cria uma nova fonte de dados Google Sheets.
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:gsheets:create", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const clientId = requireString(body, "clientId");
    const dashboardId = requireString(body, "dashboardId");
    const name = requireString(body, "name", { min: 3, max: 180 });
    const spreadsheetId = requireString(body, "spreadsheetId", { min: 10, max: 220 });
    const syncInterval = typeof body.syncInterval === "string" ? body.syncInterval : undefined;
    const dashboardType = typeof body.dashboardType === "string" ? body.dashboardType : undefined;
    const sourceRoleRaw = typeof body.sourceRole === "string" ? body.sourceRole : undefined;
    const sourceRole = sourceRoleRaw === "google_ads" || sourceRoleRaw === "meta_ads" ? sourceRoleRaw : undefined;

    if (!clientId || !dashboardId || !name || !spreadsheetId) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const source = await DataSourceService.createGoogleSheetSource({
      clientId,
      dashboardId,
      name,
      spreadsheetId,
      syncInterval,
      dashboardType,
      sourceRole
    });

    return NextResponse.json({ success: true, source });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
