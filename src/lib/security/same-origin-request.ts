import { NextRequest, NextResponse } from "next/server";

/**
 * Camada adicional contra chamadas cross-site em endpoints administrativos que
 * alteram estado. A autenticação continua obrigatória; este helper apenas
 * garante que a chamada veio do mesmo host da aplicação quando o navegador
 * fornece Origin/Sec-Fetch-Site.
 */
export function requireSameOrigin(request: NextRequest) {
  const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== request.nextUrl.host || originUrl.protocol !== request.nextUrl.protocol) {
        return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Origem da solicitação inválida." }, { status: 403 });
    }
  }

  return null;
}
