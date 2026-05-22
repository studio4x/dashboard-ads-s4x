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

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { dashboardId } = await params;
    const body = await request.json();
    const { name, slug } = body || {};

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId é obrigatório" }, { status: 400 });
    }

    if (!name || String(name).trim().length < 3) {
      return NextResponse.json({ error: "Nome do dashboard inválido" }, { status: 400 });
    }

    const updates: { name: string; slug?: string } = { name: String(name).trim() };
    if (slug && String(slug).trim()) {
      updates.slug = String(slug).trim();
    }

    const dashboard = await DashboardService.updateDashboard(dashboardId, updates);
    return NextResponse.json({ success: true, dashboard });
  } catch (error: any) {
    console.error("Erro ao atualizar dashboard:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
