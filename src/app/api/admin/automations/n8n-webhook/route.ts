import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";

export const dynamic = "force-dynamic";

const TARGETS = ["production", "preview", "development"];
const ENV_KEY = "N8N_REPORT_DISPATCH_WEBHOOK_URL";

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const path = parsed.pathname.length > 18
      ? `${parsed.pathname.slice(0, 10)}...${parsed.pathname.slice(-8)}`
      : parsed.pathname;
    return `${parsed.protocol}//${host}${path}`;
  } catch {
    return "valor configurado";
  }
}

async function upsertVercelEnvVar(value: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  if (!projectId || !token) {
    return {
      ok: false,
      error:
        "Credenciais da Vercel ausentes no servidor (VERCEL_PROJECT_ID / VERCEL_TOKEN).",
    };
  }

  const payload = [
    {
      key: ENV_KEY,
      value,
      type: "encrypted",
      target: TARGETS,
      comment: "Configuração do webhook n8n (Dashboard Ads S4X)",
    },
  ];

  const response = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  let result: any = null;
  try {
    result = await response.json();
  } catch {
    // mantém null
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        result?.error?.message ||
        result?.message ||
        `Falha ao atualizar variável na Vercel (HTTP ${response.status}).`,
    };
  }

  return { ok: true };
}

async function getWebhookFromVercel() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) return null;

  try {
    const response = await fetch(
      `https://api.vercel.com/v8/projects/${projectId}/env?decrypt=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    const json = await response.json();
    const envs = Array.isArray(json?.envs) ? json.envs : [];
    const hit = envs.find((item: any) => item?.key === ENV_KEY);
    const value = String(hit?.value || "").trim();
    return value || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const fromVercelApi = await getWebhookFromVercel();
    const currentValue = (fromVercelApi || process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || "").trim();
    const configured =
      currentValue.length > 0 &&
      !currentValue.includes("SEU_N8N_WEBHOOK_URL_AQUI") &&
      currentValue !== "https://SEU_N8N_WEBHOOK_URL_AQUI";

    return NextResponse.json({
      success: true,
      configured,
      webhookUrl: configured ? currentValue : "",
      webhookUrlMasked: configured ? maskUrl(currentValue) : "",
      source: fromVercelApi ? "vercel_api" : "runtime_env",
      targetScopes: TARGETS,
      note:
        "A leitura reflete o ambiente em runtime. Após atualizar variável na Vercel, pode ser necessário novo deploy para refletir imediatamente em todas as instâncias.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao obter configuração do webhook." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:automations:webhook", limit: 15, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const webhookUrl = String(body?.webhookUrl || "").trim();

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: "Informe a URL do webhook do n8n." },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: "URL inválida. Verifique o webhook do n8n." },
        { status: 400 }
      );
    }

    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      return NextResponse.json(
        { success: false, error: "Use URL HTTPS (ou localhost para testes locais)." },
        { status: 400 }
      );
    }

    const update = await upsertVercelEnvVar(webhookUrl);
    if (!update.ok) {
      return NextResponse.json(
        { success: false, error: update.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook salvo na Vercel com sucesso.",
      webhookUrlMasked: maskUrl(webhookUrl),
      targetScopes: TARGETS,
      note:
        "Variável atualizada na Vercel. Em alguns casos, o novo valor só passa a valer após novo deploy.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao salvar webhook do n8n." },
      { status: 500 }
    );
  }
}
