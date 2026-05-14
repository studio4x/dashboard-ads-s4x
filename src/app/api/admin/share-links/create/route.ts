import { NextResponse } from "next/server";
import { ShareService } from "@/services/share-service";
import { requireAdmin } from "@/lib/auth/guards";

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { dashboardId, name, expiresAt } = body;

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId is required" }, { status: 400 });
    }

    const result = await ShareService.createShareLink(dashboardId, name, expiresAt);

    // Ocultar token_hash do retorno
    const { token_hash, ...safeLink } = result.link;

    // Retorna o link salvo (sem hash) e o rawToken
    return NextResponse.json({
      link: safeLink,
      rawToken: result.rawToken
    });
  } catch (error: any) {
    console.error("Error creating share link:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
