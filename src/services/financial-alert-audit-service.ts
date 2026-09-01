import { createAdminClient } from "@/lib/supabase/server";

type FinancialAlertRunSummary = {
  total: number;
  healthy: number;
  alerted: number;
  suppressed: number;
  unavailable: number;
  errors: number;
  details: Array<Record<string, unknown>>;
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function finiteOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const FinancialAlertAuditService = {
  async recordRun(params: {
    startedAt: string;
    finishedAt: string;
    summary: FinancialAlertRunSummary;
  }) {
    const supabase = await createAdminClient({ actor: "cron", action: "record_financial_alert_audit_run" });
    const status = params.summary.errors > 0 ? "partial_error" : "success";
    const { data: run, error: runError } = await supabase
      .from("ads_financial_alert_runs")
      .insert({
        started_at: params.startedAt,
        finished_at: params.finishedAt,
        total_settings: Number(params.summary.total || 0),
        healthy_count: Number(params.summary.healthy || 0),
        alerted_count: Number(params.summary.alerted || 0),
        suppressed_count: Number(params.summary.suppressed || 0),
        unavailable_count: Number(params.summary.unavailable || 0),
        error_count: Number(params.summary.errors || 0),
        status,
      })
      .select("id")
      .single();
    if (runError) throw runError;

    const settingIds = Array.from(new Set((params.summary.details || []).map((detail) => text(detail.settingId)).filter(Boolean)));
    if (settingIds.length === 0) return { runId: run.id, checks: 0 };

    const { data: settings, error: settingsError } = await supabase
      .from("ads_financial_alert_settings")
      .select("id,client_id,dashboard_id,provider,account_id,account_name,currency,threshold_amount,threshold_days,last_state")
      .in("id", settingIds);
    if (settingsError) throw settingsError;

    const byId = new Map((settings || []).map((setting) => [setting.id, setting]));
    const checks = (params.summary.details || []).flatMap((detail) => {
      const settingId = text(detail.settingId);
      const setting = byId.get(settingId);
      if (!setting) return [];

      const decision = text(detail.decision) || (text(detail.status) === "error" ? "execution_error" : "unknown");
      const errorMessage = text(detail.message) || null;
      const eventId = text(detail.eventId) || null;
      const detailThreshold = finiteOrNull(detail.threshold);
      const observedAmount = detail.amount === null || detail.amount === undefined ? null : finiteOrNull(detail.amount);
      const observedDays = detail.estimatedDaysRemaining === null || detail.estimatedDaysRemaining === undefined ? null : finiteOrNull(detail.estimatedDaysRemaining);
      const detailThresholdDays = finiteOrNull(detail.thresholdDays);

      return [{
        run_id: run.id,
        setting_id: setting.id,
        client_id: setting.client_id,
        dashboard_id: setting.dashboard_id,
        provider: setting.provider,
        account_id: setting.account_id,
        account_name: setting.account_name,
        currency: setting.currency,
        observed_amount: observedAmount,
        threshold: detailThreshold ?? Number(setting.threshold_amount),
        observed_days_remaining: observedDays,
        threshold_days: detailThresholdDays ?? Number(setting.threshold_days ?? 2),
        trigger_type: text(detail.triggerType) || null,
        decision,
        resulting_state: setting.last_state,
        alert_sent: detail.alertSent === true,
        event_id: eventId,
        error_message: errorMessage,
        observed_at: params.finishedAt,
      }];
    });

    if (checks.length > 0) {
      const { error: checksError } = await supabase
        .from("ads_financial_alert_checks")
        .upsert(checks, { onConflict: "run_id,setting_id" });
      if (checksError) throw checksError;
    }
    return { runId: run.id, checks: checks.length };
  },

  async recordFatalRun(params: { startedAt: string; finishedAt: string; error: unknown }) {
    const supabase = await createAdminClient({ actor: "cron", action: "record_financial_alert_fatal_run" });
    const message = params.error instanceof Error ? params.error.message : "Erro desconhecido";
    const { data, error } = await supabase
      .from("ads_financial_alert_runs")
      .insert({
        started_at: params.startedAt,
        finished_at: params.finishedAt,
        total_settings: 0,
        healthy_count: 0,
        alerted_count: 0,
        suppressed_count: 0,
        unavailable_count: 0,
        error_count: 1,
        status: "error",
        error_message: message.slice(0, 1000),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data;
  },

  async getHistory(limit = 500) {
    const safeLimit = Math.min(1000, Math.max(50, Number(limit) || 500));
    const supabase = await createAdminClient({ actor: "api_admin", action: "read_financial_alert_audit_history" });
    const [runsResult, checksResult, eventsResult] = await Promise.all([
      supabase.from("ads_financial_alert_runs").select("*").order("started_at", { ascending: false }).limit(Math.min(200, safeLimit)),
      supabase.from("ads_financial_alert_checks").select("*,clients(id,name),dashboards(id,name)").order("observed_at", { ascending: false }).limit(safeLimit),
      supabase.from("ads_financial_alert_events").select("*,clients(id,name),dashboards(id,name),setting:ads_financial_alert_settings!ads_financial_alert_events_setting_id_fkey(account_name)").order("detected_at", { ascending: false }).limit(safeLimit),
    ]);
    if (runsResult.error) throw runsResult.error;
    if (checksResult.error) throw checksResult.error;
    if (eventsResult.error) throw eventsResult.error;
    return { runs: runsResult.data || [], checks: checksResult.data || [], events: eventsResult.data || [] };
  },
};
