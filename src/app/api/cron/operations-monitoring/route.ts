import { NextResponse } from "next/server";
import { SourceMonitoringService } from "@/services/source-monitoring-service";
import { PerformanceAnomalyService } from "@/services/performance-anomaly-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const result: Record<string, unknown> = { startedAt };
  let hasError = false;

  try {
    result.sourceMonitoring = await SourceMonitoringService.runAll();
  } catch (error) {
    hasError = true;
    result.sourceMonitoring = { error: error instanceof Error ? error.message : "Erro desconhecido" };
    console.error("[OPERATIONS_MONITORING_SOURCE_ERROR]", result.sourceMonitoring);
  }

  try {
    result.performanceAnomalies = await PerformanceAnomalyService.runAll();
  } catch (error) {
    hasError = true;
    result.performanceAnomalies = { error: error instanceof Error ? error.message : "Erro desconhecido" };
    console.error("[OPERATIONS_MONITORING_ANOMALY_ERROR]", result.performanceAnomalies);
  }

  result.finishedAt = new Date().toISOString();
  return NextResponse.json({
    success: !hasError,
    message: hasError ? "Monitoramento concluído com falhas parciais." : "Monitoramento operacional concluído.",
    ...result,
  }, { status: hasError ? 207 : 200 });
}
