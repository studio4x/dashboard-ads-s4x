import { createAdminClient } from "@/lib/supabase/server";

export type AdminNotificationRecipients = {
  emails: string[];
  phones: string[];
  fromEmail: string;
};

export type OperationalNotification = {
  eventType: "stale_data" | "performance_anomaly" | "test_notification";
  severity?: "info" | "warning" | "critical";
  title: string;
  message: string;
  client?: { id?: string; name?: string } | null;
  dashboard?: { id?: string; name?: string; url?: string } | null;
  provider?: string | null;
  account?: { id?: string; name?: string } | null;
  details?: Record<string, unknown>;
  detectedAt?: string;
};

function parseList(value: string | undefined) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,;\n|]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeList(values: unknown) {
  const list = Array.isArray(values) ? values : parseList(String(values || ""));
  return Array.from(new Set(list.map((item) => String(item || "").trim()).filter(Boolean)));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function providerLabel(provider?: string | null) {
  if (provider === "meta_ads") return "Meta Ads";
  if (provider === "google_ads") return "Google Ads";
  if (provider === "google_sheets") return "Google Sheets";
  return provider || "Dashboard ADS";
}

export const AdminNotificationService = {
  async getSettings(): Promise<AdminNotificationRecipients> {
    const supabase = await createAdminClient({
      actor: "system",
      action: "read_admin_notification_settings",
    });
    const { data, error } = await supabase
      .from("admin_notification_settings")
      .select("emails,phones,from_email")
      .eq("scope", "default")
      .maybeSingle();
    if (error) throw error;

    const dbEmails = normalizeList(data?.emails || []);
    const dbPhones = normalizeList(data?.phones || []);
    const envEmails = parseList(process.env.FINANCIAL_ALERT_ADMIN_EMAILS);
    const envPhones = parseList(process.env.FINANCIAL_ALERT_ADMIN_PHONES);
    const fromEmail = String(
      data?.from_email || process.env.FINANCIAL_ALERT_FROM_EMAIL || "",
    ).trim();

    return {
      emails: dbEmails.length ? dbEmails : envEmails,
      phones: dbPhones.length ? dbPhones : envPhones,
      fromEmail,
    };
  },

  async saveSettings(input: { emails: unknown; phones: unknown; fromEmail: unknown }) {
    const emails = normalizeList(input.emails);
    const phones = normalizeList(input.phones);
    const fromEmail = String(input.fromEmail || "").trim();

    if (emails.some((email) => !/^\S+@\S+\.\S+$/.test(email))) {
      throw new Error("Existe um e-mail administrativo inválido.");
    }
    if (phones.some((phone) => phone.replace(/\D/g, "").length < 10)) {
      throw new Error("Existe um WhatsApp administrativo inválido.");
    }
    if (fromEmail && !/^\S+@\S+\.\S+$/.test(fromEmail)) {
      throw new Error("O e-mail remetente é inválido.");
    }

    const supabase = await createAdminClient({
      actor: "api_admin",
      action: "save_admin_notification_settings",
    });
    const { data, error } = await supabase
      .from("admin_notification_settings")
      .upsert(
        { scope: "default", emails, phones, from_email: fromEmail || null },
        { onConflict: "scope" },
      )
      .select("emails,phones,from_email,updated_at")
      .single();
    if (error) throw error;
    return data;
  },

  async sendOperationalNotification(notification: OperationalNotification) {
    const webhookUrl = String(process.env.N8N_ADMIN_ALERT_WEBHOOK_URL || "").trim();
    const webhookToken = String(process.env.N8N_ADMIN_ALERT_WEBHOOK_TOKEN || "").trim();
    if (!webhookUrl || !webhookToken) {
      throw new Error(
        "Webhook operacional não configurado. Defina N8N_ADMIN_ALERT_WEBHOOK_URL e N8N_ADMIN_ALERT_WEBHOOK_TOKEN.",
      );
    }

    const recipients = await this.getSettings();
    if (!recipients.emails.length || !recipients.phones.length || !recipients.fromEmail) {
      throw new Error("Destinatários administrativos incompletos em Configurações > Notificações administrativas.");
    }

    const detectedAt = notification.detectedAt || new Date().toISOString();
    const dashboardUrl = notification.dashboard?.url || "";
    const clientName = notification.client?.name || "Plataforma";
    const provider = providerLabel(notification.provider);
    const subject = `${notification.severity === "critical" ? "🚨" : "⚠️"} ${notification.title} | ${clientName}`;
    const details = notification.details || {};
    const detailsLines = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `*${key}:* ${String(value)}`);

    const whatsappMessage = [
      notification.severity === "critical" ? "🚨 *ALERTA OPERACIONAL — DASHBOARD ADS S4X*" : "⚠️ *ALERTA OPERACIONAL — DASHBOARD ADS S4X*",
      "",
      `*${notification.title}*`,
      notification.client?.name ? `*Cliente:* ${notification.client.name}` : null,
      notification.provider ? `*Plataforma:* ${provider}` : null,
      notification.account?.name ? `*Conta/Fonte:* ${notification.account.name}` : null,
      "",
      notification.message,
      detailsLines.length ? "" : null,
      ...detailsLines,
      dashboardUrl ? "" : null,
      dashboardUrl ? `📊 *Dashboard:* ${dashboardUrl}` : null,
    ].filter(Boolean).join("\n");

    const detailRows = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">${escapeHtml(key)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(value)}</td></tr>`)
      .join("");

    const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><table width="100%" role="presentation" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center"><table width="100%" role="presentation" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><tr><td style="padding:20px 26px;background:${notification.severity === "critical" ? "#991b1b" : "#92400e"};color:#fff"><div style="font-size:12px;font-weight:700;letter-spacing:.08em">DASHBOARD ADS S4X</div><div style="font-size:22px;font-weight:700;margin-top:6px">${escapeHtml(notification.title)}</div></td></tr><tr><td style="padding:26px"><p style="font-size:15px;line-height:1.6;margin:0 0 18px">${escapeHtml(notification.message)}</p><table width="100%" role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px"><tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Cliente</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(notification.client?.name || "—")}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Plataforma</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(provider)}</td></tr>${detailRows}</table>${dashboardUrl ? `<div style="margin-top:22px;text-align:center"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:11px 18px;border-radius:7px;font-weight:700">Abrir dashboard</a></div>` : ""}</td></tr></table></td></tr></table></body></html>`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${webhookToken}`,
      },
      body: JSON.stringify({
        eventType: notification.eventType,
        detectedAt,
        severity: notification.severity || "warning",
        title: notification.title,
        message: notification.message,
        client: notification.client || null,
        dashboard: notification.dashboard || null,
        provider: notification.provider || null,
        account: notification.account || null,
        details,
        admin: {
          emails: recipients.emails,
          phones: recipients.phones,
          fromEmail: recipients.fromEmail,
        },
        subject,
        html,
        whatsappMessage,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`n8n operacional retornou HTTP ${response.status}`);
    }
    return { success: true };
  },
};
