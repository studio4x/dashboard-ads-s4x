import type { GoogleAdsPlatformOperation, GoogleAdsRiskLevel } from "@/types/google-ads-mutations.ts";

export function googleAdsRiskForOperation(operation: GoogleAdsPlatformOperation, target: Record<string, unknown> = {}): GoogleAdsRiskLevel {
  if (operation === "batch_google_ads_changes") {
    const items = Array.isArray(target.items) ? target.items : [];
    const risks = items.map((item) => { const value = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {}; const itemOperation = String(value.operationType || ""); const itemTarget = value.target && typeof value.target === "object" && !Array.isArray(value.target) ? value.target as Record<string, unknown> : {}; return googleAdsRiskForOperation(itemOperation as GoogleAdsPlatformOperation, itemTarget); });
    return risks.includes("critical") || risks.includes("high") ? "high" : risks.includes("medium") ? "medium" : "low";
  }
  if (operation === "set_conversion_action_primary" || operation === "set_conversion_action_include_in_conversions" || operation.endsWith("conversion_goal_biddable")) return "critical";
  if (operation === "set_campaign_bidding_strategy" || operation === "set_target_cpa" || operation === "set_target_roas") return "high";
  if (operation === "edit_responsive_search_ad" || operation === "create_responsive_search_ad" || operation === "apply_google_recommendation") return "high";
  if (operation === "add_ad_group_keyword") return String(target.matchType).toUpperCase() === "BROAD" ? "high" : String(target.matchType).toUpperCase() === "PHRASE" ? "medium" : "low";
  if (operation === "set_keyword_cpc") return Math.abs(Number(target.changePercent || 0)) > 20 ? "high" : "medium";
  if (operation === "remove_ad_schedule" || operation === "remove_campaign_location") return "high";
  if (operation === "add_ad_schedule" || operation === "edit_ad_schedule" || operation === "add_campaign_location") return "medium";
  if (operation === "create_campaign_asset" || operation === "link_campaign_asset" || operation === "unlink_campaign_asset") return "medium";
  if (operation === "dismiss_google_recommendation") return "medium";
  if (operation === "set_campaign_budget") return "medium";
  return "medium";
}

export function googleAdsRiskLabel(risk: GoogleAdsRiskLevel) {
  return { low: "Baixo risco", medium: "Risco moderado", high: "Alto risco", critical: "Risco crítico" }[risk];
}

export function requiresStrongGoogleAdsConfirmation(risk: GoogleAdsRiskLevel) {
  return risk === "high" || risk === "critical";
}

export function googleAdsWritesEnabled() {
  return process.env.GOOGLE_ADS_WRITES_ENABLED === "true";
}

export function googleAdsHighRiskWritesEnabled() {
  return process.env.GOOGLE_ADS_HIGH_RISK_WRITES_ENABLED === "true";
}
