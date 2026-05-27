import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

type TaskStatus = "ok" | "overdue" | "disabled" | "never_ran";

function getLocalNow(date: Date) {
  const weekdayStr = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(date);
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: TZ }).format(date));
  const month = Number(new Intl.DateTimeFormat("en-US", { month: "2-digit", timeZone: TZ }).format(date));
  const year = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TZ }).format(date));
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: TZ }).format(date));
  const minute = Number(new Intl.DateTimeFormat("en-US", { minute: "2-digit", hour12: false, timeZone: TZ }).format(date));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdayMap[weekdayStr] ?? 0, day, month, year, hour, minute };
}

function formatLocalDateTime(value: string | null | undefined) {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("pt-BR", { timeZone: TZ });
}

function formatScheduleLabel(task: any) {
  const frequency = String(task?.automation_frequency || "weekly");
  const hour = Number(task?.automation_hour ?? 8);
  const minute = Number(task?.automation_minute ?? 0);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  if (frequency === "daily") return `Diario as ${hh}:${mm}`;
  const dayOfWeek = Number(task?.automation_day_of_week ?? 1);
  return `Semanal (${WEEKDAYS_PT[dayOfWeek] || "Seg"}) as ${hh}:${mm}`;
}

function formatNextWindow(task: any, now: Date) {
  if (!task?.automation_enabled) return "Desativado";
  const local = getLocalNow(now);
  const frequency = String(task?.automation_frequency || "weekly");
  const dayOfWeek = Number(task?.automation_day_of_week ?? 1);
  const hour = Number(task?.automation_hour ?? 8);
  const minute = Number(task?.automation_minute ?? 0);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  if (frequency === "daily") {
    const passedToday = local.hour > hour || (local.hour === hour && local.minute >= minute);
    return passedToday ? `Amanha as ${hh}:${mm}` : `Hoje as ${hh}:${mm}`;
  }

  let diff = dayOfWeek - local.weekday;
  if (diff < 0) diff += 7;
  const passedToday = diff === 0 && (local.hour > hour || (local.hour === hour && local.minute >= minute));
  if (passedToday) diff = 7;

  if (diff === 0) return `Hoje (${WEEKDAYS_PT[dayOfWeek]}) as ${hh}:${mm}`;
  if (diff === 1) return `Amanha (${WEEKDAYS_PT[dayOfWeek]}) as ${hh}:${mm}`;
  return `Em ${diff} dias (${WEEKDAYS_PT[dayOfWeek]}) as ${hh}:${mm}`;
}

function resolveTaskStatus(task: any, now: Date): TaskStatus {
  if (!task?.automation_enabled) return "disabled";
  if (!task?.automation_last_dispatched_at) return "never_ran";

  const last = new Date(task.automation_last_dispatched_at);
  const diffMs = Math.max(0, now.getTime() - last.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);
  const frequency = String(task?.automation_frequency || "weekly");
  const thresholdHours = frequency === "daily" ? 36 : 8 * 24;
  return diffHours > thresholdHours ? "overdue" : "ok";
}

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("dashboards")
      .select("id, name, status, automation_enabled, automation_frequency, automation_day_of_week, automation_hour, automation_minute, automation_period_days, automation_report_mode, automation_last_dispatched_at, clients(name)")
      .order("name", { ascending: true });

    if (error) throw error;

    const now = new Date();
    const tasks = (data || []).map((task: any) => {
      const status = resolveTaskStatus(task, now);
      return {
        dashboardId: task.id,
        dashboardName: task.name,
        clientName: task.clients?.name || "Sem cliente",
        dashboardStatus: task.status || "unknown",
        automationEnabled: Boolean(task.automation_enabled),
        schedule: formatScheduleLabel(task),
        nextWindow: formatNextWindow(task, now),
        reportMode: String(task.automation_report_mode || "both"),
        periodDays: Number(task.automation_period_days || 7),
        lastDispatchedAt: task.automation_last_dispatched_at || null,
        lastDispatchedAtLabel: formatLocalDateTime(task.automation_last_dispatched_at),
        status,
      };
    });

    const summary = {
      total: tasks.length,
      enabled: tasks.filter((t) => t.automationEnabled).length,
      disabled: tasks.filter((t) => !t.automationEnabled).length,
      overdue: tasks.filter((t) => t.status === "overdue").length,
      neverRan: tasks.filter((t) => t.status === "never_ran").length,
      ok: tasks.filter((t) => t.status === "ok").length,
    };

    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      generatedAtLabel: now.toLocaleString("pt-BR", { timeZone: TZ }),
      timezone: TZ,
      summary,
      tasks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao carregar monitoramento de agendamentos." },
      { status: 500 }
    );
  }
}

