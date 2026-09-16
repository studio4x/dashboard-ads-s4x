import { createAdminClient } from "@/lib/supabase/server";

export type AutomationExecutionStatus = "running" | "dispatched" | "success" | "partial" | "error";
export type AutomationExecutionSource = "manual" | "scheduled";

type ExecutionDetails = Record<string, unknown>;

function text(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

export const AutomationExecutionService = {
  async start(input: {
    clientId: string;
    dashboardId: string;
    source: AutomationExecutionSource;
    periodFrom?: string | null;
    periodTo?: string | null;
    reportMode?: string | null;
    details?: ExecutionDetails;
  }) {
    try {
      const supabase = await createAdminClient({ actor: "automation", action: "start_automation_execution" });
      const { data, error } = await supabase
        .from("automation_execution_logs")
        .insert({
          client_id: input.clientId,
          dashboard_id: input.dashboardId,
          source: input.source,
          status: "running",
          period_from: text(input.periodFrom),
          period_to: text(input.periodTo),
          report_mode: text(input.reportMode),
          details: input.details || {},
        })
        .select("id")
        .single();
      if (error) throw error;
      return data?.id ? String(data.id) : null;
    } catch (error) {
      console.error("Falha ao iniciar histórico de automação:", error);
      return null;
    }
  },

  async markDispatched(id: string | null, details?: ExecutionDetails) {
    if (!isUuid(id)) return;
    try {
      const supabase = await createAdminClient({ actor: "automation", action: "mark_automation_dispatched" });
      const patch: Record<string, unknown> = {
        status: "dispatched",
        dispatched_at: new Date().toISOString(),
      };
      if (details) patch.details = details;
      const { error } = await supabase.from("automation_execution_logs").update(patch).eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Falha ao registrar disparo da automação:", error);
    }
  },

  async markError(id: string | null, message: string, details?: ExecutionDetails) {
    if (!isUuid(id)) return;
    try {
      const supabase = await createAdminClient({ actor: "automation", action: "mark_automation_error" });
      const { error } = await supabase
        .from("automation_execution_logs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          message: message.slice(0, 2000),
          details: details || {},
        })
        .eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Falha ao registrar erro da automação:", error);
    }
  },

  async complete(input: {
    id?: string | null;
    dashboardId: string;
    status: Exclude<AutomationExecutionStatus, "running" | "dispatched">;
    completedAt: string;
    message?: string | null;
    workflowRunId?: string | null;
    details?: ExecutionDetails;
  }) {
    try {
      const supabase = await createAdminClient({ actor: "automation", action: "complete_automation_execution" });
      const patch = {
        status: input.status,
        completed_at: input.completedAt,
        message: text(input.message),
        workflow_run_id: text(input.workflowRunId),
        details: input.details || {},
      };
      if (isUuid(input.id)) {
        const { error } = await supabase.from("automation_execution_logs").update(patch).eq("id", input.id);
        if (error) throw error;
        return;
      }

      const { data: latest, error: latestError } = await supabase
        .from("automation_execution_logs")
        .select("id")
        .eq("dashboard_id", input.dashboardId)
        .in("status", ["running", "dispatched"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;
      if (!latest?.id) return;

      const { error } = await supabase.from("automation_execution_logs").update(patch).eq("id", latest.id);
      if (error) throw error;
    } catch (error) {
      console.error("Falha ao concluir histórico da automação:", error);
    }
  },

  async listForClient(clientId: string, limit = 100) {
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_client_automation_history" });
    const { data, error } = await supabase
      .from("automation_execution_logs")
      .select("id,client_id,dashboard_id,source,status,started_at,dispatched_at,completed_at,period_from,period_to,report_mode,workflow_run_id,message,details,dashboards(name)")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return data || [];
  },
};
