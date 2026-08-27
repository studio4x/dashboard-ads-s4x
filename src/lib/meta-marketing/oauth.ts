import type { MetaMarketingSettings } from "@/types/meta-marketing";
import {
  getMetaRedirectUri,
  requireMetaAppSecret,
  resolveMetaApiVersion,
  resolveMetaAppId,
} from "./settings";

type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

export const META_OAUTH_STATE_COOKIE = "meta_oauth_state";

export function buildMetaAuthorizationUrl(settings: MetaMarketingSettings, state: string, origin?: string) {
  const appId = resolveMetaAppId(settings);
  if (!appId) throw new Error("Informe o Meta App ID no painel ou em META_APP_ID.");

  const version = resolveMetaApiVersion(settings);
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", getMetaRedirectUri(origin));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (settings.login_config_id) {
    url.searchParams.set("config_id", settings.login_config_id);
  } else {
    url.searchParams.set("scope", "ads_read,business_management");
  }
  return url;
}

async function requestToken(url: URL) {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as OAuthTokenResponse;
  if (!response.ok || !body.access_token) {
    throw new Error(body.error?.message || `Falha ao trocar autorização Meta (HTTP ${response.status}).`);
  }
  return body;
}

export async function exchangeMetaAuthorizationCode(settings: MetaMarketingSettings, code: string, origin?: string) {
  const appId = resolveMetaAppId(settings);
  const appSecret = requireMetaAppSecret();
  const version = resolveMetaApiVersion(settings);

  const exchangeUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  exchangeUrl.searchParams.set("client_id", appId);
  exchangeUrl.searchParams.set("client_secret", appSecret);
  exchangeUrl.searchParams.set("redirect_uri", getMetaRedirectUri(origin));
  exchangeUrl.searchParams.set("code", code);
  const shortLived = await requestToken(exchangeUrl);

  const longLivedUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token!);

  try {
    return await requestToken(longLivedUrl);
  } catch {
    return shortLived;
  }
}

export async function debugMetaAccessToken(settings: MetaMarketingSettings, accessToken: string) {
  const appId = resolveMetaAppId(settings);
  const appSecret = requireMetaAppSecret();
  const version = resolveMetaApiVersion(settings);
  const url = new URL(`https://graph.facebook.com/${version}/debug_token`);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set("access_token", `${appId}|${appSecret}`);
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.data?.is_valid) {
    throw new Error(body?.error?.message || "A Meta retornou um token inválido.");
  }
  return body.data as {
    app_id?: string;
    user_id?: string;
    scopes?: string[];
    granular_scopes?: Array<{ scope: string }>;
    expires_at?: number;
    data_access_expires_at?: number;
  };
}
