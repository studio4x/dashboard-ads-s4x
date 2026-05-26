import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
const PDF_BUCKET = process.env.PDF_STORAGE_BUCKET || "reports";

interface RouteParams {
  params: Promise<{ token: string }>;
}

function getErrorMessage(error: unknown) {
  const err = error as any;
  return String(err?.message || "Erro ao gerar PDF.");
}

function sanitizeFilePart(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizePeriodPart(value: string | null) {
  if (!value) return null;
  const onlyDate = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(onlyDate) ? onlyDate : null;
}

function buildPeriodPart(from: string | null, to: string | null) {
  return from && to ? `${from}_a_${to}` : from || to || "periodo_nao_disponivel";
}

function buildFilename(params: { dashboardName: string; clientName: string | null; periodPart: string }) {
  const dashboardPart = sanitizeFilePart(params.dashboardName) || "dashboard";
  const clientPart = sanitizeFilePart(params.clientName || "cliente");
  return `${dashboardPart}__${clientPart}__${params.periodPart}.pdf`;
}

function buildStoragePath(params: { shareToken: string; periodPart: string; filename: string }) {
  return `dashboard-pdfs/${params.shareToken}/${params.periodPart}/${params.filename}`;
}

async function getCachedPdf(supabase: any, path: string) {
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function storePdf(supabase: any, path: string, pdf: Buffer) {
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    // Não bloqueia a resposta ao usuário se falhar cache.
    console.warn("Falha ao salvar PDF no storage:", error.message);
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  let browser: any = null;
  try {
    const { token } = await params;
    const shareToken = String(token || "").trim();
    if (!shareToken) {
      return NextResponse.json({ success: false, error: "Token ausente." }, { status: 400 });
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

    const from = normalizePeriodPart(new URL(request.url).searchParams.get("from"));
    const to = normalizePeriodPart(new URL(request.url).searchParams.get("to"));
    const periodPart = buildPeriodPart(from, to);
    const filename = buildFilename({
      dashboardName: String(dashboard?.name || `dashboard-${link.dashboard_id}`),
      clientName,
      periodPart,
    });
    const storagePath = buildStoragePath({ shareToken, periodPart, filename });

    const cachedPdf = await getCachedPdf(supabase, storagePath);
    if (cachedPdf) {
      return new Response(cachedPdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename=\"${filename}\"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const origin = new URL(request.url).origin;
    const pdfQuery = new URLSearchParams({
      pdf: "1",
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }).toString();
    const renderUrl = `${origin}/share/${shareToken}?${pdfQuery}`;

    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    const puppeteer = (puppeteerCore as any).default || puppeteerCore;

    const executablePath = process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath());
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 2 });
    await page.goto(renderUrl, { waitUntil: "networkidle2", timeout: 120000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const pdf = Buffer.from(await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
      preferCSSPageSize: true,
    }));

    await storePdf(supabase, storagePath, pdf);

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${filename}\"`,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
