import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsPerformanceAnalysis } from "@/components/admin/GoogleAdsPerformanceAnalysis";
import { GoogleAdsPerformancePortuguese } from "@/components/admin/GoogleAdsPerformancePortuguese";
import { GoogleAdsActionProgressEnhancer } from "@/components/admin/GoogleAdsActionProgressEnhancer";
import {
  GoogleAdsClientSummary,
  GoogleAdsClientSummarySkeleton,
} from "@/components/admin/GoogleAdsClientSummary";

export const metadata: Metadata = { title: "Análise Google Ads" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const from = single(query.from);
  const to = single(query.to);

  return (
    <div data-google-ads-performance-page="true">
      <GoogleAdsPerformancePortuguese />
      <GoogleAdsPerformanceAnalysis
        sourceId={sourceId}
        from={from}
        to={to}
      />
      <GoogleAdsActionProgressEnhancer sourceId={sourceId} />
      <div
        style={{
          maxWidth: 1440,
          width: "100%",
          margin: "-8px auto 0",
          padding: "0 clamp(14px, 3vw, 32px)",
        }}
      >
        <Suspense fallback={<GoogleAdsClientSummarySkeleton />}>
          <GoogleAdsClientSummary sourceId={sourceId} from={from} to={to} />
        </Suspense>
      </div>
    </div>
  );
}
