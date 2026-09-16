import { createAdminClient } from "@/lib/supabase/server";

function ageMinutes(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

function defaultStaleMinutes(type: string, syncInterval: string | null) {
  const interval = String(syncInterval || "").toLowerCase();
  if (interval.includes("daily") || interval.includes("diar") || interval.includes("24")) return 1560;
  if (type === "google_sheets") return 1560;
  return 180;
}

function errorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const item = error as Record<string, unknown>;
    return String(item.message || item.details || item.hint || "Erro de consulta");
  }
  return String(error);
}

const WEEK_DAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatSchedule(dashboard: any) {
  const hour = String(Number(dashboard?.automation_hour ?? 8)).padStart(2, "0");
  const minute = String(Number(dashboard?.automation_minute ?? 0)).padStart(2, "0");
  if (dashboard?.automation_frequency === "daily") return `Diária às ${hour}:${minute}`;
  const day = WEEK_DAYS[Number(dashboard?.automation_day_of_week ?? 1)] || "segunda-feira";
  return `Semanal, ${day}, às ${hour}:${minute}`;
}

function completionStatus(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["error", "failed", "failure"].includes(normalized)) return "error";
  if (["partial", "warning", "success_with_warnings"].includes(normalized)) return "partial";
  if (["success", "ok", "completed", "done"].includes(normalized)) return "success";
  return normalized || "pending";
}

