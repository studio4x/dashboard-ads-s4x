import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    const data = await getDashboardData(dashboardId);

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
