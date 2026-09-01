import { createAdminClient } from "@/lib/supabase/server";

export type OperationalActivityItem = {
  id: string;
  clientId: string | null;
  clientName: string;
  dashboardId: string | null;
  dashboardName: string | null;
  type: "import" | "financial_alert" | "stale_data" | "performance_anomaly" | "automation" | "configuration";
  status: "success" | "info" | "warning" | "error";
  title: string;
  description: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

function relation<T = any>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function safeText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function notificationStatus(status: unknown): "success" | "info" | "warning" | "error" {
  const value = String(status || "").toLowerCase();
  if (value === "sent" || value === "success") return "success";
  if (value === "error" || value === "failed") return "error";
  if (value === "pending") return "warning";
  return "info";
}

function importStatus(status: unknown): "success" | "info" | "warning" | "error" {
  const value = String(status || "").toLowerCase();
  if (value === "success") return "success";
  if (value === "success_with_warnings") return "warning";
  if (value === "failed" || value === "error") return "error";
  return "info";
}

function formatMoney(value: unknown, currency: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "valor indisponível";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: String(currency || "BRL") }).format(amount);
  } catch {
    return `${String(currency || "")} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
  }
}

export const OperationalActivityService = {
  async getTimeline(options?: { clientId?: string | null; limit?: number }) {
    const safeLimit = Math.min(1500, Math.max(50, Number(options?.limit || 600)));
    const clientId = String(options?.clientId || "").trim() || null;
    const supabase = await createAdminClient({ actor: "api_admin", action: "read_operational_activity_timeline" });

    const applyClient = (query: any) => clientId ? query.eq("client_id", clientId) : query;

    const [importsResult, financialResult, staleResult, anomaliesResult, automationsResult, financialSettingsResult, sourceSettingsResult, anomalySettingsResult] = await Promise.all([
      applyClient(
        supabase.from("import_logs")
          .select("id,client_id,dashboard_id,data_source_id,source_type,status,started_at,finished_at,duration_ms,rows_read,warnings,errors,clients(name),dashboards(name)")
          .order("started_at", { ascending: false })
          .limit(safeLimit),
      ),
      applyClient(
        supabase.from("ads_financial_alert_events")
          .select("id,client_id,dashboard_id,provider,account_id,amount,threshold,currency,decision,detected_at,notification_status,notified_at,error_message,days_remaining,threshold_days,trigger_type,clients(name),dashboards(name),setting:ads_financial_alert_settings!ads_financial_alert_events_setting_id_fkey(account_name)")
          .order("detected_at", { ascending: false })
          .limit(safeLimit),
      ),
      applyClient(
        supabase.from("source_monitoring_events")
          .select("id,client_id,dashboard_id,data_source_id,source_type,source_name,fresh_at,age_minutes,threshold_minutes,decision,detected_at,notification_status,notified_at,error_message,clients(name),dashboards(name)")
          .order("detected_at", { ascending: false })
          .limit(safeLimit),
      ),
      applyClient(
        supabase.from("performance_anomaly_events")
          .select("id,client_id,dashboard_id,anomaly_key,severity,title,message,current_value,baseline_value,change_pct,detected_at,notification_status,notified_at,error_message,clients(name),dashboards(name)")
          .order("detected_at", { ascending: false })
          .limit(safeLimit),
      ),
      applyClient(
        supabase.from("dashboards")
          .select("id,client_id,name,automation_enabled,automation_last_completed_at,automation_last_completion_status,automation_last_completion_message,clients(name)")
          .eq("automation_enabled", true)
          .not("automation_last_completed_at", "is", null)
          .order("automation_last_completed_at", { ascending: false })
          .limit(Math.min(500, safeLimit)),
      ),
      applyClient(
        supabase.from("ads_financial_alert_settings")
          .select("id,client_id,dashboard_id,provider,account_name,enabled,threshold_amount,amount_alert_enabled,days_alert_enabled,threshold_days,updated_at,clients(name),dashboards(name)")
          .order("updated_at", { ascending: false })
          .limit(Math.min(500, safeLimit)),
      ),
      applyClient(
        supabase.from("source_monitoring_settings")
          .select("data_source_id,client_id,dashboard_id,enabled,stale_after_minutes,updated_at,clients(name),dashboards(name),data_sources(name,type)")
          .order("updated_at", { ascending: false })
          .limit(Math.min(500, safeLimit)),
      ),
      applyClient(
        supabase.from("performance_anomaly_settings")
          .select("dashboard_id,client_id,enabled,recent_days,baseline_days,updated_at,clients(name),dashboards(name)")
          .order("updated_at", { ascending: false })
          .limit(Math.min(500, safeLimit)),
      ),
    ]);

    const results = [importsResult, financialResult, staleResult, anomaliesResult, automationsResult, financialSettingsResult, sourceSettingsResult, anomalySettingsResult];
    const error = results.find((result: any) => result.error)?.error;
    if (error) throw error;

    const items: OperationalActivityItem[] = [];

    for (const row of importsResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      const warnings = Number(row.warnings || 0);
      const errors = Number(row.errors || 0);
      items.push({
        id: `import:${row.id}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "import",
        status: importStatus(row.status),
        title: `Sincronização ${safeText(row.source_type, "de dados")}`,
        description: `Status: ${safeText(row.status, "desconhecido")}. ${Number(row.rows_read || 0).toLocaleString("pt-BR")} linhas processadas${warnings ? `, ${warnings} aviso(s)` : ""}${errors ? `, ${errors} erro(s)` : ""}.`,
        occurredAt: row.finished_at || row.started_at,
        metadata: { dataSourceId: row.data_source_id, durationMs: row.duration_ms, rowsRead: row.rows_read, warnings, errors },
      });
    }

    for (const row of financialResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      const setting = relation<any>(row.setting);
      const coverage = row.days_remaining === null || row.days_remaining === undefined ? "" : ` Cobertura estimada: ${Number(row.days_remaining).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias.`;
      items.push({
        id: `financial:${row.id}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "financial_alert",
        status: notificationStatus(row.notification_status),
        title: `Alerta financeiro · ${safeText(setting?.account_name || row.account_id, "conta")}`,
        description: `${formatMoney(row.amount, row.currency)} observado, limite ${formatMoney(row.threshold, row.currency)}.${coverage} Envio: ${safeText(row.notification_status, "pendente")}.`,
        occurredAt: row.detected_at,
        metadata: { provider: row.provider, decision: row.decision, triggerType: row.trigger_type, notifiedAt: row.notified_at, error: row.error_message },
      });
    }

    for (const row of staleResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      const age = row.age_minutes === null || row.age_minutes === undefined ? "sem atualização registrada" : `${Number(row.age_minutes).toLocaleString("pt-BR")} min sem atualizar`;
      items.push({
        id: `stale:${row.id}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "stale_data",
        status: notificationStatus(row.notification_status),
        title: `Dados desatualizados · ${safeText(row.source_name, "fonte")}`,
        description: `${age}. Limite: ${Number(row.threshold_minutes || 0).toLocaleString("pt-BR")} min. Envio: ${safeText(row.notification_status, "pendente")}.`,
        occurredAt: row.detected_at,
        metadata: { dataSourceId: row.data_source_id, sourceType: row.source_type, freshAt: row.fresh_at, decision: row.decision, notifiedAt: row.notified_at, error: row.error_message },
      });
    }

    for (const row of anomaliesResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      items.push({
        id: `anomaly:${row.id}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "performance_anomaly",
        status: row.notification_status === "error" ? "error" : row.severity === "critical" ? "error" : "warning",
        title: safeText(row.title, "Anomalia de desempenho"),
        description: `${safeText(row.message, "Anomalia detectada.")} Envio: ${safeText(row.notification_status, "pendente")}.`,
        occurredAt: row.detected_at,
        metadata: { anomalyKey: row.anomaly_key, severity: row.severity, currentValue: row.current_value, baselineValue: row.baseline_value, changePct: row.change_pct, notifiedAt: row.notified_at, error: row.error_message },
      });
    }

    for (const row of automationsResult.data || []) {
      const client = relation<any>(row.clients);
      const status = String(row.automation_last_completion_status || "").toLowerCase();
      items.push({
        id: `automation:${row.id}:${row.automation_last_completed_at}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.id,
        dashboardName: row.name,
        type: "automation",
        status: status === "error" || status === "failed" ? "error" : status.includes("warning") ? "warning" : "success",
        title: `Automação de relatório · ${safeText(row.name, "Dashboard")}`,
        description: safeText(row.automation_last_completion_message, `Conclusão registrada com status ${safeText(row.automation_last_completion_status, "desconhecido")}.`),
        occurredAt: row.automation_last_completed_at,
        metadata: { completionStatus: row.automation_last_completion_status },
      });
    }

    for (const row of financialSettingsResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      const triggers = [row.amount_alert_enabled ? `valor ${Number(row.threshold_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null, row.days_alert_enabled ? `cobertura ${Number(row.threshold_days).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias` : null].filter(Boolean).join(" + ");
      items.push({
        id: `config:financial:${row.id}:${row.updated_at}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "configuration",
        status: "info",
        title: `Configuração financeira · ${safeText(row.account_name, "conta")}`,
        description: row.enabled ? `Alerta ativo (${triggers || "gatilho não informado"}).` : "Alerta financeiro desativado.",
        occurredAt: row.updated_at,
        metadata: { provider: row.provider },
      });
    }

    for (const row of sourceSettingsResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      const source = relation<any>(row.data_sources);
      items.push({
        id: `config:source:${row.data_source_id}:${row.updated_at}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "configuration",
        status: "info",
        title: `Monitoramento de fonte · ${safeText(source?.name, "fonte")}`,
        description: row.enabled ? `Alerta de dados atrasados ativo após ${Number(row.stale_after_minutes).toLocaleString("pt-BR")} minutos.` : "Alerta de dados atrasados desativado.",
        occurredAt: row.updated_at,
        metadata: { sourceType: source?.type },
      });
    }

    for (const row of anomalySettingsResult.data || []) {
      const client = relation<any>(row.clients);
      const dashboard = relation<any>(row.dashboards);
      items.push({
        id: `config:anomaly:${row.dashboard_id}:${row.updated_at}`,
        clientId: row.client_id,
        clientName: safeText(client?.name, "Cliente"),
        dashboardId: row.dashboard_id,
        dashboardName: dashboard?.name || null,
        type: "configuration",
        status: "info",
        title: `Detecção de anomalias · ${safeText(dashboard?.name, "Dashboard")}`,
        description: row.enabled ? `Ativa: janela de ${row.recent_days} dias comparada aos ${row.baseline_days} dias anteriores.` : "Detecção de anomalias desativada.",
        occurredAt: row.updated_at,
      });
    }

    items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return items.slice(0, safeLimit);
  },
};
