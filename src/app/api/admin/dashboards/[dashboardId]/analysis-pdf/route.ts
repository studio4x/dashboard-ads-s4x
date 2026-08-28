import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { getLatestSharePdf } from "@/lib/share-pdf";
import { findAvailableAnalysisPdf, getUsableAnalysisPdfLinks } from "@/lib/analysis-pdf-lookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const rateLimitError = enforceRateLimit(request, {
      key: "admin:analysis-pdf:download",
      limit: 30,
      windowMs: 60_000,
    });
    if (rateLimitError) return rateLimitError;

    const { dashboardId } = await context.params;
    const supabase = await createAdminClient({ actor: "api_admin", action: "download_analysis_pdf" });
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("id, automation_last_analysis_status")
      .eq("id", dashboardId)
      .maybeSingle();

    if (dashboardError || !dashboard) {
      return NextResponse.json({ success: false, error: "Dashboard não encontrado." }, { status: 404 });
    }

    if (String(dashboard.automation_last_analysis_status || "").trim().toLowerCase() !== "success") {
      return NextResponse.json(
        { success: false, error: "A análise ainda não está disponível para download." },
        { status: 409 }
      );
    }

    const { data: links, error: linksError } = await supabase
      .from("dashboard_share_links")
      .select("id, expires_at, created_at")
      .eq("dashboard_id", dashboardId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (linksError) throw linksError;

    const activeLinks = getUsableAnalysisPdfLinks(links || []);
    if (activeLinks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum link ativo foi encontrado para o PDF da análise." },
        { status: 404 }
      );
    }

    const result = await findAvailableAnalysisPdf(activeLinks, getLatestSharePdf);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "O PDF da análise ainda não foi encontrado no armazenamento." },
        { status: 404 }
      );
    }

    const filename = result.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(result.pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível baixar o PDF da análise.");
  }
}
