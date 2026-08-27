import { createAdminClient } from "@/lib/supabase/server";

export async function storeMetaAccessToken(connectionId: string, accessToken: string) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "store_meta_oauth_token" });
  const { data, error } = await supabase.rpc("meta_vault_store_token", {
    p_connection_id: connectionId,
    p_access_token: accessToken,
  });
  if (error) throw error;
  return String(data || "");
}

export async function readMetaAccessToken(connectionId: string) {
  const supabase = await createAdminClient({ actor: "system", action: "read_meta_oauth_token" });
  const { data, error } = await supabase.rpc("meta_vault_read_token", {
    p_connection_id: connectionId,
  });
  if (error) throw error;
  const token = String(data || "").trim();
  if (!token) throw new Error("Token Meta não encontrado ou revogado.");
  return token;
}

export async function deleteMetaAccessToken(connectionId: string) {
  const supabase = await createAdminClient({ actor: "api_admin", action: "delete_meta_oauth_token" });
  const { error } = await supabase.rpc("meta_vault_delete_token", {
    p_connection_id: connectionId,
  });
  if (error) throw error;
}
