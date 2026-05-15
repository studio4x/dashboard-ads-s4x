import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function CampaignsPage() {
  return (
    <DashboardPageShell title="Campanhas" subtitle="Performance por campanha">
      <TemplateEmptyState 
        title="Análise de Campanhas"
        description="A visualização detalhada de campanhas requer a importação de dados no modelo Google Ads S4X."
      />
    </DashboardPageShell>
  );
}
