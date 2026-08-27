import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { GoogleAdsApiPanel } from "@/components/admin/GoogleAdsApiPanel";

export const metadata: Metadata = { title: "Google Ads API" };

export default async function GoogleAdsApiPage() {
  await requireAdmin();
  return <GoogleAdsApiPanel />;
}
