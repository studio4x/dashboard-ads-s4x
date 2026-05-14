import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const dashboards = await DashboardService.getAllDashboards();

    return NextResponse.json(dashboards);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
