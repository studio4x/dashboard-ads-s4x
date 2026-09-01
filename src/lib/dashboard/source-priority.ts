export type DashboardSourceCandidate = {
  id: string;
  type: string;
  status: string;
  sourceRole?: string | null;
  lastImportStatus?: string | null;
};

export type DashboardPlatformSourceIds = {
  googleAdsSourceId?: string | null;
  metaAdsSourceId?: string | null;
};

function valid(candidate: DashboardSourceCandidate) {
  return candidate.status === "active" && String(candidate.lastImportStatus || "").startsWith("success");
}

export function getDashboardSourceRole(candidate: Pick<DashboardSourceCandidate, "type" | "sourceRole">) {
  if (candidate.type === "google_ads") return "google_ads";
  if (candidate.type === "meta_ads") return "meta_ads";
  return candidate.sourceRole || null;
}

function chooseRole(candidates: DashboardSourceCandidate[], wantedRole: "google_ads" | "meta_ads") {
  const nativeType = wantedRole === "google_ads" ? "google_ads" : "meta_ads";
  return candidates.find((candidate) => candidate.type === nativeType && valid(candidate))
    || candidates.find((candidate) => candidate.type === "google_sheets" && getDashboardSourceRole(candidate) === wantedRole && valid(candidate))
    || candidates.find((candidate) => candidate.type === "google_sheets" && getDashboardSourceRole(candidate) === wantedRole && candidate.status === "active")
    || null;
}

function chooseConfiguredRole(
  candidates: DashboardSourceCandidate[],
  sourceId: string | null | undefined,
  wantedRole: "google_ads" | "meta_ads",
) {
  if (!sourceId) return null;
  return candidates.find((candidate) => (
    candidate.id === sourceId
    && candidate.status === "active"
    && getDashboardSourceRole(candidate) === wantedRole
  )) || null;
}

export function selectPreferredSnapshotSourceIds(
  templateId: string,
  candidates: DashboardSourceCandidate[],
  configuredSourceId?: string | null,
  configuredPlatformSources?: DashboardPlatformSourceIds,
) {
  if (templateId === "google_meta_ads_s4x") {
    const selected = [
      chooseConfiguredRole(candidates, configuredPlatformSources?.googleAdsSourceId, "google_ads")
        || chooseRole(candidates, "google_ads"),
      chooseConfiguredRole(candidates, configuredPlatformSources?.metaAdsSourceId, "meta_ads")
        || chooseRole(candidates, "meta_ads"),
    ]
      .filter((candidate): candidate is DashboardSourceCandidate => Boolean(candidate));
    return Array.from(new Set(selected.map((candidate) => candidate.id)));
  }

  const wantedRole = templateId.includes("meta") ? "meta_ads" : "google_ads";
  const preferred = chooseRole(candidates, wantedRole);
  if (preferred) return [preferred.id];
  const configured = candidates.find((candidate) => candidate.id === configuredSourceId && candidate.status === "active");
  if (configured) return [configured.id];
  const fallback = candidates.find((candidate) => candidate.status === "active");
  return fallback ? [fallback.id] : [];
}

export function shouldPreferNativeOverSheet(
  sourceRole: "google_ads" | "meta_ads",
  candidates: DashboardSourceCandidate[],
) {
  const nativeType = sourceRole === "google_ads" ? "google_ads" : "meta_ads";
  return candidates.some((candidate) => candidate.type === nativeType && valid(candidate));
}
