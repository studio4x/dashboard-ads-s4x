import { createAdminClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { resolveAdsFinancialStatuses, type AdsFinancialProvider, type AdsFinancialStatus } from "@/lib/ads-financial";
import { normalizeFinancialAccountId, resolveAlertableFinancialAmount } from "@/lib/financial-alerts";
import { FinancialAlertService } from "@/services/financial-alert-service";
import { AdminNotificationService } from "@/services/admin-notification-service";

function relation<T = any>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function normalizeProviderAccountId(provider: AdsFinancialProvider, value: unknown) {
  const normalized = normalizeFinancialAccountId(value);
  return provider === "google_ads" ? normalized.replace(/-/g, "") : normalized;
}

function pickStatusForSetting(statuses: AdsFinancialStatus[], provider: AdsFinancialProvider, accountId: string) {
  const target = normalizeProviderAccountId(provider, accountId);
  return statuses.find((status) => status.provider === provider && normalizeProviderAccountId(provider, status.accountId) === target) || null;
}

function providerLabel(provider: string) {
  return provider === "meta_ads" ? "Meta Ads" : "Google Ads";
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2).replace(".", ",")}`;
  }
}

async function loadSetting(settingId: string) {
  const supabase = await createAdminClient({ actor: "system", action: "read_enhanced_financial_alert_setting" });
  const { data, error } = await supabase
    .from("ads_financial_alert_settings")
    .select("*,clients(name),dashboards(name)")
    .eq("id", settingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Configuração de alerta financeiro não encontrada.");
  return data;
}

async function evaluateOne(setting: any, options: { deliver: boolean; mutate: boolean }) {
  const dashboardData = await getDashboardData(setting.dashboard_id, { bypassRls: true });
  const { allStatuses } = resolveAdsFinancialStatuses(dashboardData);
  const status = pickStatusForSetting(allStatuses, setting.provider, setting.account_id);
  const alertable = resolveAlertableFinancialAmount(status);
  const observedAt = new Date().toISOString();

  if (!alertable) {
    if (options.mutate) {
      const supabase = await createAdminClient({ actor: "system", action: "update_unavailable_financial_observation" });
      await supabase.from("ads_financial_alert_settings").update({ last_observed_at: observedAt }).eq("id", setting.id);
    }
    return {
      settingId: setting.id,
      clientId: setting.client_id,
      dashboardId: setting.dashboard_id,
      provider: setting.provider,
      accountId: setting.account_id,
      accountName: setting.account_name,
      decision: "financial_value_unavailable",
      alertSent: false,
      amount: null,
      estimatedDaysRemaining: status?.estimatedDaysRemaining ?? null,
      threshold: Number(setting.threshold_amount),
      thresholdDays: Number(setting.threshold_days ?? 2),
      triggerType: null,
    };
  }

  const amount = Number(alertable.amount);
  const daysRemaining = status?.estimatedDaysRemaining === null || status?.estimatedDaysRemaining === undefined ? null : Number(status.estimatedDaysRemaining);
  const amountTriggered = Boolean(setting.amount_alert_enabled) && amount < Number(setting.threshold_amount);
  const daysTriggered = Boolean(setting.days_alert_enabled) && daysRemaining !== null && Number.isFinite(daysRemaining) && daysRemaining < Number(setting.threshold_days ?? 2);
  const triggerType = amountTriggered && daysTriggered ? "amount_and_days" : amountTriggered ? "amount" : daysTriggered ? "days_remaining" : null;

  if (!options.mutate) {
    return {
      settingId: setting.id,
      clientId: setting.client_id,
      dashboardId: setting.dashboard_id,
      provider: setting.provider,
      accountId: setting.account_id,
      accountName: setting.account_name,
      amount,
      amountLabel: alertable.label,
      estimatedDaysRemaining: daysRemaining,
      threshold: Number(setting.threshold_amount),
      thresholdDays: Number(setting.threshold_days ?? 2),
      amountTriggered,
      daysTriggered,
      triggerType,
      decision: triggerType ? "would_alert" : "healthy",
      alertSent: false,
      observedAt,
      financialUpdatedAt: status?.updatedAt || dashboardData?.lastUpdated || null,
    };
  }

  const supabase = await createAdminClient({ actor: "system", action: "evaluate_enhanced_financial_alert" });
  const { data: rows, error: evaluationError } = await supabase.rpc("evaluate_ads_financial_alert_v2", {
    p_setting_id: setting.id,
    p_amount: amount,
    p_days_remaining: daysRemaining,
    p_observed_at: observedAt,
  });
  if (evaluationError) throw evaluationError;
  const evaluation = Array.isArray(rows) ? rows[0] : rows;
  const decision = String(evaluation?.decision || "unknown");
  const shouldAlert = Boolean(evaluation?.should_alert);
  const detail: any = {
    settingId: setting.id,
    clientId: setting.client_id,
    dashboardId: setting.dashboard_id,
    provider: setting.provider,
    accountId: setting.account_id,
    accountName: setting.account_name,
    amount,
    amountLabel: alertable.label,
    estimatedDaysRemaining: daysRemaining,
    threshold: Number(setting.threshold_amount),
    thresholdDays: Number(setting.threshold_days ?? 2),
    decision,
    triggerType: evaluation?.trigger_type || triggerType,
    alertSent: false,
    eventId: evaluation?.event_id || null,
    observedAt,
  };

  if (!shouldAlert || !evaluation?.event_id || !options.deliver) return detail;

  const recipients = await AdminNotificationService.getSettings();
  const webhookUrl = String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_URL || "").trim();
  const webhookToken = String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN || "").trim();
  if (!webhookUrl || !webhookToken) throw new Error("Webhook financeiro do n8n não configurado.");
  if (!recipients.emails.length || !recipients.phones.length || !recipients.fromEmail) throw new Error("Destinatários administrativos incompletos.");

  const client = relation<any>(setting.clients);
  const dashboard = relation<any>(setting.dashboards);
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "https://dashboardads.studio4x.com.br").replace(/\/$/, "");
  const payload = {
    eventType: "ads_financial_low_balance",
    eventId: evaluation.event_id,
    detectedAt: observedAt,
    client: { id: setting.client_id, name: String(client?.name || "Cliente") },
    dashboard: { id: setting.dashboard_id, name: String(dashboard?.name || "Dashboard ADS"), url: `${siteUrl}/app/dashboards/${setting.dashboard_id}/executive-summary` },
    provider: setting.provider,
    account: { id: setting.account_id, name: setting.account_name || setting.account_id, currency: setting.currency || status?.currency || "BRL" },
    financial: {
      amount,
      amountLabel: alertable.label,
      threshold: Number(setting.threshold_amount),
      currency: setting.currency || status?.currency || "BRL",
      estimatedDaysRemaining: daysRemaining,
      thresholdDays: Number(setting.threshold_days ?? 2),
      triggerType: evaluation?.trigger_type || triggerType,
      updatedAt: status?.updatedAt || dashboardData?.lastUpdated || observedAt,
    },
    admin: { emails: recipients.emails, phones: recipients.phones, fromEmail: recipients.fromEmail },
  };

  await supabase.from("ads_financial_alert_events").update({ payload }).eq("id", evaluation.event_id);
  let deliveryOk = false;
  let deliveryError = "";
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${webhookToken}` },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`n8n retornou HTTP ${response.status}`);
    deliveryOk = true;
  } catch (failure) {
    deliveryError = failure instanceof Error ? failure.message : "Falha ao enviar webhook financeiro.";
  }

  const { error: finalizeError } = await supabase.rpc("finalize_ads_financial_alert_event", {
    p_event_id: evaluation.event_id,
    p_success: deliveryOk,
    p_error: deliveryOk ? null : deliveryError,
  });
  if (finalizeError) throw finalizeError;
  if (!deliveryOk) throw new Error(deliveryError);
  detail.alertSent = true;
  return detail;
}

