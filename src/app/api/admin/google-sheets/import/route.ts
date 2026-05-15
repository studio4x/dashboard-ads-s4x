import { NextResponse } from "next/server";
import { GoogleSheetsImportService } from "@/lib/google-sheets/google-sheets-import-service";
import { DashboardStore } from "@/data/dashboard-store";
import { requireAdmin } from "@/lib/auth/guards";

export async function POST(request: Request) {
  try {
    // 1. Proteção de Role
    const authError = await requireAdmin();
    if (authError) return authError;

    const { clientId, dashboardId, spreadsheetId, dataSourceId } = await request.json();

    if (!clientId || !dashboardId || !spreadsheetId) {
      return NextResponse.json({ error: "Campos obrigatórios: clientId, dashboardId, spreadsheetId." }, { status: 400 });
    }

    const result = await GoogleSheetsImportService.importDashboardData(clientId, dashboardId, spreadsheetId, dataSourceId);
    
    // Salva o dado normalizado no store (em memória no MVP)
    if (result.success && result.data) {
      DashboardStore.setData(dashboardId, result.data);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Import Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erro desconhecido durante a importação." 
    }, { status: 500 });
  }
}
