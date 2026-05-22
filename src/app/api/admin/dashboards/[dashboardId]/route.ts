import { NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";

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
    const { name, slug, meta_objectives } = body || {};

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId é obrigatório" }, { status: 400 });
    }

    const updates: {
      name?: string;
      slug?: string;
      meta_objectives?: string[];
      meta_primary_objective?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name || String(name).trim().length < 3) {
        return NextResponse.json({ error: "Nome do dashboard inválido" }, { status: 400 });
      }
      updates.name = String(name).trim();
      if (slug && String(slug).trim()) {
        updates.slug = String(slug).trim();
      }
    }

    if (meta_objectives !== undefined) {
      const objectives = normalizeMetaAdsObjectives(meta_objectives);
      updates.meta_objectives = objectives;
      updates.meta_primary_objective = objectives[0] || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualização foi informado" }, { status: 400 });
    }

    const dashboard = await DashboardService.updateDashboard(dashboardId, updates);
    return NextResponse.json({ success: true, dashboard });
  } catch (error: any) {
    console.error("Erro ao atualizar dashboard:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
