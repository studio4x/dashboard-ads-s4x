import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsPerformanceAnalysis } from "@/components/admin/GoogleAdsPerformanceAnalysis";

export const metadata: Metadata = { title: "Análise Google Ads" };

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GoogleAdsAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { sourceId } = await params;
  const query = await searchParams;
  await requireAdmin();

  return (
    <GoogleAdsPerformanceAnalysis
      sourceId={sourceId}
      from={single(query.from)}
      to={single(query.to)}
    />
  );
}
