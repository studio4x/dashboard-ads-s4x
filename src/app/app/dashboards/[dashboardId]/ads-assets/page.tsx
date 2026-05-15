import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function AdsAssetsPage() {
  return (
    <DashboardPageShell title="Anúncios e Recursos" subtitle="Performance dos criativos">
      <TemplateEmptyState 
        title="Anúncios e Recursos"
        description="A visualização detalhada de anúncios e recursos requer a importação de dados no modelo Google Ads S4X."
      />
    </DashboardPageShell>
  );
}
