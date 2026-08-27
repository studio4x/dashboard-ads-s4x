export function shouldSync(syncInterval: string | null | undefined, lastImportAtStr: string | null | undefined) {
  if (syncInterval === "manual") return false;
  if (!lastImportAtStr) return true;
  const lastImportAt = new Date(lastImportAtStr);
  if (Number.isNaN(lastImportAt.getTime())) return true;
  const diffHours = (Date.now() - lastImportAt.getTime()) / (1000 * 60 * 60);
  switch (syncInterval) {
    case "one_hour": return diffHours >= 0.92;
    case "six_hours": return diffHours >= 5.8;
    case "twelve_hours": return diffHours >= 11.8;
    case "weekly": return diffHours >= 24 * 7 - 1;
    case "daily":
    default: return diffHours >= 23;
  }
}
