import { NextResponse } from "next/server";
import { GoogleSheetsImportService } from "@/lib/google-sheets/google-sheets-import-service";
import { DashboardStore } from "@/data/dashboard-store";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function POST(request: Request) {
  try {
    // 1. Proteção de Role
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:gsheets:import", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const clientId = requireString(parsed.body, "clientId");
    const dashboardId = requireString(parsed.body, "dashboardId");
    const spreadsheetId = requireString(parsed.body, "spreadsheetId");
    const dataSourceId = requireString(parsed.body, "dataSourceId");

    if (!clientId || !dashboardId || !spreadsheetId) {
      return NextResponse.json({ error: "Campos obrigatórios: clientId, dashboardId, spreadsheetId." }, { status: 400 });
    }

    const result = await GoogleSheetsImportService.importDashboardData(clientId, dashboardId, spreadsheetId, dataSourceId || undefined);
    
    // Salva o dado normalizado no store (em memória no MVP)
    if (result.success && result.data) {
      DashboardStore.setData(dashboardId, result.data);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return apiErrorResponse(error, "Erro desconhecido durante a importação.");
  }
}
