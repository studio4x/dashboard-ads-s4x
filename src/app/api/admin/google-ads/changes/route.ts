import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsMutationService } from "@/services/google-ads-mutation-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const sourceId = String(request.nextUrl.searchParams.get("sourceId") || "").trim();
  if (!sourceId) return NextResponse.json({ error: "sourceId é obrigatório." }, { status: 400 });
  try {
    const items = await GoogleAdsMutationService.history(sourceId);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao listar alterações Google Ads:", error);
    return NextResponse.json({ error: "Não foi possível carregar o histórico de alterações." }, { status: 500 });
  }
}
