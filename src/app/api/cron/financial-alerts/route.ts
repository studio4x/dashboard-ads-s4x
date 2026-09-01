import { NextResponse } from "next/server";
import { EnhancedFinancialAlertService } from "@/services/enhanced-financial-alert-service";
import { FinancialAlertAuditService } from "@/services/financial-alert-audit-service";
import { AdminNotificationService } from "@/services/admin-notification-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const missing = [
    !String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_URL || "").trim() && "N8N_FINANCIAL_ALERT_WEBHOOK_URL",
    !String(process.env.N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN || "").trim() && "N8N_FINANCIAL_ALERT_WEBHOOK_TOKEN",
  ].filter(Boolean);

  try {
    const recipients = await AdminNotificationService.getSettings();
    if (!recipients.emails.length) missing.push("e-mails administrativos");
    if (!recipients.phones.length) missing.push("WhatsApps administrativos");
    if (!recipients.fromEmail) missing.push("e-mail remetente administrativo");
  } catch {
    missing.push("configuração de destinatários administrativos");
  }

  if (missing.length > 0) {
    console.error("[FINANCIAL_ALERT_CONFIG_MISSING]", { missing });
    const configError = new Error(`Configuração de alerta financeiro incompleta: ${missing.join(", ")}`);
    try {
      await FinancialAlertAuditService.recordFatalRun({ startedAt, finishedAt: new Date().toISOString(), error: configError });
    } catch (auditError) {
      console.error("[FINANCIAL_ALERT_CONFIG_AUDIT_ERROR]", { message: auditError instanceof Error ? auditError.message : "unknown" });
    }
    return NextResponse.json({ error: "Configuração de alerta financeiro incompleta.", missing }, { status: 503 });
  }

  try {
    const summary = await EnhancedFinancialAlertService.runAlerts();
    const finishedAt = new Date().toISOString();
    let audit: { runId?: string; checks?: number; warning?: string } = {};

    try {
      audit = await FinancialAlertAuditService.recordRun({ startedAt, finishedAt, summary });
    } catch (auditError) {
      const warning = auditError instanceof Error ? auditError.message : "Falha ao gravar auditoria.";
      audit = { warning };
      console.error("[FINANCIAL_ALERT_AUDIT_ERROR]", { message: warning });
    }

    return NextResponse.json({ message: "Avaliação de alertas financeiros finalizada.", summary, audit });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    console.error("[FINANCIAL_ALERT_CRON_FATAL]", { message: error instanceof Error ? error.message : "unknown" });
    try {
      await FinancialAlertAuditService.recordFatalRun({ startedAt, finishedAt, error });
    } catch (auditError) {
      console.error("[FINANCIAL_ALERT_FATAL_AUDIT_ERROR]", { message: auditError instanceof Error ? auditError.message : "unknown" });
    }
    return NextResponse.json({ error: "Erro interno durante a avaliação de alertas financeiros." }, { status: 500 });
  }
}
