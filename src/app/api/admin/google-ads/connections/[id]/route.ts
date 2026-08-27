import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";
import { deleteGoogleAdsRefreshToken } from "@/lib/google-ads-api/token-vault";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:google-ads:disconnect", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const { id } = await context.params;
    const supabase = await createAdminClient({ actor: "api_admin", action: "revoke_google_ads_connection" });
    const { count, error } = await supabase.from("google_ads_sources").select("data_source_id", { count: "exact", head: true }).eq("connection_id", id);
    if (error) throw error;
    if ((count || 0) > 0) return NextResponse.json({ error: "Remova primeiro as fontes vinculadas a esta conexão." }, { status: 409 });
    await deleteGoogleAdsRefreshToken(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível revogar a conexão Google Ads.");
  }
}
