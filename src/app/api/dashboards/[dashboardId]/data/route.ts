import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { requireDashboardAccess } from "@/lib/auth/guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get("share_token");

    // 1. Verifica Autenticação e Acesso
    if (shareToken) {
      const { ShareService } = await import("@/services/share-service");
      const shareData = await ShareService.validateShareToken(shareToken);
      if (!shareData.isValid || shareData.link?.dashboard_id !== dashboardId) {
        return NextResponse.json({ error: "Token inválido, expirado ou não autorizado para este dashboard." }, { status: 403 });
      }
    } else {
      const authError = await requireDashboardAccess(dashboardId);
      if (authError) return authError;
    }

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
