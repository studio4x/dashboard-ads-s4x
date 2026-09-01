import { createAdminClient } from "@/lib/supabase/server";
import { AdminNotificationService } from "@/services/admin-notification-service";

function relation<T = any>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function sourceFreshness(source: any) {
  const googleSheet = relation<any>(source.google_sheet_sources);
  const googleAds = relation<any>(source.google_ads_sources);
  const metaAds = relation<any>(source.meta_ad_sources);
  const native = source.type === "google_ads" ? googleAds : source.type === "meta_ads" ? metaAds : googleSheet;
  return {
    freshAt: native?.last_import_at || null,
    importStatus: native?.last_import_status || null,
    lastError: native?.last_error || null,
  };
}

function sourceTypeLabel(type: string) {
  if (type === "google_ads") return "Google Ads";
  if (type === "meta_ads") return "Meta Ads";
  if (type === "google_sheets") return "Google Sheets";
  return type || "Fonte de dados";
}

async function fetchSources(clientId?: string) {
  const supabase = await createAdminClient({ actor: "system", action: "read_source_monitoring_sources" });
  let query = supabase
    .from("data_sources")
    .select("id,client_id,dashboard_id,type,name,status,clients(name),dashboards(name),google_sheet_sources(last_import_at,last_import_status),google_ads_sources(last_import_at,last_import_status,last_error),meta_ad_sources(last_import_at,last_import_status,last_error)")
    .eq("status", "active");
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function latestSnapshotBySource(sourceIds: string[]) {
  if (!sourceIds.length) return new Map<string, string>();
  const supabase = await createAdminClient({ actor: "system", action: "read_source_monitoring_snapshots" });
  const { data, error } = await supabase
    .from("dashboard_data_snapshots")
    .select("data_source_id,imported_at")
    .in("data_source_id", sourceIds)
    .order("imported_at", { ascending: false });
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data || []) {
    if (row.data_source_id && row.imported_at && !map.has(row.data_source_id)) map.set(row.data_source_id, row.imported_at);
  }
  return map;
}

