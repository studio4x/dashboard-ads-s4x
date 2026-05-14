import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { requireDashboardAccess } from "@/lib/auth/guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    
    // 1. Verifica Autenticação e Acesso ao Dashboard (Helper Centralizado)
    const authError = await requireDashboardAccess(dashboardId);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    
    // 2. Busca os dados (Mocks ou Snapshot)
    const data = await getDashboardData(dashboardId, { from: from || undefined, to: to || undefined });

    if (!data && process.env.GOOGLE_SHEETS_USE_MOCKS !== "true") {
      return NextResponse.json({ 
        error: "Dados não encontrados. Por favor, execute uma importação na área administrativa.",
        needsImport: true 
      }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Dashboard Data API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
