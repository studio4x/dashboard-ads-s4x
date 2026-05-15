import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";

export default function KeywordsPage() {
  return (
    <DashboardPageShell title="Palavras-chave" subtitle="Termos com melhor performance">
      <TemplateEmptyState 
        title="Análise de Palavras-Chave"
        description="A visualização detalhada de palavras-chave requer a importação de dados no modelo Google Ads S4X."
      />
    </DashboardPageShell>
  );
}
