import { NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { dashboardId } = await params;

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId é obrigatório" }, { status: 400 });
    }

    const deleted = await DashboardService.deleteDashboard(dashboardId);
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    console.error("Erro ao excluir dashboard:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
