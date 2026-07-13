import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export const dynamic = "force-dynamic";

const TARGETS = ["production", "preview", "development"];
const ENV_KEYS = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
} as const;

type ProviderKey = keyof typeof ENV_KEYS;

function isPlaceholderCredential(value: string) {
  if (!value) return true;
  const normalized = value.trim().toUpperCase();
  return (
    normalized.includes("SEU_") ||
    normalized.includes("PLACEHOLDER") ||
    normalized.includes("TOKEN_AQUI") ||
    normalized.includes("CHAVE_AQUI") ||
    normalized.includes("API_KEY_AQUI")
  );
}

function maskSecret(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

async function getVercelEnvVars() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) {
    return {
      ok: false,
      error: "Credenciais da Vercel ausentes no servidor (VERCEL_PROJECT_ID / VERCEL_TOKEN).",
    } as const;
  }

  const response = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env?decrypt=true`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

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
      openai: String(map.get(ENV_KEYS.openai) || "").trim(),
      gemini: String(map.get(ENV_KEYS.gemini) || "").trim(),
    },
  } as const;
}

async function upsertVercelEnvVars(values: Partial<Record<ProviderKey, string>>) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) {
    return {
      ok: false,
      error: "Credenciais da Vercel ausentes no servidor (VERCEL_PROJECT_ID / VERCEL_TOKEN).",
    } as const;
  }

  const payload = Object.entries(values)
    .filter(([, value]) => typeof value === "string" && String(value).trim())
    .map(([provider, value]) => ({
      key: ENV_KEYS[provider as ProviderKey],
      value: String(value).trim(),
      type: "encrypted",
      target: TARGETS,
      comment: `Credencial de IA ${provider} - Dashboard Ads S4X`,
    }));

  if (payload.length === 0) {
    return { ok: false, error: "Informe ao menos uma credencial para salvar." } as const;
  }

  const response = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?upsert=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let result: any = null;
  try {
    result = await response.json();
  } catch {
    // sem corpo JSON
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        result?.error?.message ||
        result?.message ||
        `Falha ao atualizar variável na Vercel (HTTP ${response.status}).`,
    } as const;
  }

  return { ok: true } as const;
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const fromVercelApi = await getVercelEnvVars();
    const openaiValue =
      fromVercelApi.ok && fromVercelApi.envs.openai
        ? fromVercelApi.envs.openai
        : String(process.env.OPENAI_API_KEY || "").trim();
    const geminiValue =
      fromVercelApi.ok && fromVercelApi.envs.gemini
        ? fromVercelApi.envs.gemini
        : String(process.env.GEMINI_API_KEY || "").trim();

    const openaiConfigured = openaiValue.length > 0 && !isPlaceholderCredential(openaiValue);
    const geminiConfigured = geminiValue.length > 0 && !isPlaceholderCredential(geminiValue);

    return NextResponse.json({
      success: true,
      source: fromVercelApi.ok ? "vercel_api" : "runtime_env",
      targetScopes: TARGETS,
      providers: {
        openai: {
          configured: openaiConfigured,
          maskedValue: openaiConfigured ? maskSecret(openaiValue) : "",
        },
        gemini: {
          configured: geminiConfigured,
          maskedValue: geminiConfigured ? maskSecret(geminiValue) : "",
        },
      },
      note:
        "As credenciais são armazenadas como variáveis de ambiente criptografadas na Vercel. Após alterar, a leitura pode refletir imediatamente pela API administrativa.",
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro ao obter credenciais de IA.");
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:settings:ai-credentials", limit: 15, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsedBody = await parseJsonObject(request);
    if (!parsedBody.ok) return parsedBody.response;

    const openAiApiKey = requireString(parsedBody.body, "openAiApiKey", { min: 8 }) || "";
    const geminiApiKey = requireString(parsedBody.body, "geminiApiKey", { min: 8 }) || "";

    if (!openAiApiKey && !geminiApiKey) {
      return NextResponse.json({ success: false, error: "Informe ao menos uma credencial para salvar." }, { status: 400 });
    }

    const values: Partial<Record<ProviderKey, string>> = {};
    if (openAiApiKey) values.openai = openAiApiKey;
    if (geminiApiKey) values.gemini = geminiApiKey;

    const update = await upsertVercelEnvVars(values);
    if (!update.ok) {
      return NextResponse.json({ success: false, error: update.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "Credenciais de IA salvas com sucesso na Vercel.",
      source: "vercel_api",
      targetScopes: TARGETS,
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro ao salvar credenciais de IA.");
  }
}
