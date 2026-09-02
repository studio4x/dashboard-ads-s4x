import { createAdminClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { AdminNotificationService } from "@/services/admin-notification-service";

type DailyPoint = { date: string; cost: number; clicks: number; impressions: number; conversions: number };
type Aggregate = { days: number; cost: number; clicks: number; impressions: number; conversions: number; avgSpend: number; avgConversions: number; ctr: number; cpa: number | null };

type AnomalyCandidate = {
  key: string;
  title: string;
  message: string;
  severity: "warning" | "critical";
  isAnomaly: boolean;
  currentValue: number | null;
  baselineValue: number | null;
  changePct: number | null;
};

function relation<T = any>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: unknown) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function inferProvider(rows: any[], fallback: string) {
  if (fallback === "meta_ads" || fallback === "google_ads") return fallback;
  const sample = rows.find(Boolean) || {};
  return sample.adSetName || sample.messagingConversationsStarted !== undefined ? "meta_ads" : "google_ads";
}

function buildDaily(rows: any[]) {
  const map = new Map<string, DailyPoint>();
  for (const row of rows || []) {
    const date = normalizeDate(row?.date);
    if (!date) continue;
    const current = map.get(date) || { date, cost: 0, clicks: 0, impressions: 0, conversions: 0 };
    current.cost += number(row?.cost ?? row?.spend);
    current.clicks += number(row?.clicks ?? row?.inlineLinkClicks);
    current.impressions += number(row?.impressions);
    current.conversions += number(row?.conversions ?? row?.messagingConversationsStarted ?? row?.leads);
    map.set(date, current);
  }
  const existing = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  if (!existing.length) return [];

  const start = new Date(`${existing[0].date}T12:00:00Z`);
  const end = new Date(`${existing[existing.length - 1].date}T12:00:00Z`);
  const filled: DailyPoint[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    filled.push(map.get(date) || { date, cost: 0, clicks: 0, impressions: 0, conversions: 0 });
  }
  return filled;
}

function aggregate(points: DailyPoint[]): Aggregate {
  const result = points.reduce((acc, point) => ({
    cost: acc.cost + point.cost,
    clicks: acc.clicks + point.clicks,
    impressions: acc.impressions + point.impressions,
    conversions: acc.conversions + point.conversions,
  }), { cost: 0, clicks: 0, impressions: 0, conversions: 0 });
  const days = Math.max(1, points.length);
  return {
    days,
    ...result,
    avgSpend: result.cost / days,
    avgConversions: result.conversions / days,
    ctr: result.impressions > 0 ? (result.clicks / result.impressions) * 100 : 0,
    cpa: result.conversions > 0 ? result.cost / result.conversions : null,
  };
}

function pctChange(current: number, baseline: number) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) return null;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

