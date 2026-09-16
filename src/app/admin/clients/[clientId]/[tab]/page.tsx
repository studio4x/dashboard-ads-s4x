import { notFound } from "next/navigation";
import { ClientPageContent } from "../ClientPageContent";
import { CLIENT_PAGE_TABS, type ClientPageTab } from "@/components/admin/ClientPageTabs";

export default async function ClientTabPage({
  params,
}: {
  params: Promise<{ clientId: string; tab: string }>;
}) {
  const { clientId, tab } = await params;
  const isValidTab = CLIENT_PAGE_TABS.some((item) => item.slug === tab);

  if (!isValidTab) {
    notFound();
  }

  return <ClientPageContent clientId={clientId} activeTab={tab as ClientPageTab} />;
}
