import { NextResponse } from "next/server";
import { DashboardTemplateService } from "@/services/dashboard-template-service";
import { requireAdmin } from "@/lib/auth/guards";

export async function POST(
  request: Request,
  props: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { client_id, name, slug } = body;
    const params = await props.params;
    const dashboardId = params.dashboardId;

    if (!dashboardId || !client_id || !name || !slug) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 });
    }

    const newDashboard = await DashboardTemplateService.duplicateDashboard(
      dashboardId,
      client_id,
      name,
      slug
    );

    return NextResponse.json({ success: true, dashboard: newDashboard });
  } catch (error: any) {
    console.error("Erro ao duplicar dashboard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
