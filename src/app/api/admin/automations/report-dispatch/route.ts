import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardService } from "@/services/dashboard-service";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";

type DispatchBody = {
  dashboardId?: string;
  from?: string;
  to?: string;
  channels?: string[];
  recipients?: {
    emails?: string[];
    phones?: string[];
  };
  shareLinkId?: string;
  dryRun?: boolean;
};

const WEBHOOK_ENV_KEY = "N8N_REPORT_DISPATCH_WEBHOOK_URL";

function isPlaceholderWebhook(value: string) {
  return (
    !value ||
    value.includes("SEU_N8N_WEBHOOK_URL_AQUI") ||
    value === "https://SEU_N8N_WEBHOOK_URL_AQUI"
  );
}

function isValidWebhookUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "url inválida";
  }
}

function isTestWebhookUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/webhook-test/");
  } catch {
    return false;
  }
}

function getErrorDetails(error: unknown) {
  const err = error as any;
  return {
    message: String(err?.message || "Erro de rede"),
    name: err?.name || null,
    cause: err?.cause
      ? {
          code: err.cause?.code || null,
          message: err.cause?.message || String(err.cause),
          name: err.cause?.name || null,
        }
      : null,
  };
}

async function getWebhookUrlFromVercelEnv() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) return null;

  try {
    const response = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env?decrypt=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const json = await response.json();
    const envs = Array.isArray(json?.envs) ? json.envs : [];
    const hit = envs.find((item: any) => item?.key === WEBHOOK_ENV_KEY);
    const value = String(hit?.value || "").trim();
    return value || null;
  } catch {
    return null;
  }
}

async function resolveWebhookUrl() {
  const fromVercel = String((await getWebhookUrlFromVercelEnv()) || "").trim();
  if (!isPlaceholderWebhook(fromVercel) && isValidWebhookUrl(fromVercel)) {
    return { url: fromVercel, source: "vercel_api" as const };
  }

  const fromRuntime = String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || "").trim();
  if (!isPlaceholderWebhook(fromRuntime) && isValidWebhookUrl(fromRuntime)) {
    return { url: fromRuntime, source: "runtime_env" as const };
  }

  return { url: "", source: "none" as const };
}

function getSummaryMetrics(data: any) {
  const current = data?.summary?.current || data?.summary || {};

  return {
    investimento: Number(current.total_spend || current.cost || 0),
    impressoes: Number(current.total_impressions || current.impressions || 0),
    alcance: Number(current.total_reach || current.reach || 0),
    cliques: Number(current.total_clicks || current.clicks || 0),
    ctr: Number(current.ctr || 0),
    cpc: Number(current.cpc || current.avgCpc || 0),
    conversoes: Number(current.total_conversions || current.conversions || 0),
    cpa: Number(current.cpa || 0),
    engajamentos: Number(current.postEngagement || current.total_engagement || 0),
    atualizadoEm: data?.lastUpdated || null,
  };
}

async function getShareUrl(dashboardId: string, origin: string, shareLinkId?: string) {
  const supabase = await createAdminClient();

  let query = supabase
    .from("dashboard_share_links")
    .select("id, status, expires_at, created_at")
    .eq("dashboard_id", dashboardId)
    .eq("status", "active");

  if (shareLinkId) {
    query = query.eq("id", shareLinkId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1);
  if (error || !data || data.length === 0) {
    return null;
  }

  const link = data[0];
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null;
  }

  return `${origin}/share/${link.id}`;
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = (await request.json()) as DispatchBody;
    const dashboardId = String(body.dashboardId || "").trim();

    if (!dashboardId) {
      return NextResponse.json({ success: false, error: "dashboardId é obrigatório." }, { status: 400 });
    }

    const dashboard = await DashboardService.getDashboardById(dashboardId, { bypassRls: true });
    if (!dashboard) {
      return NextResponse.json({ success: false, error: "Dashboard não encontrado." }, { status: 404 });
    }

    const data = await getDashboardData(dashboardId, {
      from: body.from || undefined,
      to: body.to || undefined,
      bypassRls: true,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Sem snapshot disponível para esse dashboard." },
        { status: 404 }
      );
    }

    const origin = new URL(request.url).origin;
    const shareUrl = await getShareUrl(dashboardId, origin, body.shareLinkId);

    const payload = {
      event: "dashboard_report_dispatch",
      dispatchedAt: new Date().toISOString(),
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        templateId: dashboard.dashboard_type,
        clientId: dashboard.client_id,
        clientName: dashboard.clients?.name || null,
      },
      period: {
        from: body.from || null,
        to: body.to || null,
      },
      channels: body.channels || ["email", "whatsapp"],
      recipients: body.recipients || {},
      share: {
        url: shareUrl,
      },
      report: {
        summary: getSummaryMetrics(data),
        insights: Array.isArray(data.insights) ? data.insights.slice(0, 8) : [],
      },
      pdf: {
        mode: "client_side_export",
        available: false,
        note: "Nesta fase, o PDF é gerado no frontend. Recomenda-se envio de análise + link compartilhado via n8n.",
      },
    };

    if (body.dryRun) {
      return NextResponse.json({ success: true, dryRun: true, payload });
    }

    const resolvedWebhook = await resolveWebhookUrl();
    const webhookUrl = resolvedWebhook.url;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "N8N_REPORT_DISPATCH_WEBHOOK_URL não configurado. Defina a variável de ambiente para habilitar o disparo.",
          diagnostic: {
            resolutionSource: resolvedWebhook.source,
            runtimeValueConfigured: !isPlaceholderWebhook(String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || "").trim()),
          },
          payloadPreview: payload,
        },
        { status: 400 }
      );
    }
    if (isTestWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook de teste detectado (/webhook-test). Para disparo real use a URL de produção do n8n (/webhook/...).",
          webhookUrl: maskUrl(webhookUrl),
          resolutionSource: resolvedWebhook.source,
        },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-S4X-Event": "dashboard_report_dispatch",
      "X-S4X-Dashboard-Id": dashboardId,
    };

    const webhookToken = process.env.N8N_REPORT_DISPATCH_WEBHOOK_TOKEN;
    if (webhookToken) {
      headers.Authorization = `Bearer ${webhookToken}`;
    }

    const webhookSecret = process.env.N8N_REPORT_DISPATCH_WEBHOOK_SECRET;
    const payloadJson = JSON.stringify(payload);
    if (webhookSecret) {
      const signature = crypto.createHmac("sha256", webhookSecret).update(payloadJson).digest("hex");
      headers["X-S4X-Signature"] = signature;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: payloadJson,
        signal: controller.signal,
      });
    } catch (networkError) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha de rede ao enviar para o webhook n8n.",
          webhookUrl: maskUrl(webhookUrl),
          resolutionSource: resolvedWebhook.source,
          details: getErrorDetails(networkError),
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const raw = await webhookResponse.text();
    let parsed: unknown = raw;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // ignora parse e mantém texto cru
    }

    if (!webhookResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao enviar evento para o n8n.",
          statusCode: webhookResponse.status,
          n8nResponse: parsed,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Disparo enviado ao n8n com sucesso.",
      webhookUrl: maskUrl(webhookUrl),
      resolutionSource: resolvedWebhook.source,
      n8nResponse: parsed,
      dispatchedAt: payload.dispatchedAt,
      dashboardId,
      shareUrl,
    });
  } catch (error: any) {
    console.error("Report Dispatch Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro interno no disparo de automação." },
      { status: 500 }
    );
  }
}
