import { NextResponse } from "next/server";

export function apiErrorResponse(error: unknown, fallbackMessage = "Erro interno do servidor.") {
  const err = error as any;
  if (process.env.NODE_ENV !== "production") {
    console.error("[API_ERROR]", err);
  } else {
    console.error("[API_ERROR]", {
      message: String(err?.message || fallbackMessage),
      name: err?.name || null,
    });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function parseJsonObject(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: "JSON inválido." }, { status: 400 }) };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false as const, response: NextResponse.json({ error: "Payload inválido." }, { status: 400 }) };
  }

  return { ok: true as const, body: body as Record<string, unknown> };
}

export function requireString(body: Record<string, unknown>, key: string, options?: { min?: number; max?: number }) {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (options?.min && trimmed.length < options.min) return null;
  if (options?.max && trimmed.length > options.max) return null;
  return trimmed;
}
