import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ token: string }>;
}

function getErrorMessage(error: unknown) {
  const err = error as any;
  return String(err?.message || "Erro ao gerar PDF.");
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
      .select("id, name")
      .eq("id", link.dashboard_id)
      .maybeSingle();

    const origin = new URL(request.url).origin;
    const renderUrl = `${origin}/share/${shareToken}?pdf=1`;

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
    await page.waitForTimeout(3000);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
      preferCSSPageSize: true,
    });

    const safeName = String(dashboard?.name || `dashboard-${link.dashboard_id}`)
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 100);
    const filename = `${safeName}.pdf`;

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
