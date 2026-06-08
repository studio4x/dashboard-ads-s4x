import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { DashboardService } from "@/services/dashboard-service";
import { createAdminClient } from "@/lib/supabase/server";

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

function extractShareToken(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const shareIndex = parts.findIndex((part) => part === "share");
    if (shareIndex >= 0 && parts[shareIndex + 1]) return parts[shareIndex + 1];
    const apiIndex = parts.findIndex((part) => part === "api");
    if (apiIndex >= 0 && parts[apiIndex + 1] === "share" && parts[apiIndex + 2]) return parts[apiIndex + 2];
    return "";
  } catch {
    if (raw.includes("/share/")) {
      const match = raw.match(/\/share\/([^/?#]+)/i);
      return match?.[1] || "";
    }
    return raw;
  }
}

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  return (value as Record<string, unknown>)[key];
}

function normalizeShareToken(raw: string) {
  const token = String(raw || "").trim();
  if (!token) return "";
  return token;
}

async function resolveDashboardIdFromShareToken(rawToken: string) {
  const token = normalizeShareToken(rawToken);
  if (!token) return null;

  const supabase = await createAdminClient({ actor: "api_admin", action: "resolve_dashboard_from_share_token" });
  const isUuidToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);

  let query = supabase
    .from("dashboard_share_links")
    .select("dashboard_id, dashboards(id, name, dashboard_type, client_id, clients(name))")
    .limit(1);

  if (isUuidToken) {
    query = query.eq("id", token);
  } else {
    query = query.eq("token_hash", createHash("sha256").update(token).digest("hex"));
  }

  const { data, error } = await query.single();
  if (error || !data?.dashboard_id) return null;
  return {
    dashboardId: String(data.dashboard_id),
    dashboard: data.dashboards || null,
    shareToken: token,
  };
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
    const payloadDashboard = getObjectField(payload, "dashboard");
    const completionDashboard = getObjectField(completionPayload, "dashboard");
    const shareReference = extractShareToken(
      payload.shareLinkId ||
        payload.shareToken ||
        payload.share_token ||
        payload.shareUrl ||
        payload.share_url ||
        payload.dashboardUrl ||
        payload.dashboard_url ||
        getObjectField(payloadDashboard, "url") ||
        payload["Link do Dashboard"] ||
        payload["link do dashboard"] ||
        payload["Link do Relatório"] ||
        payload["link do relatório"] ||
        completionPayload.shareLinkId ||
        completionPayload.shareToken ||
        completionPayload.share_token ||
        completionPayload.shareUrl ||
        completionPayload.share_url ||
        completionPayload.dashboardUrl ||
        completionPayload.dashboard_url ||
        getObjectField(completionDashboard, "url")
    );

    let dashboardId = String(
      payload.dashboardId ||
        payload.dashboard_id ||
        getObjectField(payloadDashboard, "id") ||
        completionPayload.dashboardId ||
        completionPayload.dashboard_id ||
        getObjectField(completionDashboard, "id") ||
        ""
    ).trim();

    let resolvedShareInfo: Awaited<ReturnType<typeof resolveDashboardIdFromShareToken>> = null;
    if (!dashboardId && shareReference) {
      resolvedShareInfo = await resolveDashboardIdFromShareToken(shareReference);
      dashboardId = String(resolvedShareInfo?.dashboardId || "").trim();
    }

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
    const dashboardPayload = (payloadDashboard && typeof payloadDashboard === "object" ? payloadDashboard : {}) as Record<string, unknown>;
    const workflowRunId = String(
      payload.workflowRunId ||
        payload.workflow_run_id ||
        payload.runId ||
        payload.run_id ||
        completionPayload.workflowRunId ||
        completionPayload.workflow_run_id ||
        completionPayload.runId ||
        completionPayload.run_id ||
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
        dashboard: {
          id: dashboardId,
          name: String(dashboardPayload.name || payload.dashboardName || completionPayload.dashboardName || "").trim() || null,
          templateId: String(dashboardPayload.templateId || payload.templateId || completionPayload.templateId || "").trim() || null,
          clientName: String(dashboardPayload.clientName || payload.clientName || completionPayload.clientName || "").trim() || null,
        },
        share: {
          token: shareReference || null,
          resolved: Boolean(resolvedShareInfo?.dashboardId),
        },
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
