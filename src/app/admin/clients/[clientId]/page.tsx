import { redirect } from "next/navigation";

export default async function ClientHubRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/admin/clients/${clientId}/visao-geral`);
}
