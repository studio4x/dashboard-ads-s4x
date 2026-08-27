export type DashboardSourceCandidate = {
  id: string;
  type: string;
  status: string;
  sourceRole?: string | null;
  lastImportStatus?: string | null;
};

function valid(candidate: DashboardSourceCandidate) {
  return candidate.status === "active" && String(candidate.lastImportStatus || "").startsWith("success");
}

function role(candidate: DashboardSourceCandidate) {
  if (candidate.type === "google_ads") return "google_ads";
  if (candidate.type === "meta_ads") return "meta_ads";
  return candidate.sourceRole || null;
}

function chooseRole(candidates: DashboardSourceCandidate[], wantedRole: "google_ads" | "meta_ads") {
  const nativeType = wantedRole === "google_ads" ? "google_ads" : "meta_ads";
  return candidates.find((candidate) => candidate.type === nativeType && valid(candidate))
    || candidates.find((candidate) => candidate.type === "google_sheets" && role(candidate) === wantedRole && valid(candidate))
    || candidates.find((candidate) => candidate.type === "google_sheets" && role(candidate) === wantedRole && candidate.status === "active")
    || null;
}

export function selectPreferredSnapshotSourceIds(
  templateId: string,
  candidates: DashboardSourceCandidate[],
  configuredSourceId?: string | null,
) {
  if (templateId === "google_meta_ads_s4x") {
    const selected = [chooseRole(candidates, "google_ads"), chooseRole(candidates, "meta_ads")]
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
