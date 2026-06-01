import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/security/api-safety";

export const dynamic = "force-dynamic";

type LocalNow = {
  weekday: number;
  hour: number;
  minute: number;
};

const TZ = "America/Sao_Paulo";

function getLocalNow(date: Date): LocalNow {
  const weekdayStr = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(date);
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: TZ }).format(date));
  const minute = Number(new Intl.DateTimeFormat("en-US", { minute: "2-digit", hour12: false, timeZone: TZ }).format(date));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdayMap[weekdayStr] ?? 0, hour, minute };
}

function isSameLocalMinute(a: Date, b: Date) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(a) === fmt.format(b);
}

function shouldRunNow(dashboard: any, now: Date): boolean {
  if (!dashboard?.automation_enabled) return false;
  const frequency = String(dashboard?.automation_frequency || "weekly");
  const dayOfWeek = Number(dashboard?.automation_day_of_week ?? 1);
  const hour = Number(dashboard?.automation_hour ?? 8);
  const minute = Number(dashboard?.automation_minute ?? 0);
  const local = getLocalNow(now);

  if (local.hour !== hour || local.minute !== minute) return false;
  if (frequency === "weekly" && local.weekday !== dayOfWeek) return false;
  return frequency === "daily" || frequency === "weekly";
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = await createAdminClient({ actor: "cron", action: "dispatch_reports" });
    const { data: dashboards, error } = await supabase
      .from("dashboards")
      .select("id, name, status, automation_enabled, automation_frequency, automation_day_of_week, automation_hour, automation_minute, automation_period_days, automation_report_mode, automation_last_dispatched_at")
      .eq("status", "active")
      .eq("automation_enabled", true);

    if (error) throw error;
    if (!dashboards || dashboards.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "Nenhum dashboard com automação ativa." });
    }

    const origin = new URL(request.url).origin;
    const now = new Date();
    const summary = {
      total: dashboards.length,
      triggered: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<Record<string, unknown>>,
    };

    for (const dashboard of dashboards) {
      if (!shouldRunNow(dashboard, now)) {
        summary.skipped++;
        summary.details.push({ dashboardId: dashboard.id, status: "skipped", reason: "outside_schedule_window" });
        continue;
      }

      if (dashboard.automation_last_dispatched_at) {
        const last = new Date(dashboard.automation_last_dispatched_at);
        if (isSameLocalMinute(last, now)) {
          summary.skipped++;
          summary.details.push({ dashboardId: dashboard.id, status: "skipped", reason: "already_dispatched_this_minute" });
          continue;
        }
      }

      const periodDays = Math.max(1, Math.min(90, Number(dashboard.automation_period_days || 7)));
      const to = new Date(now);
      to.setDate(to.getDate() - 1);
      const from = new Date(to);
      from.setDate(from.getDate() - (periodDays - 1));
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);

      try {
        const response = await fetch(`${origin}/api/admin/automations/report-dispatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({
            dashboardId: dashboard.id,
            from: fromIso,
            to: toIso,
            source: "scheduled",
            reportMode: dashboard.automation_report_mode || "both",
          }),
        });

        const result = await response.json();
        if (!response.ok || !result?.success) {
          summary.failed++;
          summary.details.push({
            dashboardId: dashboard.id,
            status: "failed",
            error: result?.error || "dispatch_failed",
          });
          continue;
        }

        await supabase
          .from("dashboards")
          .update({ automation_last_dispatched_at: new Date().toISOString() })
          .eq("id", dashboard.id);

        summary.triggered++;
        summary.details.push({ dashboardId: dashboard.id, status: "triggered", from: fromIso, to: toIso });
      } catch (error: any) {
        summary.failed++;
        summary.details.push({
          dashboardId: dashboard.id,
          status: "failed",
          error: error?.message || "unexpected_error",
        });
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro no cron de automação.");
  }
}
