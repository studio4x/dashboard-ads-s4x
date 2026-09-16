export type DashboardPlatformLabel = "Google Ads" | "Meta Ads" | "Google + Meta Ads";

export function getDashboardPlatformLabel(
  platform?: unknown,
  templateId?: unknown,
): DashboardPlatformLabel | null {
  const normalizedPlatform = String(platform || "").trim().toLowerCase();
  const normalizedTemplateId = String(templateId || "").trim().toLowerCase();

  if (
    normalizedPlatform === "mixed" ||
    normalizedTemplateId === "google_meta_ads_s4x" ||
    normalizedTemplateId.includes("google_meta")
  ) {
    return "Google + Meta Ads";
  }

  if (
    normalizedPlatform === "meta_ads" ||
    normalizedTemplateId === "meta_ads_s4x" ||
    normalizedTemplateId.includes("meta")
  ) {
    return "Meta Ads";
  }

  if (
    normalizedPlatform === "google_ads" ||
    normalizedTemplateId === "google_ads_s4x" ||
    normalizedTemplateId.includes("google")
  ) {
    return "Google Ads";
  }

  return null;
}
