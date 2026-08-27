import { NextResponse } from "next/server";
import { shouldSync } from "@/lib/imports/sync-schedule";
import { GoogleAdsService } from "@/services/google-ads-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  try {
    const sources = await GoogleAdsService.getActiveSources();
    const summary = { total: sources.length, success: 0, errors: 0, skipped: 0, details: [] as Array<Record<string, unknown>> };
    for (const source of sources) {
      const config = Array.isArray(source.google_ads_sources) ? source.google_ads_sources[0] : source.google_ads_sources;
      if (!shouldSync(source.sync_interval, config?.last_import_at)) {
        summary.skipped += 1;
        summary.details.push({ sourceId: source.id, status: "skipped" });
        continue;
      }
      try {
        const result = await GoogleAdsService.syncSource(source.id);
        summary.success += 1;
        summary.details.push({ sourceId: source.id, status: "success", rowCounts: result.rowCounts });
      } catch (error) {
        summary.errors += 1;
        summary.details.push({ sourceId: source.id, status: "failed", message: error instanceof Error ? error.message : "Erro desconhecido" });
      }
    }
    return NextResponse.json({ message: "Sincronização Google Ads finalizada.", summary });
  } catch (error) {
    console.error("[GOOGLE_ADS_CRON_FATAL]", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Erro interno durante a sincronização Google Ads." }, { status: 500 });
  }
}
