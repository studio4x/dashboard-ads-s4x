export type AnalysisPdfShareLink = {
  id: string;
  expires_at?: string | null;
};

export function getUsableAnalysisPdfLinks(
  links: AnalysisPdfShareLink[],
  now = new Date()
) {
  return links.filter((link) => !link.expires_at || new Date(link.expires_at) >= now);
}

export async function findAvailableAnalysisPdf<T>(
  links: AnalysisPdfShareLink[],
  loadPdf: (shareLinkId: string) => Promise<T | null>
) {
  for (const link of links) {
    const result = await loadPdf(String(link.id));
    if (result) return result;
  }

  return null;
}
