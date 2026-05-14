import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ dashboardId: string }>;
}

export default async function DashboardIndexPage({ params }: Props) {
  const { dashboardId } = await params;
  redirect(`/app/dashboards/${dashboardId}/executive-summary`);
}
