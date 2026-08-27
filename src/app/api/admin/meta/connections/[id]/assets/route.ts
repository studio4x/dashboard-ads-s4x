import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { getMetaMarketingSettings, requireMetaAppSecret, resolveMetaApiVersion } from "@/lib/meta-marketing/settings";
import { readMetaAccessToken } from "@/lib/meta-marketing/token-vault";
import { discoverMetaAssets, MetaGraphClient } from "@/lib/meta-marketing/graph-client";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const { id } = await context.params;
    const supabase = await createAdminClient({ actor: "api_admin", action: "discover_meta_assets" });
    const { data: connection, error } = await supabase.from("meta_business_connections").select("id,status").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!connection || connection.status !== "active") return NextResponse.json({ error: "Conexão Meta inativa." }, { status: 409 });
    const settings = await getMetaMarketingSettings();
    const token = await readMetaAccessToken(id);
    const client = new MetaGraphClient(token, resolveMetaApiVersion(settings), requireMetaAppSecret());
    const assets = await discoverMetaAssets(client);
    await supabase.from("meta_business_connections").update({ last_validated_at: new Date().toISOString(), last_error: null }).eq("id", id);
    return NextResponse.json(assets);
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível consultar os negócios e contas de anúncios da Meta.");
  }
}
