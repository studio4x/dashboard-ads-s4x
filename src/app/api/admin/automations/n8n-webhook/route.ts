import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export const dynamic = "force-dynamic";

const TARGETS = ["production", "preview", "development"];
const WEBHOOK_ENV_KEYS = {
  production: "N8N_REPORT_DISPATCH_WEBHOOK_URL",
  test: "N8N_REPORT_DISPATCH_WEBHOOK_TEST_URL",
} as const;

type WebhookEnvironment = keyof typeof WEBHOOK_ENV_KEYS;

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

async function getVercelEnvVars() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  if (!projectId || !token) {
    return {
      ok: false,
      error:
        "Credenciais da Vercel ausentes no servidor (VERCEL_PROJECT_ID / VERCEL_TOKEN).",
    } as const;
  }

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

  if (!response.ok) {
    return { ok: false, error: `Falha ao ler variáveis na Vercel (HTTP ${response.status}).` } as const;
  }

  const json = await response.json();
  const envs = Array.isArray(json?.envs) ? json.envs : [];
  const map = new Map<string, string>();
  for (const item of envs) {
    if (item?.key && typeof item.value === "string") {
      map.set(String(item.key), String(item.value));
    }
  }

  return {
    ok: true,
    envs: {
      production: String(map.get(WEBHOOK_ENV_KEYS.production) || "").trim(),
      test: String(map.get(WEBHOOK_ENV_KEYS.test) || "").trim(),
    },
  } as const;
}

async function upsertVercelEnvVar(environment: WebhookEnvironment, value: string) {
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
      key: WEBHOOK_ENV_KEYS[environment],
      value,
      type: "encrypted",
      target: TARGETS,
      comment: `Configuração do webhook n8n (${environment}) - Dashboard Ads S4X`,
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

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const fromVercelApi = await getVercelEnvVars();
    const productionValue =
      fromVercelApi.ok && fromVercelApi.envs.production
        ? fromVercelApi.envs.production
        : String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_URL || "").trim();
    const testValue =
      fromVercelApi.ok && fromVercelApi.envs.test
        ? fromVercelApi.envs.test
        : String(process.env.N8N_REPORT_DISPATCH_WEBHOOK_TEST_URL || "").trim();
    const productionConfigured =
      productionValue.length > 0 &&
      !productionValue.includes("SEU_N8N_WEBHOOK_URL_AQUI") &&
      productionValue !== "https://SEU_N8N_WEBHOOK_URL_AQUI";
    const testConfigured =
      testValue.length > 0 &&
      !testValue.includes("SEU_N8N_WEBHOOK_URL_AQUI") &&
      testValue !== "https://SEU_N8N_WEBHOOK_URL_AQUI";

    return NextResponse.json({
      success: true,
      configured: productionConfigured || testConfigured,
      webhookUrls: {
        production: productionConfigured ? productionValue : "",
        test: testConfigured ? testValue : "",
      },
      webhookUrlsMasked: {
        production: productionConfigured ? maskUrl(productionValue) : "",
        test: testConfigured ? maskUrl(testValue) : "",
      },
      source: fromVercelApi.ok ? "vercel_api" : "runtime_env",
      targetScopes: TARGETS,
      note:
        "A leitura reflete o ambiente em runtime. Após atualizar variável na Vercel, pode ser necessário novo deploy para refletir imediatamente em todas as instâncias.",
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro ao obter configuração do webhook.");
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

    const parsedBody = await parseJsonObject(request);
    if (!parsedBody.ok) return parsedBody.response;
    const webhookUrl = requireString(parsedBody.body, "webhookUrl") || "";
    const environment = String(parsedBody.body?.environment || "production").trim().toLowerCase() as WebhookEnvironment;
    const normalizedEnvironment: WebhookEnvironment = environment === "test" ? "test" : "production";

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

    const update = await upsertVercelEnvVar(normalizedEnvironment, webhookUrl);
    if (!update.ok) {
      return NextResponse.json(
        { success: false, error: update.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Webhook de ${normalizedEnvironment === "test" ? "teste" : "produção"} salvo na Vercel com sucesso.`,
      environment: normalizedEnvironment,
      webhookUrlMasked: maskUrl(webhookUrl),
      webhookUrlsMasked: {
        [normalizedEnvironment]: maskUrl(webhookUrl),
      },
      targetScopes: TARGETS,
      note:
        "Variável atualizada na Vercel. Em alguns casos, o novo valor só passa a valer após novo deploy.",
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro ao salvar webhook do n8n.");
  }
}
