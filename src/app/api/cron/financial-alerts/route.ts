import { NextResponse } from "next/server";
import { FinancialAlertService } from "@/services/financial-alert-service";
import { FinancialAlertAuditService } from "@/services/financial-alert-audit-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function hasList(value: string | undefined) {
  return String(value || "").split(/[,;\n|]/g).some((item) => item.trim().length > 0);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const missing = [
    !String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_URL || "").trim() && "N8N_FINANCIAL_ALERT_WEBHOOK_URL",
    !String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN || "").trim() && "N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN",
    !hasList(process.env.FINANCIAL_ALERT_ADMIN_EMAILS) && "FINANCIAL_ALERT_ADMIN_EMAILS",
    !hasList(process.env.FINANCIAL_ALERT_ADMIN_PHONES) && "FINANCIAL_ALERT_ADMIN_PHONES",
    !String(process.env.FINANCIAL_ALERT_FROM_EMAIL || "").trim() && "FINANCIAL_ALERT_FROM_EMAIL",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error("[FINANCIAL_ALERT_CONFIG_MISSING]", { missing });
    return NextResponse.json({ error: "Configuração de alerta financeiro incompleta.", missing }, { status: 503 });
  }

  const startedAt = new Date().toISOString();

  try {
    const summary = await FinancialAlertService.runAlerts();
    const finishedAt = new Date().toISOString();
    let audit: { runId?: string; checks?: number; warning?: string } = {};

    try {
      audit = await FinancialAlertAuditService.recordRun({ startedAt, finishedAt, summary });
    } catch (auditError) {
      const warning = auditError instanceof Error ? auditError.message : "Falha ao gravar auditoria.";
      audit = { warning };
      console.error("[FINANCIAL_ALERT_AUDIT_ERROR]", { message: warning });
    }

    return NextResponse.json({
      message: "Avaliação de alertas financeiros finalizada.",
      summary,
      audit,
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    console.error("[FINANCIAL_ALERT_CRON_FATAL]", { message: error instanceof Error ? error.message : "unknown" });

    try {
      await FinancialAlertAuditService.recordFatalRun({ startedAt, finishedAt, error });
    } catch (auditError) {
      console.error("[FINANCIAL_ALERT_FATAL_AUDIT_ERROR]", {
        message: auditError instanceof Error ? auditError.message : "unknown",
      });
    }

    return NextResponse.json({ error: "Erro interno durante a avaliação de alertas financeiros." }, { status: 500 });
  }
}