export const EnhancedFinancialAlertService = {
  async listClientAccounts(clientId: string) {
    const base = await FinancialAlertService.listClientAccounts(clientId);
    const ids = base.map((item) => item.id).filter(Boolean) as string[];
    if (!ids.length) return base.map((item) => ({ ...item, amountAlertEnabled: true, daysAlertEnabled: false, thresholdDays: 2, lastObservedDaysRemaining: null, lastTriggerType: null }));
    const supabase = await createAdminClient({ actor: "api_admin", action: "read_enhanced_client_financial_settings" });
    const { data, error } = await supabase
      .from("ads_financial_alert_settings")
      .select("id,amount_alert_enabled,days_alert_enabled,threshold_days,last_observed_days_remaining,last_trigger_type")
      .in("id", ids);
    if (error) throw error;
    const extras = new Map((data || []).map((row: any) => [row.id, row]));
    return base.map((item: any) => {
      const extra: any = item.id ? extras.get(item.id) : null;
      return {
        ...item,
        amountAlertEnabled: extra?.amount_alert_enabled ?? true,
        daysAlertEnabled: extra?.days_alert_enabled ?? false,
        thresholdDays: Number(extra?.threshold_days ?? 2),
        lastObservedDaysRemaining: extra?.last_observed_days_remaining === null || extra?.last_observed_days_remaining === undefined ? null : Number(extra.last_observed_days_remaining),
        lastTriggerType: extra?.last_trigger_type || null,
      };
    });
  },

  async saveClientAccountSetting(clientId: string, input: any) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "save_enhanced_financial_alert_setting" });
    const amountAlertEnabled = input.amountAlertEnabled === undefined ? true : Boolean(input.amountAlertEnabled);
    const daysAlertEnabled = Boolean(input.daysAlertEnabled);
    const thresholdDays = Number(input.thresholdDays ?? 2);
    if (!amountAlertEnabled && !daysAlertEnabled && Boolean(input.enabled)) throw new Error("Ative pelo menos um gatilho financeiro: valor ou dias restantes.");
    if (!Number.isFinite(thresholdDays) || thresholdDays < 0 || thresholdDays > 365) throw new Error("O limite de dias restantes deve ficar entre 0 e 365.");

    const { data: existing } = await supabase
      .from("ads_financial_alert_settings")
      .select("id,amount_alert_enabled,days_alert_enabled,threshold_days")
      .eq("data_source_id", String(input.dataSourceId || ""))
      .eq("provider", String(input.provider || ""))
      .eq("account_id", String(input.accountId || ""))
      .maybeSingle();

    const base = await FinancialAlertService.saveClientAccountSetting(clientId, {
      dataSourceId: String(input.dataSourceId || ""),
      provider: input.provider,
      accountId: String(input.accountId || ""),
      enabled: Boolean(input.enabled),
      thresholdAmount: Number(input.thresholdAmount),
      repeatIntervalHours: Number(input.repeatIntervalHours ?? 24),
    });
    const changed = !existing || Boolean(existing.amount_alert_enabled) !== amountAlertEnabled || Boolean(existing.days_alert_enabled) !== daysAlertEnabled || Number(existing.threshold_days) !== thresholdDays;
    const { data, error } = await supabase
      .from("ads_financial_alert_settings")
      .update({
        amount_alert_enabled: amountAlertEnabled,
        days_alert_enabled: daysAlertEnabled,
        threshold_days: thresholdDays,
        ...(changed ? { last_state: "unknown", last_notified_at: null, last_trigger_type: null } : {}),
      })
      .eq("id", base.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDashboardPublicSettings(dashboardId: string) {
    const supabase = await createAdminClient({ actor: "system", action: "read_enhanced_dashboard_financial_settings" });
    const { data, error } = await supabase
      .from("ads_financial_alert_settings")
      .select("provider,account_id,currency,enabled,threshold_amount,amount_alert_enabled,days_alert_enabled,threshold_days,last_state,last_observed_days_remaining,last_trigger_type")
      .eq("dashboard_id", dashboardId)
      .eq("enabled", true);
    if (error) throw error;
    return (data || []).map((item: any) => ({
      provider: item.provider,
      accountId: item.account_id,
      currency: item.currency,
      enabled: item.enabled,
      thresholdAmount: Number(item.threshold_amount),
      amountAlertEnabled: Boolean(item.amount_alert_enabled),
      daysAlertEnabled: Boolean(item.days_alert_enabled),
      thresholdDays: Number(item.threshold_days ?? 2),
      lastState: item.last_state,
      lastObservedDaysRemaining: item.last_observed_days_remaining === null ? null : Number(item.last_observed_days_remaining),
      lastTriggerType: item.last_trigger_type,
    }));
  },

  async inspectSetting(settingId: string) {
    const setting = await loadSetting(settingId);
    return evaluateOne(setting, { deliver: false, mutate: false });
  },

  async runSetting(settingId: string) {
    const setting = await loadSetting(settingId);
    if (!setting.enabled) throw new Error("O alerta financeiro desta conta está desativado.");
    return evaluateOne(setting, { deliver: true, mutate: true });
  },

  async sendTestNotification(settingId: string) {
    const setting = await loadSetting(settingId);
    const client = relation<any>(setting.clients);
    const dashboard = relation<any>(setting.dashboards);
    const inspection: any = await evaluateOne(setting, { deliver: false, mutate: false });
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "https://dashboardads.studio4x.com.br").replace(/\/$/, "");
    await AdminNotificationService.sendOperationalNotification({
      eventType: "test_notification",
      severity: "info",
      title: "Teste de notificação financeira",
      message: `Este é um teste do alerta financeiro configurado para ${setting.account_name || setting.account_id}. Nenhum estado financeiro foi alterado.`,
      client: { id: setting.client_id, name: client?.name || "Cliente" },
      dashboard: { id: setting.dashboard_id, name: dashboard?.name || "Dashboard", url: `${siteUrl}/app/dashboards/${setting.dashboard_id}/executive-summary` },
      provider: setting.provider,
      account: { id: setting.account_id, name: setting.account_name || setting.account_id },
      details: {
        "Valor observado": inspection.amount === null ? "Indisponível" : formatMoney(inspection.amount, setting.currency || "BRL"),
        "Limite por valor": setting.amount_alert_enabled ? formatMoney(Number(setting.threshold_amount), setting.currency || "BRL") : "Desativado",
        "Cobertura estimada": inspection.estimatedDaysRemaining === null ? "Indisponível" : `${Number(inspection.estimatedDaysRemaining).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`,
        "Limite por cobertura": setting.days_alert_enabled ? `${Number(setting.threshold_days).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias` : "Desativado",
      },
    });
    return { success: true };
  },

  async runAlerts() {
    const supabase = await createAdminClient({ actor: "cron", action: "run_enhanced_financial_alerts" });
    const { data: settings, error } = await supabase
      .from("ads_financial_alert_settings")
      .select("*,clients(name),dashboards(name)")
      .eq("enabled", true)
      .order("client_id");
    if (error) throw error;

    const summary = { total: settings?.length || 0, healthy: 0, alerted: 0, suppressed: 0, unavailable: 0, errors: 0, details: [] as Array<Record<string, unknown>> };
    for (const setting of settings || []) {
      try {
        const detail: any = await evaluateOne(setting, { deliver: true, mutate: true });
        if (detail.decision === "healthy") summary.healthy += 1;
        else if (detail.decision === "financial_value_unavailable") summary.unavailable += 1;
        else if (detail.alertSent) summary.alerted += 1;
        else if (detail.decision === "still_below_suppressed") summary.suppressed += 1;
        summary.details.push(detail);
      } catch (error) {
        summary.errors += 1;
        summary.details.push({ settingId: setting.id, clientId: setting.client_id, dashboardId: setting.dashboard_id, provider: setting.provider, accountId: setting.account_id, status: "error", decision: "execution_error", message: error instanceof Error ? error.message : "Erro desconhecido" });
      }
    }
    return summary;
  },
};
