import { google } from "googleapis";
import type { GoogleAdsSettings } from "@/types/google-ads-api";
import {
  getGoogleAdsRedirectUri,
  requireGoogleAdsClientSecret,
  resolveGoogleAdsClientId,
} from "./settings";

export const GOOGLE_ADS_OAUTH_STATE_COOKIE = "google_ads_oauth_state";
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const IDENTITY_SCOPES = ["openid", "email"];

function createOAuthClient(settings: GoogleAdsSettings, origin?: string) {
  const clientId = resolveGoogleAdsClientId(settings);
  if (!clientId) throw new Error("Informe o OAuth Client ID no painel ou em GOOGLE_ADS_CLIENT_ID.");
  return new google.auth.OAuth2(clientId, requireGoogleAdsClientSecret(), getGoogleAdsRedirectUri(origin));
}

export function buildGoogleAdsAuthorizationUrl(settings: GoogleAdsSettings, state: string, origin?: string) {
  return createOAuthClient(settings, origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: true,
    scope: [GOOGLE_ADS_SCOPE, ...IDENTITY_SCOPES],
    state,
  });
}

export async function exchangeGoogleAdsAuthorizationCode(settings: GoogleAdsSettings, code: string, origin?: string) {
  const client = createOAuthClient(settings, origin);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("O Google não retornou refresh token. Revogue o acesso anterior e conecte novamente.");
  }
  client.setCredentials(tokens);
  const ticket = tokens.id_token
    ? await client.verifyIdToken({ idToken: tokens.id_token, audience: resolveGoogleAdsClientId(settings) })
    : null;
  const payload = ticket?.getPayload();
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token || null,
    scope: String(tokens.scope || GOOGLE_ADS_SCOPE).split(/\s+/).filter(Boolean),
    googleUserId: String(payload?.sub || "").trim(),
    email: payload?.email || null,
  };
}
