import { createAdminClient } from "@/lib/supabase/server";
import type { GoogleAdsSettings } from "@/types/google-ads-api";

const DEFAULT_SETTINGS: GoogleAdsSettings = {
  id: "default",
  client_id: null,
  api_version: "v25",
  default_history_days: 90,
  default_lookback_days: 28,
  default_sync_interval: "daily",
};

export async function getGoogleAdsSettings(): Promise<GoogleAdsSettings> {
  const supabase = await createAdminClient({ actor: "system", action: "read_google_ads_settings" });
  const { data, error } = await supabase
    .from("google_ads_settings")
    .select("id,client_id,api_version,default_history_days,default_lookback_days,default_sync_interval")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data || {}) } as GoogleAdsSettings;
}

export function resolveGoogleAdsClientId(settings: GoogleAdsSettings) {
  return String(settings.client_id || process.env.GOOGLE_ADS_CLIENT_ID || "").trim();
}

export function resolveGoogleAdsApiVersion(settings: GoogleAdsSettings) {
  const version = String(settings.api_version || process.env.GOOGLE_ADS_API_VERSION || "v25").trim();
  if (!/^v\d+$/.test(version)) throw new Error("Versão da Google Ads API inválida.");
  return version;
}

export function requireGoogleAdsClientSecret() {
  const value = String(process.env.GOOGLE_ADS_CLIENT_SECRET || "").trim();
  if (!value) throw new Error("GOOGLE_ADS_CLIENT_SECRET não configurado na Vercel.");
  return value;
}

export function requireGoogleAdsDeveloperToken() {
  const value = String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim();
  if (!value) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN não configurado na Vercel.");
  return value;
}

export function getGoogleAdsRedirectUri(origin?: string) {
  const configuredSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  const baseUrl = configuredSiteUrl || String(origin || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_SITE_URL não configurada.");
  return `${baseUrl}/api/admin/google-ads/oauth/callback`;
}
