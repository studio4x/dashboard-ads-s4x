import { NextResponse } from "next/server";
import { FinancialAlertService } from "@/services/financial-alert-service";

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

  try {
    const summary = await FinancialAlertService.runAlerts();
    return NextResponse.json({ message: "Avaliação de alertas financeiros finalizada.", summary });
  } catch (error) {
    console.error("[FINANCIAL_ALERT_CRON_FATAL]", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Erro interno durante a avaliação de alertas financeiros." }, { status: 500 });
  }
}
