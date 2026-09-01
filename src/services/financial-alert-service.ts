import { createAdminClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import {
  resolveAdsFinancialStatuses,
  type AdsFinancialProvider,
  type AdsFinancialStatus,
} from "@/lib/ads-financial";
import {
  normalizeFinancialAccountId,
  resolveAlertableFinancialAmount,
} from "@/lib/financial-alerts";

export type FinancialAlertSettingView = {
  id: string | null;
  dataSourceId: string;
  dashboardId: string;
  dashboardName: string;
  provider: AdsFinancialProvider;
  accountId: string;
  accountName: string;
  currency: string | null;
  enabled: boolean;
  thresholdAmount: number;
  repeatIntervalHours: number;
  lastState: string;
  lastObservedAmount: number | null;
  lastObservedAt: string | null;
  lastNotifiedAt: string | null;
};

function relation<T = any>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function parseEnvList(value: string | undefined) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,;\n|]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeProviderAccountId(provider: AdsFinancialProvider, value: unknown) {
  const normalized = normalizeFinancialAccountId(value);
  return provider === "google_ads" ? normalized.replace(/-/g, "") : normalized;
}

function pickStatusForSetting(
  statuses: AdsFinancialStatus[],
  provider: AdsFinancialProvider,
  accountId: string,
) {
  const target = normalizeProviderAccountId(provider, accountId);
  return (
    statuses.find(
      (status) =>
        status.provider === provider &&
        normalizeProviderAccountId(provider, status.accountId) === target,
    ) || null
  );
}

async function loadSettingsByClient(clientId: string) {
  const supabase = await createAdminClient({
    actor: "api_admin",
    action: "list_financial_alert_settings",
  });
  const { data, error } = await supabase
    .from("ads_financial_alert_settings")
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data || [];
}

