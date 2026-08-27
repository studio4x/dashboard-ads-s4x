import { createAdminClient } from "@/lib/supabase/server";
import type { MetaMarketingSettings } from "@/types/meta-marketing";

const DEFAULT_SETTINGS: MetaMarketingSettings = {
  id: "default",
  app_id: null,
  login_config_id: null,
  api_version: "v26.0",
  default_history_days: 90,
  default_lookback_days: 28,
  default_sync_interval: "daily",
};

export async function getMetaMarketingSettings(): Promise<MetaMarketingSettings> {
  const supabase = await createAdminClient({ actor: "system", action: "read_meta_marketing_settings" });
  const { data, error } = await supabase
    .from("meta_marketing_settings")
    .select("id, app_id, login_config_id, api_version, default_history_days, default_lookback_days, default_sync_interval")
    .eq("id", "default")
    .maybeSingle();

  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data || {}) } as MetaMarketingSettings;
}

export function resolveMetaAppId(settings: MetaMarketingSettings) {
  return String(settings.app_id || process.env.META_APP_ID || "").trim();
}

export function resolveMetaApiVersion(settings: MetaMarketingSettings) {
  const version = String(settings.api_version || process.env.META_GRAPH_API_VERSION || "v26.0").trim();
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error("Versão da Graph API inválida.");
  }
  return version;
}

export function requireMetaAppSecret() {
  const secret = String(process.env.META_APP_SECRET || "").trim();
  if (!secret) {
    throw new Error("META_APP_SECRET não configurado na Vercel.");
  }
  return secret;
}

export function getMetaRedirectUri(origin?: string) {
  const configuredSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  const baseUrl = configuredSiteUrl || String(origin || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_SITE_URL não configurada.");
  return `${baseUrl}/api/admin/meta/oauth/callback`;
}
