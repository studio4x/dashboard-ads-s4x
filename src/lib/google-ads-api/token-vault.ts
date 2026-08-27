import { createAdminClient } from "@/lib/supabase/server";

export async function storeGoogleAdsRefreshToken(connectionId: string, refreshToken: string) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "store_google_ads_refresh_token" });
  const { data, error } = await supabase.rpc("google_ads_vault_store_refresh_token", {
    p_connection_id: connectionId,
    p_refresh_token: refreshToken,
  });
  if (error) throw error;
  return String(data || "");
}

export async function readGoogleAdsRefreshToken(connectionId: string) {
  const supabase = await createAdminClient({ actor: "system", action: "read_google_ads_refresh_token" });
  const { data, error } = await supabase.rpc("google_ads_vault_read_refresh_token", {
    p_connection_id: connectionId,
  });
  if (error) throw error;
  const token = String(data || "").trim();
  if (!token) throw new Error("Refresh token Google Ads não encontrado ou revogado.");
  return token;
}

export async function deleteGoogleAdsRefreshToken(connectionId: string) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "delete_google_ads_refresh_token" });
  const { error } = await supabase.rpc("google_ads_vault_delete_refresh_token", {
    p_connection_id: connectionId,
  });
  if (error) throw error;
}