export const FinancialAlertService = {
  async listClientAccounts(clientId: string): Promise<FinancialAlertSettingView[]> {
    const supabase = await createAdminClient({
      actor: "api_admin",
      action: "list_client_financial_alert_accounts",
    });

    const [settings, googleResult, metaResult] = await Promise.all([
      loadSettingsByClient(clientId),
      supabase
        .from("data_sources")
        .select(
          "id,dashboard_id,name,status,dashboards:dashboards!data_sources_dashboard_id_fkey(id,name),google_ads_sources(customer_id,customer_name,currency_code)",
        )
        .eq("client_id", clientId)
        .eq("type", "google_ads")
        .eq("status", "active"),
      supabase
        .from("data_sources")
        .select(
          "id,dashboard_id,name,status,dashboards:dashboards!data_sources_dashboard_id_fkey(id,name),meta_ad_sources(meta_ad_source_accounts(ad_account_id,ad_account_name,currency))",
        )
        .eq("client_id", clientId)
        .eq("type", "meta_ads")
        .eq("status", "active"),
    ]);

    if (googleResult.error) throw googleResult.error;
    if (metaResult.error) throw metaResult.error;

    const byKey = new Map<string, any>();
    for (const setting of settings) {
      byKey.set(
        `${setting.data_source_id}|${setting.provider}|${normalizeProviderAccountId(
          setting.provider,
          setting.account_id,
        )}`,
        setting,
      );
    }

    const items: FinancialAlertSettingView[] = [];
    const push = (params: {
      dataSourceId: string;
      dashboardId: string;
      dashboardName: string;
      provider: AdsFinancialProvider;
      accountId: string;
      accountName: string;
      currency: string | null;
    }) => {
      const key = `${params.dataSourceId}|${params.provider}|${normalizeProviderAccountId(
        params.provider,
        params.accountId,
      )}`;
      const saved = byKey.get(key);
      items.push({
        id: saved?.id || null,
        ...params,
        enabled: Boolean(saved?.enabled),
        thresholdAmount: Number(saved?.threshold_amount ?? 100),
        repeatIntervalHours: Number(saved?.repeat_interval_hours ?? 24),
        lastState: String(saved?.last_state || "unknown"),
        lastObservedAmount:
          saved?.last_observed_amount === null || saved?.last_observed_amount === undefined
            ? null
            : Number(saved.last_observed_amount),
        lastObservedAt: saved?.last_observed_at || null,
        lastNotifiedAt: saved?.last_notified_at || null,
      });
    };

    for (const source of googleResult.data || []) {
      const dashboard = relation<any>(source.dashboards);
      const account = relation<any>(source.google_ads_sources);
      if (!account?.customer_id) continue;
      push({
        dataSourceId: source.id,
        dashboardId: source.dashboard_id,
        dashboardName: String(dashboard?.name || source.name || "Dashboard"),
        provider: "google_ads",
        accountId: String(account.customer_id),
        accountName: String(account.customer_name || account.customer_id),
        currency: account.currency_code || null,
      });
    }

    for (const source of metaResult.data || []) {
      const dashboard = relation<any>(source.dashboards);
      const metaSource = relation<any>(source.meta_ad_sources);
      const accounts = Array.isArray(metaSource?.meta_ad_source_accounts)
        ? metaSource.meta_ad_source_accounts
        : [];
      for (const account of accounts) {
        if (!account?.ad_account_id) continue;
        push({
          dataSourceId: source.id,
          dashboardId: source.dashboard_id,
          dashboardName: String(dashboard?.name || source.name || "Dashboard"),
          provider: "meta_ads",
          accountId: String(account.ad_account_id),
          accountName: String(account.ad_account_name || account.ad_account_id),
          currency: account.currency || null,
        });
      }
    }

    return items.sort((a, b) =>
      `${a.provider}|${a.accountName}`.localeCompare(
        `${b.provider}|${b.accountName}`,
        "pt-BR",
      ),
    );
  },

  async saveClientAccountSetting(
    clientId: string,
    input: {
      dataSourceId: string;
      provider: AdsFinancialProvider;
      accountId: string;
      enabled: boolean;
      thresholdAmount: number;
      repeatIntervalHours?: number;
    },
  ) {
    const thresholdAmount = Number(input.thresholdAmount);
    const repeatIntervalHours = Number(input.repeatIntervalHours ?? 24);

    if (!Number.isFinite(thresholdAmount) || thresholdAmount < 0) {
      throw new Error("O limite financeiro deve ser maior ou igual a zero.");
    }
    if (
      !Number.isInteger(repeatIntervalHours) ||
      repeatIntervalHours < 1 ||
      repeatIntervalHours > 720
    ) {
      throw new Error("O intervalo de repetição deve ficar entre 1 e 720 horas.");
    }
    if (input.provider !== "google_ads" && input.provider !== "meta_ads") {
      throw new Error("Plataforma financeira inválida.");
    }

    const supabase = await createAdminClient({
      actor: "api_admin",
      action: "save_financial_alert_setting",
    });
    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("id,client_id,dashboard_id,type")
      .eq("id", input.dataSourceId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!source) throw new Error("Fonte de dados não pertence ao cliente.");
    if (source.type !== input.provider) {
      throw new Error("A plataforma da conta não corresponde à fonte de dados.");
    }

    let accountName = input.accountId;
    let currency: string | null = null;
    let canonicalAccountId = normalizeProviderAccountId(input.provider, input.accountId);

    if (input.provider === "google_ads") {
      const { data: account, error } = await supabase
        .from("google_ads_sources")
        .select("customer_id,customer_name,currency_code")
        .eq("data_source_id", source.id)
        .maybeSingle();
      if (error) throw error;
      if (
        !account ||
        normalizeProviderAccountId("google_ads", account.customer_id) !== canonicalAccountId
      ) {
        throw new Error("Conta Google Ads não encontrada nesta fonte.");
      }
      canonicalAccountId = String(account.customer_id);
      accountName = String(account.customer_name || account.customer_id);
      currency = account.currency_code || null;
    } else {
      const { data: accounts, error } = await supabase
        .from("meta_ad_source_accounts")
        .select("ad_account_id,ad_account_name,currency")
        .eq("data_source_id", source.id);
      if (error) throw error;
      const account = (accounts || []).find(
        (item) =>
          normalizeProviderAccountId("meta_ads", item.ad_account_id) === canonicalAccountId,
      );
      if (!account) throw new Error("Conta Meta Ads não encontrada nesta fonte.");
      canonicalAccountId = String(account.ad_account_id);
      accountName = String(account.ad_account_name || account.ad_account_id);
      currency = account.currency || null;
    }

    const { data: existing, error: existingError } = await supabase
      .from("ads_financial_alert_settings")
      .select("id,enabled,threshold_amount")
      .eq("data_source_id", source.id)
      .eq("provider", input.provider)
      .eq("account_id", canonicalAccountId)
      .maybeSingle();
    if (existingError) throw existingError;

    const resetState =
      !existing ||
      Boolean(existing.enabled) !== Boolean(input.enabled) ||
      Number(existing.threshold_amount) !== thresholdAmount;

    const row = {
      data_source_id: source.id,
      dashboard_id: source.dashboard_id,
      client_id: clientId,
      provider: input.provider,
      account_id: canonicalAccountId,
      account_name: accountName,
      currency,
      enabled: Boolean(input.enabled),
      threshold_amount: thresholdAmount,
      repeat_interval_hours: repeatIntervalHours,
      ...(resetState ? { last_state: "unknown", last_notified_at: null } : {}),
    };

    const { data, error } = await supabase
      .from("ads_financial_alert_settings")
      .upsert(row, { onConflict: "data_source_id,provider,account_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDashboardPublicSettings(dashboardId: string) {
    const supabase = await createAdminClient({
      actor: "system",
      action: "read_dashboard_financial_alert_settings",
    });
    const { data, error } = await supabase
      .from("ads_financial_alert_settings")
      .select("provider,account_id,currency,enabled,threshold_amount,last_state")
      .eq("dashboard_id", dashboardId)
      .eq("enabled", true);
    if (error) throw error;

    return (data || []).map((item) => ({
      provider: item.provider,
      accountId: item.account_id,
      currency: item.currency,
      enabled: item.enabled,
      thresholdAmount: Number(item.threshold_amount),
      lastState: item.last_state,
    }));
  },

  async runAlerts() {
    const supabase = await createAdminClient({
      actor: "cron",
      action: "run_financial_alerts",
    });
    const { data: settings, error } = await supabase
      .from("ads_financial_alert_settings")
      .select("*,clients(name),dashboards(name)")
      .eq("enabled", true)
      .order("client_id");
    if (error) throw error;

    const webhookUrl = String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_URL || "").trim();
    const webhookToken = String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN || "").trim();
    const adminEmails = parseEnvList(process.env.FINANCIAL_ALERT_ADMIN_EMAILS);
    const adminPhones = parseEnvList(process.env.FINANCIAL_ALERT_ADMIN_PHONES);
    const fromEmail = String(process.env.FINANCIAL_ALERT_FROM_EMAIL || "").trim();
    const siteUrl = String(
      process.env.NEXT_PUBLIC_SITE_URL || "https://dashboardads.studio4x.com.br",
    ).replace(/\/$/, "");

    const summary = {
      total: settings?.length || 0,
      healthy: 0,
      alerted: 0,
      suppressed: 0,
      unavailable: 0,
      errors: 0,
      details: [] as Array<Record<string, unknown>>,
    };
    const dashboardCache = new Map<string, Promise<any>>();

    for (const setting of settings || []) {
      const observedAt = new Date().toISOString();
      try {
        if (!dashboardCache.has(setting.dashboard_id)) {
          dashboardCache.set(
            setting.dashboard_id,
            getDashboardData(setting.dashboard_id, { bypassRls: true }),
          );
        }

        const dashboardData = await dashboardCache.get(setting.dashboard_id);
        const { allStatuses } = resolveAdsFinancialStatuses(dashboardData);
        const status = pickStatusForSetting(
          allStatuses,
          setting.provider,
          setting.account_id,
        );
        const alertable = resolveAlertableFinancialAmount(status);

        if (!alertable) {
          summary.unavailable += 1;
          await supabase
            .from("ads_financial_alert_settings")
            .update({ last_observed_at: observedAt })
            .eq("id", setting.id);

          summary.details.push({
            settingId: setting.id,
            clientId: setting.client_id,
            dashboardId: setting.dashboard_id,
            provider: setting.provider,
            accountId: setting.account_id,
            decision: "financial_value_unavailable",
            alertSent: false,
          });
          console.info("[FINANCIAL_ALERT]", {
            clientId: setting.client_id,
            dashboardId: setting.dashboard_id,
            provider: setting.provider,
            accountId: setting.account_id,
            currentAmount: null,
            threshold: Number(setting.threshold_amount),
            decision: "financial_value_unavailable",
            alertSent: false,
          });
          continue;
        }

        const { data: evaluationRows, error: evaluationError } = await supabase.rpc(
          "evaluate_ads_financial_alert",
          {
            p_setting_id: setting.id,
            p_amount: alertable.amount,
            p_observed_at: observedAt,
          },
        );
        if (evaluationError) throw evaluationError;

        const evaluation = Array.isArray(evaluationRows)
          ? evaluationRows[0]
          : evaluationRows;
        const decision = String(evaluation?.decision || "unknown");
        const shouldAlert = Boolean(evaluation?.should_alert);

        if (decision === "healthy") summary.healthy += 1;
        else if (!shouldAlert) summary.suppressed += 1;

        console.info("[FINANCIAL_ALERT]", {
          clientId: setting.client_id,
          dashboardId: setting.dashboard_id,
          provider: setting.provider,
          accountId: setting.account_id,
          currentAmount: alertable.amount,
          threshold: Number(setting.threshold_amount),
          decision,
          previousState: evaluation?.previous_state || setting.last_state,
          newState: evaluation?.new_state || null,
          alertSent: false,
          eventId: evaluation?.event_id || null,
        });

        if (!shouldAlert || !evaluation?.event_id) {
          summary.details.push({
            settingId: setting.id,
            provider: setting.provider,
            accountId: setting.account_id,
            amount: alertable.amount,
            threshold: Number(setting.threshold_amount),
            decision,
            alertSent: false,
          });
          continue;
        }

        const client = relation<any>(setting.clients);
        const dashboard = relation<any>(setting.dashboards);
        const payload = {
          eventType: "ads_financial_low_balance",
          eventId: evaluation.event_id,
          detectedAt: observedAt,
          client: {
            id: setting.client_id,
            name: String(client?.name || "Cliente"),
          },
          dashboard: {
            id: setting.dashboard_id,
            name: String(dashboard?.name || "Dashboard ADS"),
            url: `${siteUrl}/app/dashboards/${setting.dashboard_id}/executive-summary`,
          },
          provider: setting.provider,
          account: {
            id: setting.account_id,
            name: setting.account_name || setting.account_id,
            currency: setting.currency || status?.currency || "BRL",
          },
          financial: {
            amount: alertable.amount,
            amountLabel: alertable.label,
            threshold: Number(setting.threshold_amount),
            currency: setting.currency || status?.currency || "BRL",
            estimatedDaysRemaining: status?.estimatedDaysRemaining ?? null,
            updatedAt: status?.updatedAt || dashboardData?.lastUpdated || observedAt,
          },
          admin: {
            emails: adminEmails,
            phones: adminPhones,
            fromEmail,
          },
        };

        await supabase
          .from("ads_financial_alert_events")
          .update({ payload })
          .eq("id", evaluation.event_id);

        let deliveryOk = false;
        let deliveryError = "";
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${webhookToken}`,
            },
            body: JSON.stringify(payload),
            cache: "no-store",
          });
          if (!response.ok) throw new Error(`n8n retornou HTTP ${response.status}`);
          deliveryOk = true;
        } catch (deliveryFailure) {
          deliveryError =
            deliveryFailure instanceof Error
              ? deliveryFailure.message
              : "Falha ao enviar webhook financeiro.";
        }

        const { error: finalizeError } = await supabase.rpc(
          "finalize_ads_financial_alert_event",
          {
            p_event_id: evaluation.event_id,
            p_success: deliveryOk,
            p_error: deliveryOk ? null : deliveryError,
          },
        );
        if (finalizeError) throw finalizeError;
        if (!deliveryOk) throw new Error(deliveryError);

        summary.alerted += 1;
        summary.details.push({
          settingId: setting.id,
          provider: setting.provider,
          accountId: setting.account_id,
          amount: alertable.amount,
          threshold: Number(setting.threshold_amount),
          decision,
          alertSent: true,
          eventId: evaluation.event_id,
        });
        console.info("[FINANCIAL_ALERT_SENT]", {
          clientId: setting.client_id,
          dashboardId: setting.dashboard_id,
          provider: setting.provider,
          accountId: setting.account_id,
          currentAmount: alertable.amount,
          threshold: Number(setting.threshold_amount),
          decision,
          alertSent: true,
          eventId: evaluation.event_id,
        });
      } catch (runError) {
        summary.errors += 1;
        const message = runError instanceof Error ? runError.message : "Erro desconhecido";
        summary.details.push({
          settingId: setting.id,
          provider: setting.provider,
          accountId: setting.account_id,
          status: "error",
          message,
        });
        console.error("[FINANCIAL_ALERT_ERROR]", {
          clientId: setting.client_id,
          dashboardId: setting.dashboard_id,
          provider: setting.provider,
          accountId: setting.account_id,
          message,
        });
      }
    }

    return summary;
  },
};
