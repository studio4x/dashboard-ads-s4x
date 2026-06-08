import { NextResponse } from "next/server";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { DashboardService } from "@/services/dashboard-service";

export const dynamic = "force-dynamic";

type CompletionStatus = "success" | "partial" | "error";

function normalizeCompletionStatus(value: unknown): CompletionStatus {
  const raw = String(value || "").trim().toLowerCase();
  if (["success", "ok", "completed", "done", "true"].includes(raw)) return "success";
  if (["partial", "warning", "success_with_warnings", "with_warnings", "success-with-warnings"].includes(raw)) return "partial";
  if (["error", "failed", "failure", "ko", "false"].includes(raw)) return "error";
  return "success";
}

function isPlaceholderCredential(value: string) {
  if (!value) return true;
  const normalized = value.trim().toUpperCase();
  return normalized.includes("SEU_") || normalized.includes("PLACEHOLDER");
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function resolveCronSecret() {
  const runtime = String(process.env.CRON_SECRET || "").trim();
  if (runtime && !isPlaceholderCredential(runtime)) return runtime;
  return "";
}

export async function POST(request: Request) {
  try {
    const expectedSecret = await resolveCronSecret();
    const providedSecret = getBearerToken(request);
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;

    const body = parsed.body as Record<string, unknown>;
    const completionPayload = (body.completion && typeof body.completion === "object" ? body.completion : {}) as Record<string, unknown>;
    const callbackPayload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
    const dataPayload = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;
    const payload = { ...dataPayload, ...callbackPayload, ...body };

    const dashboardId = String(
      payload.dashboardId ||
        payload.dashboard_id ||
        completionPayload.dashboardId ||
        completionPayload.dashboard_id ||
        ""
    ).trim();
    if (!dashboardId) {
      return NextResponse.json({ success: false, error: "dashboardId é obrigatório." }, { status: 400 });
    }

    const completionStatus = normalizeCompletionStatus(
      payload.status ||
        payload.state ||
        completionPayload.status ||
        completionPayload.state ||
        payload.result ||
        payload.resultStatus
    );
    const completedAt = String(
      payload.completedAt ||
        payload.completed_at ||
        payload.finishedAt ||
        payload.finished_at ||
        completionPayload.completedAt ||
        completionPayload.completed_at ||
        completionPayload.finishedAt ||
        completionPayload.finished_at ||
        new Date().toISOString()
    ).trim();
    const message = String(
      payload.message ||
        payload.note ||
        completionPayload.message ||
        completionPayload.note ||
        ""
    ).trim();
    const details = {
      ...(payload.details && typeof payload.details === "object" ? (payload.details as Record<string, unknown>) : {}),
      ...(completionPayload.details && typeof completionPayload.details === "object"
        ? (completionPayload.details as Record<string, unknown>)
        : {}),
    };
    const workflowRunId = String(
      payload.workflowRunId ||
        payload.workflow_run_id ||
        completionPayload.workflowRunId ||
        completionPayload.workflow_run_id ||
        ""
    ).trim();
    const reportMode = String(
      payload.reportMode ||
        payload.report_mode ||
        completionPayload.reportMode ||
        completionPayload.report_mode ||
        ""
    ).trim();

    await DashboardService.updateDashboard(dashboardId, {
      automation_last_completed_at: completedAt,
      automation_last_completion_status: completionStatus,
      automation_last_completion_message: message || null,
      automation_last_completion_details: {
        ...details,
        workflowRunId: workflowRunId || null,
        reportMode: reportMode || null,
        source: "n8n_callback",
        receivedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      dashboardId,
      status: completionStatus,
      completedAt,
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro ao registrar conclusão da automação.");
  }
}