function formatPct(value: number | null) {
  return value === null ? "—" : `${Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function detect(settings: any, provider: string, daily: DailyPoint[]): AnomalyCandidate[] {
  const need = Number(settings.recent_days) + Number(settings.baseline_days);
  if (daily.length < Math.min(10, need)) return [];
  const recentDays = Number(settings.recent_days);
  const baselineDays = Number(settings.baseline_days);
  const recent = aggregate(daily.slice(-recentDays));
  const baseline = aggregate(daily.slice(-(recentDays + baselineDays), -recentDays));
  if (baseline.cost < Number(settings.min_baseline_spend)) return [];

  const cpaChange = recent.cpa !== null && baseline.cpa !== null ? pctChange(recent.cpa, baseline.cpa) : null;
  const ctrChange = pctChange(recent.ctr, baseline.ctr);
  const convChange = pctChange(recent.avgConversions, baseline.avgConversions);
  const spendChange = pctChange(recent.avgSpend, baseline.avgSpend);
  const providerLabel = provider === "meta_ads" ? "Meta Ads" : "Google Ads";
  const zeroWindow = aggregate(daily.slice(-Number(settings.zero_results_days)));
  const latestDay = daily[daily.length - 1];

  const candidates: AnomalyCandidate[] = [];
  candidates.push({
    key: `${provider}:cpa_increase`,
    title: `CPA aumentou no ${providerLabel}`,
    message: `O custo por resultado ficou ${formatPct(cpaChange)} acima da média do período de referência.`,
    severity: cpaChange !== null && cpaChange >= Number(settings.cpa_increase_pct) * 1.8 ? "critical" : "warning",
    isAnomaly: cpaChange !== null && cpaChange >= Number(settings.cpa_increase_pct) && recent.conversions > 0 && baseline.conversions > 0,
    currentValue: recent.cpa,
    baselineValue: baseline.cpa,
    changePct: cpaChange,
  });
  candidates.push({
    key: `${provider}:ctr_drop`,
    title: `CTR caiu no ${providerLabel}`,
    message: `A taxa de cliques ficou ${formatPct(ctrChange)} abaixo da média de referência.`,
    severity: ctrChange !== null && ctrChange <= -Number(settings.ctr_drop_pct) * 1.8 ? "critical" : "warning",
    isAnomaly: ctrChange !== null && ctrChange <= -Number(settings.ctr_drop_pct) && baseline.ctr > 0,
    currentValue: recent.ctr,
    baselineValue: baseline.ctr,
    changePct: ctrChange,
  });
  candidates.push({
    key: `${provider}:conversions_drop`,
    title: `Resultados caíram no ${providerLabel}`,
    message: `A média diária de resultados ficou ${formatPct(convChange)} abaixo da média de referência.`,
    severity: convChange !== null && convChange <= -Number(settings.conversions_drop_pct) * 1.6 ? "critical" : "warning",
    isAnomaly: convChange !== null && convChange <= -Number(settings.conversions_drop_pct) && baseline.avgConversions >= 0.5,
    currentValue: recent.avgConversions,
    baselineValue: baseline.avgConversions,
    changePct: convChange,
  });
  candidates.push({
    key: `${provider}:spend_up_results_down`,
    title: `Investimento subiu e resultados caíram no ${providerLabel}`,
    message: `O investimento médio subiu ${formatPct(spendChange)} enquanto os resultados caíram ${formatPct(convChange)}.`,
    severity: "critical",
    isAnomaly: spendChange !== null && convChange !== null && spendChange >= Number(settings.spend_increase_pct) && convChange <= -20,
    currentValue: recent.avgSpend,
    baselineValue: baseline.avgSpend,
    changePct: spendChange,
  });
  candidates.push({
    key: `${provider}:zero_results`,
    title: `Campanha sem resultados no ${providerLabel}`,
    message: `Não houve resultado nos últimos ${settings.zero_results_days} dias, apesar de existir histórico de conversões e investimento.`,
    severity: "critical",
    isAnomaly: zeroWindow.conversions === 0 && zeroWindow.cost > 0 && baseline.avgConversions >= 0.5,
    currentValue: zeroWindow.conversions,
    baselineValue: baseline.avgConversions,
    changePct: baseline.avgConversions > 0 ? -100 : null,
  });
  candidates.push({
    key: `${provider}:delivery_stopped`,
    title: `Entrega interrompida no ${providerLabel}`,
    message: `O último dia disponível está sem investimento, embora a média diária anterior fosse relevante.`,
    severity: "critical",
    isAnomaly: latestDay.cost === 0 && baseline.avgSpend >= Math.max(10, Number(settings.min_baseline_spend) / baseline.days),
    currentValue: latestDay.cost,
    baselineValue: baseline.avgSpend,
    changePct: baseline.avgSpend > 0 ? -100 : null,
  });
  return candidates;
}

function extractStreams(data: any) {
  const streams: Array<{ provider: string; rows: any[] }> = [];
  const googleRows = Array.isArray(data?.googlePayload?.dailyPerformance) ? data.googlePayload.dailyPerformance : [];
  const metaRows = Array.isArray(data?.metaPayload?.dailyPerformance) ? data.metaPayload.dailyPerformance : [];
  if (googleRows.length) streams.push({ provider: "google_ads", rows: googleRows });
  if (metaRows.length) streams.push({ provider: "meta_ads", rows: metaRows });
  if (!streams.length) {
    const rows = Array.isArray(data?.dailyPerformance) ? data.dailyPerformance : [];
    if (rows.length) streams.push({ provider: inferProvider(rows, String(data?.platform || data?.sourceType || "")), rows });
  }
  return streams;
}

export const PerformanceAnomalyService = {
  async listClientDashboards(clientId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_anomaly_settings" });
    const [dashboardsResult, settingsResult] = await Promise.all([
      supabase.from("dashboards").select("id,name,platform,status").eq("client_id", clientId).eq("status", "active"),
      supabase.from("performance_anomaly_settings").select("*").eq("client_id", clientId),
    ]);
    if (dashboardsResult.error) throw dashboardsResult.error;
    if (settingsResult.error) throw settingsResult.error;
    const settings = new Map((settingsResult.data || []).map((row: any) => [row.dashboard_id, row]));
    return (dashboardsResult.data || []).map((dashboard: any) => {
      const saved: any = settings.get(dashboard.id);
      return {
        dashboardId: dashboard.id,
        dashboardName: dashboard.name,
        platform: dashboard.platform,
        enabled: Boolean(saved?.enabled),
        recentDays: Number(saved?.recent_days ?? 3),
        baselineDays: Number(saved?.baseline_days ?? 14),
        cpaIncreasePct: Number(saved?.cpa_increase_pct ?? 35),
        ctrDropPct: Number(saved?.ctr_drop_pct ?? 30),
        conversionsDropPct: Number(saved?.conversions_drop_pct ?? 40),
        spendIncreasePct: Number(saved?.spend_increase_pct ?? 40),
        zeroResultsDays: Number(saved?.zero_results_days ?? 2),
        minBaselineSpend: Number(saved?.min_baseline_spend ?? 30),
        repeatIntervalHours: Number(saved?.repeat_interval_hours ?? 24),
        lastCheckedAt: saved?.last_checked_at || null,
      };
    });
  },

  async saveClientDashboardSetting(clientId: string, input: any) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "save_anomaly_setting" });
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards").select("id,client_id").eq("id", String(input.dashboardId || "")).eq("client_id", clientId).maybeSingle();
    if (dashboardError) throw dashboardError;
    if (!dashboard) throw new Error("Dashboard não pertence ao cliente.");
    const recentDays = Math.max(1, Math.min(14, Number(input.recentDays ?? 3)));
    const baselineDays = Math.max(7, Math.min(60, Number(input.baselineDays ?? 14)));
    const row = {
      dashboard_id: dashboard.id,
      client_id: clientId,
      enabled: Boolean(input.enabled),
      recent_days: recentDays,
      baseline_days: baselineDays,
      cpa_increase_pct: Math.max(5, Number(input.cpaIncreasePct ?? 35)),
      ctr_drop_pct: Math.max(5, Number(input.ctrDropPct ?? 30)),
      conversions_drop_pct: Math.max(5, Number(input.conversionsDropPct ?? 40)),
      spend_increase_pct: Math.max(5, Number(input.spendIncreasePct ?? 40)),
      zero_results_days: Math.max(1, Math.min(14, Number(input.zeroResultsDays ?? 2))),
      min_baseline_spend: Math.max(0, Number(input.minBaselineSpend ?? 30)),
      repeat_interval_hours: Math.max(1, Math.min(720, Number(input.repeatIntervalHours ?? 24))),
    };
    if (Object.values(row).some((value) => typeof value === "number" && !Number.isFinite(value))) throw new Error("Configuração de anomalia inválida.");
    const { data, error } = await supabase.from("performance_anomaly_settings").upsert(row, { onConflict: "dashboard_id" }).select().single();
    if (error) throw error;
    return data;
  },

  async runAll() {
    const supabase = await createAdminClient({ actor: "cron", action: "run_performance_anomalies" });
    const { data: settings, error } = await supabase
      .from("performance_anomaly_settings")
      .select("*,clients(name),dashboards(name,platform)")
      .eq("enabled", true);
    if (error) throw error;
    const summary = { total: settings?.length || 0, dashboardsAnalyzed: 0, anomalies: 0, alerted: 0, suppressed: 0, insufficientData: 0, errors: 0, details: [] as any[] };
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "https://dashboardads.studio4x.com.br").replace(/\/$/, "");

    for (const setting of settings || []) {
      const detectedAt = new Date().toISOString();
      try {
        const data = await getDashboardData(setting.dashboard_id, { bypassRls: true });
        const streams = extractStreams(data);
        if (!streams.length) {
          summary.insufficientData += 1;
          await supabase.from("performance_anomaly_settings").update({ last_checked_at: detectedAt }).eq("dashboard_id", setting.dashboard_id);
          summary.details.push({ dashboardId: setting.dashboard_id, decision: "insufficient_data" });
          continue;
        }
        summary.dashboardsAnalyzed += 1;
        const client = relation<any>(setting.clients);
        const dashboard = relation<any>(setting.dashboards);

        for (const stream of streams) {
          const daily = buildDaily(stream.rows);
          const candidates = detect(setting, stream.provider, daily);
          if (!candidates.length) {
            summary.insufficientData += 1;
            continue;
          }
          for (const candidate of candidates) {
            const { data: rows, error: rpcError } = await supabase.rpc("evaluate_performance_anomaly", {
              p_dashboard_id: setting.dashboard_id,
              p_client_id: setting.client_id,
              p_anomaly_key: candidate.key,
              p_is_anomaly: candidate.isAnomaly,
              p_title: candidate.title,
              p_message: candidate.message,
              p_current_value: candidate.currentValue,
              p_baseline_value: candidate.baselineValue,
              p_change_pct: candidate.changePct,
              p_severity: candidate.severity,
              p_repeat_interval_hours: setting.repeat_interval_hours,
              p_detected_at: detectedAt,
            });
            if (rpcError) throw rpcError;
            const evaluation = Array.isArray(rows) ? rows[0] : rows;
            if (candidate.isAnomaly) summary.anomalies += 1;
            if (candidate.isAnomaly && !evaluation?.should_alert) summary.suppressed += 1;
            const detail: any = { dashboardId: setting.dashboard_id, provider: stream.provider, anomalyKey: candidate.key, decision: evaluation?.decision, isAnomaly: candidate.isAnomaly, alertSent: false, eventId: evaluation?.event_id || null };

            if (evaluation?.should_alert && evaluation?.event_id) {
              const payload = {
                eventId: evaluation.event_id,
                anomalyKey: candidate.key,
                client: { id: setting.client_id, name: client?.name || "Cliente" },
                dashboard: { id: setting.dashboard_id, name: dashboard?.name || "Dashboard", url: `${siteUrl}/app/dashboards/${setting.dashboard_id}/executive-summary` },
                provider: stream.provider,
                candidate,
              };
              await supabase.from("performance_anomaly_events").update({ payload }).eq("id", evaluation.event_id);
              let ok = false;
              let deliveryError = "";
              try {
                await AdminNotificationService.sendOperationalNotification({
                  eventType: "performance_anomaly",
                  severity: candidate.severity,
                  title: candidate.title,
                  message: candidate.message,
                  client: payload.client,
                  dashboard: payload.dashboard,
                  provider: stream.provider,
                  details: {
                    "Valor atual": candidate.currentValue === null ? "—" : candidate.currentValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
                    "Referência": candidate.baselineValue === null ? "—" : candidate.baselineValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
                    "Variação": candidate.changePct === null ? "—" : `${candidate.changePct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
                    "Janela atual": `${setting.recent_days} dias`,
                    "Referência histórica": `${setting.baseline_days} dias anteriores`,
                  },
                  detectedAt,
                });
                ok = true;
              } catch (deliveryFailure) {
                deliveryError = deliveryFailure instanceof Error ? deliveryFailure.message : "Falha ao enviar alerta de anomalia.";
              }
              const { error: finalizeError } = await supabase.rpc("finalize_performance_anomaly_event", { p_event_id: evaluation.event_id, p_success: ok, p_error: ok ? null : deliveryError });
              if (finalizeError) throw finalizeError;
              if (!ok) throw new Error(deliveryError);
              summary.alerted += 1;
              detail.alertSent = true;
            }
            summary.details.push(detail);
          }
        }
        await supabase.from("performance_anomaly_settings").update({ last_checked_at: detectedAt }).eq("dashboard_id", setting.dashboard_id);
      } catch (runError) {
        summary.errors += 1;
        summary.details.push({ dashboardId: setting.dashboard_id, decision: "execution_error", message: runError instanceof Error ? runError.message : "Erro desconhecido" });
      }
    }
    return summary;
  },
};
