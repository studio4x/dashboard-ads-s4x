import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function SearchTermsPage() {
  return (
    <DashboardPageShell title="Termos de Pesquisa" subtitle="O que os usuários pesquisaram">
      <TemplateEmptyState 
        title="Termos de Pesquisa"
        description="A visualização detalhada de termos de pesquisa requer a importação de dados no modelo Google Ads S4X."
      />
    </DashboardPageShell>
  );
}
