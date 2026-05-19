import { NextResponse } from "next/server";
import { DataSourceService } from "@/services/data-source-service";
import { requireAdmin } from "@/lib/auth/guards";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Cria uma nova fonte de dados Google Sheets.
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { clientId, dashboardId, name, spreadsheetId, syncInterval } = body;

    if (!clientId || !dashboardId || !name || !spreadsheetId) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const source = await DataSourceService.createGoogleSheetSource({
      clientId,
      dashboardId,
      name,
      spreadsheetId,
      syncInterval
    });

    return NextResponse.json({ success: true, source });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
