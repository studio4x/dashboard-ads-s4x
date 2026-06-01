import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { getSessionProfile, requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const rateLimitError = enforceRateLimit(request, { key: "dashboard:data:read", limit: 120, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { dashboardId } = await params;
    let viewerRole: string = "viewer";
    
    const { searchParams } = new URL(request.url);
    const shareTokenHeader = request.headers.get("x-share-token");
    const shareTokenQuery = searchParams.get("share_token");
    const shareToken = (shareTokenHeader || shareTokenQuery || "").trim() || null;

    // 1. Verifica Autenticação e Acesso
    if (shareToken) {
      const { ShareService } = await import("@/services/share-service");
      const shareData = await ShareService.validateShareToken(shareToken);
      if (!shareData.isValid || shareData.link?.dashboard_id !== dashboardId) {
        return NextResponse.json({ error: "Token inválido, expirado ou não autorizado para este dashboard." }, { status: 403 });
      }
      viewerRole = "viewer";
    } else {
      const authError = await requireDashboardAccess(dashboardId);
      if (authError) return authError;
      const profile = await getSessionProfile();
      viewerRole = profile?.role || "viewer";
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    
    // 2. Busca os dados (Mocks ou Snapshot)
    const data = await getDashboardData(dashboardId, {
      from: from || undefined,
      to: to || undefined,
      bypassRls: Boolean(shareToken),
    });

    if (!data && process.env.GOOGLE_SHEETS_USE_MOCKS !== "true") {
      return NextResponse.json({ 
        error: "Dados não encontrados. Por favor, execute uma importação na área administrativa.",
        needsImport: true 
      }, { status: 404 });
    }

    return NextResponse.json({ ...data, viewerRole });
  } catch (error: any) {
    console.error("Dashboard Data API Error:", error);
    return apiErrorResponse(error, "Erro ao carregar dados do dashboard.");
  }
}