function ageMinutes(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

export const SourceMonitoringService = {
  async listClientSources(clientId: string) {
    const supabase = await createAdminClient({ actor: "api_admin", action: "list_client_source_monitoring" });
    const [sources, settingsResult] = await Promise.all([
      fetchSources(clientId),
      supabase.from("source_monitoring_settings").select("*").eq("client_id", clientId),
    ]);
    if (settingsResult.error) throw settingsResult.error;
    const snapshots = await latestSnapshotBySource(sources.map((source: any) => source.id));
    const settings = new Map((settingsResult.data || []).map((row: any) => [row.data_source_id, row]));

    return sources.map((source: any) => {
      const saved: any = settings.get(source.id);
      const native = sourceFreshness(source);
      const freshAt = native.freshAt || snapshots.get(source.id) || null;
      return {
        dataSourceId: source.id,
        dashboardId: source.dashboard_id,
        dashboardName: relation<any>(source.dashboards)?.name || "Dashboard",
        sourceName: source.name,
        sourceType: source.type,
        enabled: Boolean(saved?.enabled),
        staleAfterMinutes: Number(saved?.stale_after_minutes ?? 180),
        repeatIntervalHours: Number(saved?.repeat_interval_hours ?? 24),
        lastState: saved?.last_state || "unknown",
        lastCheckedAt: saved?.last_checked_at || null,
        lastFreshAt: saved?.last_fresh_at || freshAt,
        lastNotifiedAt: saved?.last_notified_at || null,
        currentFreshAt: freshAt,
        currentAgeMinutes: ageMinutes(freshAt),
        currentImportStatus: native.importStatus,
        currentError: native.lastError,
      };
    });
  },

  async saveClientSourceSetting(clientId: string, input: { dataSourceId: string; enabled: boolean; staleAfterMinutes: number; repeatIntervalHours?: number }) {
    const staleAfterMinutes = Number(input.staleAfterMinutes);
    const repeatIntervalHours = Number(input.repeatIntervalHours ?? 24);
    if (!Number.isInteger(staleAfterMinutes) || staleAfterMinutes < 30 || staleAfterMinutes > 10080) {
      throw new Error("O limite de atraso deve ficar entre 30 minutos e 7 dias.");
    }
    if (!Number.isInteger(repeatIntervalHours) || repeatIntervalHours < 1 || repeatIntervalHours > 720) {
      throw new Error("O intervalo de repetição deve ficar entre 1 e 720 horas.");
    }

    const supabase = await createAdminClient({ actor: "api_admin", action: "save_source_monitoring_setting" });
    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("id,client_id,dashboard_id")
      .eq("id", input.dataSourceId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) throw new Error("Fonte de dados não pertence ao cliente.");

    const { data: existing, error: existingError } = await supabase
      .from("source_monitoring_settings")
      .select("enabled,stale_after_minutes")
      .eq("data_source_id", source.id)
      .maybeSingle();
    if (existingError) throw existingError;
    const reset = !existing || Boolean(existing.enabled) !== Boolean(input.enabled) || Number(existing.stale_after_minutes) !== staleAfterMinutes;

    const { data, error } = await supabase
      .from("source_monitoring_settings")
      .upsert({
        data_source_id: source.id,
        client_id: clientId,
        dashboard_id: source.dashboard_id,
        enabled: Boolean(input.enabled),
        stale_after_minutes: staleAfterMinutes,
        repeat_interval_hours: repeatIntervalHours,
        ...(reset ? { last_state: "unknown", last_notified_at: null } : {}),
      }, { onConflict: "data_source_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async runAll() {
    const supabase = await createAdminClient({ actor: "cron", action: "run_source_monitoring" });
    const { data: settings, error } = await supabase
      .from("source_monitoring_settings")
      .select("*,clients(name),dashboards(name)")
      .eq("enabled", true);
    if (error) throw error;

    const sources = await fetchSources();
    const byId = new Map(sources.map((source: any) => [source.id, source]));
    const snapshots = await latestSnapshotBySource((settings || []).map((setting: any) => setting.data_source_id));
    const summary = { total: settings?.length || 0, healthy: 0, stale: 0, alerted: 0, suppressed: 0, errors: 0, details: [] as any[] };

    for (const setting of settings || []) {
      const checkedAt = new Date().toISOString();
      try {
        const source: any = byId.get(setting.data_source_id);
        if (!source) throw new Error("Fonte ativa não encontrada.");
        const native = sourceFreshness(source);
        const freshAt = native.freshAt || snapshots.get(source.id) || null;
        const { data: rows, error: rpcError } = await supabase.rpc("evaluate_source_freshness_alert", {
          p_data_source_id: source.id,
          p_fresh_at: freshAt,
          p_checked_at: checkedAt,
          p_source_type: source.type,
          p_source_name: source.name,
        });
        if (rpcError) throw rpcError;
        const evaluation = Array.isArray(rows) ? rows[0] : rows;
        const decision = String(evaluation?.decision || "unknown");
        const shouldAlert = Boolean(evaluation?.should_alert);
        if (decision === "healthy" || decision === "recovered") summary.healthy += 1;
        else summary.stale += 1;
        if (!shouldAlert && decision === "still_stale_suppressed") summary.suppressed += 1;

        const detail = { dataSourceId: source.id, clientId: setting.client_id, dashboardId: setting.dashboard_id, sourceType: source.type, sourceName: source.name, freshAt, ageMinutes: evaluation?.age_minutes ?? ageMinutes(freshAt), thresholdMinutes: setting.stale_after_minutes, decision, alertSent: false, eventId: evaluation?.event_id || null };

        if (shouldAlert && evaluation?.event_id) {
          const client = relation<any>(setting.clients);
          const dashboard = relation<any>(setting.dashboards);
          const age = evaluation?.age_minutes;
          const payload = {
            eventId: evaluation.event_id,
            client: { id: setting.client_id, name: client?.name || "Cliente" },
            dashboard: { id: setting.dashboard_id, name: dashboard?.name || "Dashboard", url: `${String(process.env.NEXT_PUBLIC_SITE_URL || "https://dashboardads.studio4x.com.br").replace(/\/$/, "")}/app/dashboards/${setting.dashboard_id}/executive-summary` },
            source: { id: source.id, type: source.type, name: source.name, freshAt, ageMinutes: age, thresholdMinutes: setting.stale_after_minutes },
          };
          await supabase.from("source_monitoring_events").update({ payload }).eq("id", evaluation.event_id);
          let ok = false;
          let deliveryError = "";
          try {
            await AdminNotificationService.sendOperationalNotification({
              eventType: "stale_data",
              severity: age === null || Number(age) >= Number(setting.stale_after_minutes) * 2 ? "critical" : "warning",
              title: "Dados desatualizados",
              message: `A fonte ${source.name} está sem atualização dentro do intervalo esperado.`,
              client: payload.client,
              dashboard: payload.dashboard,
              provider: source.type,
              account: { id: source.id, name: source.name },
              details: {
                "Última atualização": freshAt ? new Date(freshAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Nunca",
                "Atraso atual": age === null ? "Sem atualização registrada" : `${age} min`,
                "Limite configurado": `${setting.stale_after_minutes} min`,
                "Status da última importação": native.importStatus || "não informado",
              },
              detectedAt: checkedAt,
            });
            ok = true;
          } catch (deliveryFailure) {
            deliveryError = deliveryFailure instanceof Error ? deliveryFailure.message : "Falha ao enviar alerta operacional.";
          }
          const { error: finalizeError } = await supabase.rpc("finalize_source_monitoring_event", { p_event_id: evaluation.event_id, p_success: ok, p_error: ok ? null : deliveryError });
          if (finalizeError) throw finalizeError;
          if (!ok) throw new Error(deliveryError);
          summary.alerted += 1;
          detail.alertSent = true;
        }
        summary.details.push(detail);
      } catch (runError) {
        summary.errors += 1;
        summary.details.push({ dataSourceId: setting.data_source_id, clientId: setting.client_id, dashboardId: setting.dashboard_id, decision: "execution_error", message: runError instanceof Error ? runError.message : "Erro desconhecido" });
      }
    }
    return summary;
  },
};
