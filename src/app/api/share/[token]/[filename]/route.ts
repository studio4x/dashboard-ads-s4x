import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  buildPdfPeriodPart,
  buildSharePdfFilename,
  buildSharePdfStoragePath,
  getCachedSharePdf,
  normalizePdfPeriodPart,
} from "@/lib/share-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ token: string; filename: string }>;
}

function getErrorMessage(error: unknown) {
  const err = error as any;
  return String(err?.message || "Erro ao carregar PDF.");
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const { token, filename: routeFilename } = await context.params;
    const shareToken = String(token || "").trim();

    if (!shareToken) {
      return NextResponse.json({ success: false, error: "Token ausente." }, { status: 400 });
    }

    if (!String(routeFilename || "").toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data: link, error: linkError } = await supabase
      .from("dashboard_share_links")
      .select("id, dashboard_id, status, expires_at")
      .eq("id", shareToken)
      .eq("status", "active")
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json({ success: false, error: "Link de compartilhamento inválido." }, { status: 404 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Link de compartilhamento expirado." }, { status: 410 });
    }

    const { data: dashboard } = await supabase
      .from("dashboards")
      .select("id, name, client_id")
      .eq("id", link.dashboard_id)
      .maybeSingle();

    let clientName: string | null = null;
    if (dashboard?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", dashboard.client_id)
        .maybeSingle();
      clientName = String(client?.name || "").trim() || null;
    }

    const from = normalizePdfPeriodPart(new URL(request.url).searchParams.get("from"));
    const to = normalizePdfPeriodPart(new URL(request.url).searchParams.get("to"));
    const periodPart = buildPdfPeriodPart(from, to);
    const filename = buildSharePdfFilename({
      dashboardName: String(dashboard?.name || `dashboard-${link.dashboard_id}`),
      clientName,
      periodPart,
    });

    if (routeFilename !== filename) {
      return NextResponse.json(
        { success: false, error: "Nome do arquivo não corresponde ao PDF gerado para este período." },
        { status: 400 }
      );
    }

    const storagePath = buildSharePdfStoragePath({
      shareToken,
      periodPart,
      filename,
    });

    const cachedPdf = await getCachedSharePdf(storagePath);
    if (!cachedPdf) {
      return NextResponse.json(
        { success: false, error: "PDF ainda não foi gerado para este período." },
        { status: 404 }
      );
    }

    return new Response(cachedPdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
