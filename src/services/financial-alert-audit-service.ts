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

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return date;
}

export function parseFinancialAlertDateRange(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || start > end) return null;

  const endExclusive = new Date(end.getTime());
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return {
    start: start.toISOString(),
    endExclusive: endExclusive.toISOString(),
  };
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

  async getHistory(limit = 500, retentionDays = 14) {
    const safeLimit = Math.min(1000, Math.max(50, Number(limit) || 500));
    const safeRetentionDays = Math.min(365, Math.max(1, Number(retentionDays) || 14));
    const cutoff = new Date(Date.now() - safeRetentionDays * 24 * 60 * 60 * 1000).toISOString();
    const supabase = await createAdminClient({ actor: "api_admin", action: "read_financial_alert_audit_history" });
    const [runsResult, checksResult, eventsResult] = await Promise.all([
      supabase.from("ads_financial_alert_runs").select("*").gte("started_at", cutoff).order("started_at", { ascending: false }).limit(Math.min(200, safeLimit)),
      supabase.from("ads_financial_alert_checks").select("*,clients(id,name),dashboards(id,name)").gte("observed_at", cutoff).order("observed_at", { ascending: false }).limit(safeLimit),
      supabase.from("ads_financial_alert_events").select("*,clients(id,name),dashboards(id,name),setting:ads_financial_alert_settings!ads_financial_alert_events_setting_id_fkey(account_name)").gte("detected_at", cutoff).order("detected_at", { ascending: false }).limit(safeLimit),
    ]);
    if (runsResult.error) throw runsResult.error;
    if (checksResult.error) throw checksResult.error;
    if (eventsResult.error) throw eventsResult.error;
    return { runs: runsResult.data || [], checks: checksResult.data || [], events: eventsResult.data || [] };
  },

  async purgeOlderThanDays(retentionDays = 14) {
    const safeRetentionDays = Math.min(365, Math.max(1, Number(retentionDays) || 14));
    const cutoff = new Date(Date.now() - safeRetentionDays * 24 * 60 * 60 * 1000).toISOString();
    const supabase = await createAdminClient({ actor: "cron", action: "purge_financial_alert_audit_history" });

    const eventsResult = await supabase
      .from("ads_financial_alert_events")
      .delete({ count: "exact" })
      .lt("detected_at", cutoff);
    if (eventsResult.error) throw eventsResult.error;

    const checksResult = await supabase
      .from("ads_financial_alert_checks")
      .delete({ count: "exact" })
      .lt("observed_at", cutoff);
    if (checksResult.error) throw checksResult.error;

    const runsResult = await supabase
      .from("ads_financial_alert_runs")
      .delete({ count: "exact" })
      .lt("started_at", cutoff);
    if (runsResult.error) throw runsResult.error;

    return {
      cutoff,
      retentionDays: safeRetentionDays,
      events: eventsResult.count || 0,
      checks: checksResult.count || 0,
      runs: runsResult.count || 0,
    };
  },

  async purgeBetweenDates(startDate: string, endDate: string) {
    const range = parseFinancialAlertDateRange(startDate, endDate);
    if (!range) throw new Error("Período inválido para limpeza do histórico.");

    const supabase = await createAdminClient({ actor: "api_admin", action: "purge_financial_alert_audit_history_by_period" });

    // Events are removed first because checks keep an optional reference to them.
    const eventsResult = await supabase
      .from("ads_financial_alert_events")
      .delete({ count: "exact" })
      .gte("detected_at", range.start)
      .lt("detected_at", range.endExclusive);
    if (eventsResult.error) throw eventsResult.error;

    const checksResult = await supabase
      .from("ads_financial_alert_checks")
      .delete({ count: "exact" })
      .gte("observed_at", range.start)
      .lt("observed_at", range.endExclusive);
    if (checksResult.error) throw checksResult.error;

    const runsResult = await supabase
      .from("ads_financial_alert_runs")
      .delete({ count: "exact" })
      .gte("started_at", range.start)
      .lt("started_at", range.endExclusive);
    if (runsResult.error) throw runsResult.error;

    return {
      startDate,
      endDate,
      events: eventsResult.count || 0,
      checks: checksResult.count || 0,
      runs: runsResult.count || 0,
    };
  },
};
