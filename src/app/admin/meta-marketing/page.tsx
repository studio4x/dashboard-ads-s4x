import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { MetaMarketingPanel } from "@/components/admin/MetaMarketingPanel";

export const metadata: Metadata = { title: "Meta Marketing API" };

export default async function MetaMarketingPage() {
  await requireAdmin();
  return <MetaMarketingPanel />;
}