export const PlatformHealthService = {
  async getSnapshot() {
    const supabase = await createAdminClient({ actor: "api_admin", action: "read_platform_health" });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Keep each query independent. The health cockpit must remain available even when
    // one optional monitoring module is temporarily unavailable or its schema cache is stale.
    const queries = await Promise.all([
      supabase.from("clients").select("id,name,status").eq("status", "active").order("name"),
      supabase.from("dashboards").select("id,client_id,name,status,automation_enabled,automation_frequency,automation_day_of_week,automation_hour,automation_minute,automation_period_preset,automation_include_today,automation_report_mode,automation_last_dispatched_at,automation_last_completed_at,automation_last_completion_status,automation_last_completion_message").eq("status", "active"),
      supabase.from("data_sources").select("id,client_id,dashboard_id,type,name,status,sync_interval").eq("status", "active"),
      supabase.from("google_sheet_sources").select("data_source_id,last_import_at,last_import_status"),
      supabase.from("google_ads_sources").select("data_source_id,last_import_at,last_import_status,last_error"),
      supabase.from("meta_ad_sources").select("data_source_id,last_import_at,last_import_status,last_error"),
      supabase.from("source_monitoring_settings").select("data_source_id,enabled,stale_after_minutes,last_state,last_checked_at,last_fresh_at,last_notified_at"),
      supabase.from("ads_financial_alert_settings").select("id,client_id,dashboard_id,provider,account_id,account_name,currency,enabled,threshold_amount,threshold_days,days_alert_enabled,last_state,last_observed_amount,last_observed_days_remaining,last_observed_at,last_notified_at").eq("enabled", true),
      supabase.from("performance_anomaly_states").select("dashboard_id,client_id,anomaly_key,state,last_seen_at,last_notified_at").eq("state", "active"),
      supabase.from("import_logs").select("id,client_id,dashboard_id,data_source_id,status,started_at,error_details").gte("started_at", since).in("status", ["failed", "error"]),
      supabase.from("ads_financial_alert_events").select("id,client_id,dashboard_id,error_message,created_at").eq("notification_status", "error").gte("created_at", since),
      supabase.from("source_monitoring_events").select("id,client_id,dashboard_id,error_message,created_at").eq("notification_status", "error").gte("created_at", since),
      supabase.from("performance_anomaly_events").select("id,client_id,dashboard_id,error_message,created_at").eq("notification_status", "error").gte("created_at", since),
      supabase.from("ads_financial_alert_runs").select("id,status,error_count,error_message,started_at").gte("started_at", since).in("status", ["partial_error", "error"]),
      supabase.from("automation_execution_logs").select("id,client_id,dashboard_id,source,status,started_at,dispatched_at,completed_at,period_from,period_to,report_mode,message,workflow_run_id").order("started_at", { ascending: false }).limit(500),
    ]);

    const [
      clientsResult,
      dashboardsResult,
      sourcesResult,
      googleSheetsResult,
      googleAdsResult,
      metaAdsResult,
      monitoringResult,
      financialResult,
      anomalyStatesResult,
      importErrorsResult,
      financialDeliveryErrorsResult,
      sourceDeliveryErrorsResult,
      anomalyDeliveryErrorsResult,
      financialRunsResult,
      automationHistoryResult,
    ] = queries;

    const queryNames = [
      "clients",
      "dashboards",
      "data_sources",
      "google_sheet_sources",
      "google_ads_sources",
      "meta_ad_sources",
      "source_monitoring_settings",
      "ads_financial_alert_settings",
      "performance_anomaly_states",
      "import_logs",
      "ads_financial_alert_events",
      "source_monitoring_events",
      "performance_anomaly_events",
      "ads_financial_alert_runs",
      "automation_execution_logs",
    ];

    const queryWarnings = queries.flatMap((result: any, index) => {
      if (!result?.error) return [];
      return [{ module: queryNames[index], message: errorMessage(result.error) || "Falha na consulta" }];
    });

    if (queryWarnings.length) {
      console.error("[PLATFORM_HEALTH_PARTIAL_QUERY_ERROR]", { warnings: queryWarnings });
    }

    const clientsData = clientsResult.error ? [] : clientsResult.data || [];
    const dashboardsData = dashboardsResult.error ? [] : dashboardsResult.data || [];
    const sourcesData = sourcesResult.error ? [] : sourcesResult.data || [];
    const googleSheetsData = googleSheetsResult.error ? [] : googleSheetsResult.data || [];
    const googleAdsData = googleAdsResult.error ? [] : googleAdsResult.data || [];
    const metaAdsData = metaAdsResult.error ? [] : metaAdsResult.data || [];
    const monitoringData = monitoringResult.error ? [] : monitoringResult.data || [];
    const financialData = financialResult.error ? [] : financialResult.data || [];
    const anomalyStatesData = anomalyStatesResult.error ? [] : anomalyStatesResult.data || [];
    const automationHistoryData = automationHistoryResult.error ? [] : automationHistoryResult.data || [];

    const clientsById = new Map(clientsData.map((row: any) => [row.id, row]));
    const dashboardsById = new Map(dashboardsData.map((row: any) => [row.id, row]));
    const googleSheetsBySource = new Map(googleSheetsData.map((row: any) => [row.data_source_id, row]));
    const googleAdsBySource = new Map(googleAdsData.map((row: any) => [row.data_source_id, row]));
    const metaAdsBySource = new Map(metaAdsData.map((row: any) => [row.data_source_id, row]));
    const monitoringBySource = new Map(monitoringData.map((row: any) => [row.data_source_id, row]));
    const latestAutomationByDashboard = new Map<string, any>();
    for (const row of automationHistoryData) {
      if (!latestAutomationByDashboard.has(row.dashboard_id)) latestAutomationByDashboard.set(row.dashboard_id, row);
    }

    const sourceItems = sourcesData.map((source: any) => {
      const googleSheet: any = googleSheetsBySource.get(source.id);
      const googleAds: any = googleAdsBySource.get(source.id);
      const metaAds: any = metaAdsBySource.get(source.id);
      const setting: any = monitoringBySource.get(source.id);

      const sync = source.type === "google_ads"
        ? { at: googleAds?.last_import_at || null, status: googleAds?.last_import_status || null, error: googleAds?.last_error || null }
        : source.type === "meta_ads"
          ? { at: metaAds?.last_import_at || null, status: metaAds?.last_import_status || null, error: metaAds?.last_error || null }
          : { at: googleSheet?.last_import_at || null, status: googleSheet?.last_import_status || null, error: null };

      const freshAt = sync.at || setting?.last_fresh_at || null;
      const age = ageMinutes(freshAt);
      const threshold = Number(setting?.stale_after_minutes ?? defaultStaleMinutes(source.type, source.sync_interval));
      const stale = freshAt === null || (age !== null && age > threshold);
      const failed = ["error", "failed"].includes(String(sync.status || "").toLowerCase());
      const client: any = clientsById.get(source.client_id);
      const dashboard: any = dashboardsById.get(source.dashboard_id);

      return {
        id: source.id,
        clientId: source.client_id,
        clientName: client?.name || "Cliente",
        dashboardId: source.dashboard_id,
        dashboardName: dashboard?.name || "Dashboard",
        type: source.type,
        name: source.name,
        freshAt,
        ageMinutes: age,
        thresholdMinutes: threshold,
        status: failed ? "error" : stale ? "stale" : "healthy",
        importStatus: sync.status,
        error: sync.error,
        monitoringEnabled: Boolean(setting?.enabled),
      };
    });

    const automationItems = dashboardsData
      .filter((dashboard: any) => dashboard.automation_enabled)
      .map((dashboard: any) => {
        const latestExecution = latestAutomationByDashboard.get(dashboard.id);
        const lastCompletedAt = dashboard.automation_last_completed_at || latestExecution?.completed_at || null;
        const lastDispatchedAt = dashboard.automation_last_dispatched_at || latestExecution?.dispatched_at || null;
        const lastStartedAt = latestExecution?.started_at || null;
        const latestExecutionStatus = completionStatus(latestExecution?.status);
        const lastCompletionStatus = completionStatus(dashboard.automation_last_completion_status || latestExecution?.status);
        const lastAge = ageMinutes(lastCompletedAt);
        const staleAfterMinutes = dashboard.automation_frequency === "daily" ? 2 * 24 * 60 : 8 * 24 * 60;
        const pending = Boolean(latestExecution && ["running", "dispatched"].includes(latestExecutionStatus) && !latestExecution.completed_at);
        const failed = lastCompletionStatus === "error" || latestExecutionStatus === "error";
        const stale = !lastCompletedAt || (lastAge !== null && lastAge > staleAfterMinutes);
        const diagnosis = failed
          ? "error"
          : pending
            ? "pending_completion"
            : !lastCompletedAt
              ? "never_completed"
              : stale
                ? "stale"
                : "healthy";
        const diagnosisLabel = diagnosis === "error"
          ? "Automação com erro"
          : diagnosis === "pending_completion"
            ? "Disparada, aguardando conclusão"
            : diagnosis === "never_completed"
              ? "Nenhuma conclusão registrada"
              : diagnosis === "stale"
                ? "Sem execução recente"
                : "Execução recente";
        const client: any = clientsById.get(dashboard.client_id);
        return {
          dashboardId: dashboard.id,
          clientId: dashboard.client_id,
          clientName: client?.name || "Cliente",
          dashboardName: dashboard.name,
          frequency: dashboard.automation_frequency,
          dayOfWeek: Number(dashboard.automation_day_of_week ?? 1),
          hour: Number(dashboard.automation_hour ?? 8),
          minute: Number(dashboard.automation_minute ?? 0),
          scheduleLabel: formatSchedule(dashboard),
          periodPreset: dashboard.automation_period_preset || "last_7_days",
          includeToday: Boolean(dashboard.automation_include_today),
          reportMode: dashboard.automation_report_mode || "both",
          lastStartedAt,
          lastDispatchedAt,
          lastCompletedAt,
          lastCompletionStatus,
          lastCompletionMessage: dashboard.automation_last_completion_message || latestExecution?.message || null,
          lastExecutionStatus: latestExecutionStatus,
          lastExecutionId: latestExecution?.id || null,
          lastExecutionPeriodFrom: latestExecution?.period_from || null,
          lastExecutionPeriodTo: latestExecution?.period_to || null,
          lastExecutionWorkflowRunId: latestExecution?.workflow_run_id || null,
          lastCompletionAgeMinutes: lastAge,
          staleAfterMinutes,
          diagnosis,
          diagnosisLabel,
          status: failed ? "error" : stale || pending ? "attention" : "healthy",
          message: dashboard.automation_last_completion_message || latestExecution?.message || null,
        };
      });

    const financialItems = financialData.map((item: any) => ({
      ...item,
      status: item.last_state === "below_threshold" ? "attention" : item.last_state === "healthy" ? "healthy" : "unknown",
    }));
    const anomalyItems = anomalyStatesData;

    const issuesByClient = new Map<string, Array<{ type: string; label: string; severity: string; details?: Record<string, unknown> }>>();
    const addIssue = (clientId: string, issue: { type: string; label: string; severity: string; details?: Record<string, unknown> }) => {
      if (!issuesByClient.has(clientId)) issuesByClient.set(clientId, []);
      issuesByClient.get(clientId)!.push(issue);
    };

    for (const source of sourceItems) {
      if (source.status !== "healthy") {
        addIssue(source.clientId, {
          type: "source",
          label: `${source.name}: ${source.status === "stale" ? "dados atrasados" : "erro de sincronização"}`,
          severity: source.status === "error" ? "critical" : "warning",
        });
      }
    }
    for (const item of automationItems) {
      if (item.status !== "healthy") {
        addIssue(item.clientId, {
          type: "automation",
          label: `${item.dashboardName}: ${item.diagnosisLabel.toLowerCase()}`,
          severity: item.status === "error" ? "critical" : "warning",
          details: item,
        });
      }
    }
    for (const item of financialItems) {
      if (item.status === "attention") addIssue(item.client_id, { type: "financial", label: `${item.account_name || item.account_id}: abaixo do limite financeiro`, severity: "warning" });
    }
    for (const item of anomalyItems as any[]) {
      addIssue(item.client_id, { type: "anomaly", label: `Anomalia ativa: ${item.anomaly_key}`, severity: "warning" });
    }

    const clients = clientsData.map((client: any) => {
      const issues = issuesByClient.get(client.id) || [];
      return {
        id: client.id,
        name: client.name,
        status: issues.some((issue) => issue.severity === "critical") ? "critical" : issues.length ? "attention" : "healthy",
        issues,
      };
    });

    const importErrors = importErrorsResult.error ? [] : importErrorsResult.data || [];
    const financialDeliveryErrors = financialDeliveryErrorsResult.error ? [] : financialDeliveryErrorsResult.data || [];
    const sourceDeliveryErrors = sourceDeliveryErrorsResult.error ? [] : sourceDeliveryErrorsResult.data || [];
    const anomalyDeliveryErrors = anomalyDeliveryErrorsResult.error ? [] : anomalyDeliveryErrorsResult.data || [];
    const financialRuns = financialRunsResult.error ? [] : financialRunsResult.data || [];

    const recentErrorCount = importErrors.length
      + financialDeliveryErrors.length
      + sourceDeliveryErrors.length
      + anomalyDeliveryErrors.length
      + financialRuns.reduce((sum: number, row: any) => sum + Number(row.error_count || 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      degraded: queryWarnings.length > 0,
      queryWarnings,
      summary: {
        clients: clients.length,
        healthyClients: clients.filter((client: any) => client.status === "healthy").length,
        attentionClients: clients.filter((client: any) => client.status === "attention").length,
        criticalClients: clients.filter((client: any) => client.status === "critical").length,
        sources: sourceItems.length,
        staleSources: sourceItems.filter((source: any) => source.status === "stale").length,
        sourceErrors: sourceItems.filter((source: any) => source.status === "error").length,
        financialAlertsActive: financialItems.filter((item: any) => item.status === "attention").length,
        anomaliesActive: anomalyItems.length,
        automationIssues: automationItems.filter((item: any) => item.status !== "healthy").length,
        errors24h: recentErrorCount,
      },
      integrations: {
        financialWebhookConfigured: Boolean(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_URL && process.env.N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN),
        operationalWebhookConfigured: Boolean(process.env.N8N_ADMIN_ALERT_WEBHOOK_URL && process.env.N8N_ADMIN_ALERT_WEBHOOK_TOKEN),
        reportWebhookConfigured: Boolean(process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL && (process.env.N8N_REPORT_DISPATCH_WEBHOOK_TOKEN || process.env.N8N_REPORT_DISPATCH_WEBHOOK_SECRET)),
      },
      clients,
      sources: sourceItems,
      automations: automationItems,
      financial: financialItems,
      anomalies: anomalyItems,
      recentErrors: {
        imports: importErrors,
        financialNotifications: financialDeliveryErrors,
        sourceNotifications: sourceDeliveryErrors,
        anomalyNotifications: anomalyDeliveryErrors,
        financialRuns,
      },
    };
  },
};
