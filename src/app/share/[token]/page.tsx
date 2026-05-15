import { ShareService } from "@/services/share-service";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import ExecutiveSummaryPage from "@/app/app/dashboards/[dashboardId]/executive-summary/page";
import GoogleAdsPage from "@/app/app/dashboards/[dashboardId]/google-ads/page";
import MetaAdsPage from "@/app/app/dashboards/[dashboardId]/meta-ads/page";
import ConversionsPage from "@/app/app/dashboards/[dashboardId]/conversions/page";
import AudiencePage from "@/app/app/dashboards/[dashboardId]/audience/page";
import SearchConsolePage from "@/app/app/dashboards/[dashboardId]/search-console/page";
import CampaignsPage from "@/app/app/dashboards/[dashboardId]/campaigns/page";
import AdGroupsPage from "@/app/app/dashboards/[dashboardId]/ad-groups/page";
import KeywordsPage from "@/app/app/dashboards/[dashboardId]/keywords/page";
import SearchTermsPage from "@/app/app/dashboards/[dashboardId]/search-terms/page";
import AdsAssetsPage from "@/app/app/dashboards/[dashboardId]/ads-assets/page";
import NegativeKeywordsPage from "@/app/app/dashboards/[dashboardId]/negative-keywords/page";
import { SharedDashboardHeader } from "@/components/dashboard/SharedDashboardHeader";
import { SharedDashboardFooter } from "@/components/dashboard/SharedDashboardFooter";
import { SharedDashboardTabs } from "@/components/dashboard/SharedDashboardTabs";
import { AlertCircle } from "lucide-react";

const pageTitles: Record<string, string> = {
  "executive-summary": "Resumo Executivo",
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  "conversions": "Conversões",
  "audience": "Público e Canais",
  "search-console": "Google Search Console",
  "campaigns": "Campanhas",
  "ad-groups": "Grupos de Anúncios",
  "keywords": "Palavras-chave",
  "search-terms": "Termos de Pesquisa",
  "ads-assets": "Recursos de Anúncio",
  "negative-keywords": "Palavras-Chave Negativas",
};

export default async function SharedDashboardPage(
  props: { 
    params: Promise<{ token: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const token = params.token;
  const currentPage = (searchParams?.page as string) || "executive-summary";

  // Validate Token
  const validation = await ShareService.validateShareToken(token);

  if (!validation.isValid) {
    // ... (Keep existing validation UI)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {validation.reason === 'expired' ? 'Link Expirado' : validation.reason === 'revoked' ? 'Link Revogado' : 'Link Inválido'}
          </h1>
          <p className="text-slate-500">
            {validation.reason === 'expired' 
              ? 'Este link não está mais disponível. Por favor, solicite um novo link ao administrador.' 
              : validation.reason === 'revoked' 
                ? 'Este link foi desativado pelo administrador. Solicite um novo acesso.'
                : 'Este link não existe ou foi digitado incorretamente. Verifique a URL e tente novamente.'}
          </p>
        </div>
      </div>
    );
  }

  const { link } = validation;

  // Registrar acesso de forma assíncrona
  if (link?.id) {
    ShareService.registerShareAccess(link.id).catch(console.error);
  }

  return (
    <DashboardDataProvider overrideDashboardId={link?.dashboard_id} shareToken={token}>
      <div className="min-h-screen bg-[#F7F9FC]">
        {/* Header Executivo (Fase 6.5) */}
        <SharedDashboardHeader 
          clientName={link?.dashboards?.clients?.name}
          dashboardName={link?.dashboards?.name}
          pageTitle={pageTitles[currentPage] || "Dashboard"}
          pageSubtitle="Relatório de desempenho de tráfego pago e inteligência de dados"
        />

        {/* Navegação Compacta */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <SharedDashboardTabs token={token} />
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentPage === "executive-summary" && <ExecutiveSummaryPage />}
          {currentPage === "google-ads" && <GoogleAdsPage />}
          {currentPage === "meta-ads" && <MetaAdsPage />}
          {currentPage === "conversions" && <ConversionsPage />}
          {currentPage === "audience" && <AudiencePage />}
          {currentPage === "search-console" && <SearchConsolePage />}
          {currentPage === "campaigns" && <CampaignsPage />}
          {currentPage === "ad-groups" && <AdGroupsPage />}
          {currentPage === "keywords" && <KeywordsPage />}
          {currentPage === "search-terms" && <SearchTermsPage />}
          {currentPage === "ads-assets" && <AdsAssetsPage />}
          {currentPage === "negative-keywords" && <NegativeKeywordsPage />}
        </main>

        {/* Rodapé Executivo */}
        <SharedDashboardFooter />
      </div>
    </DashboardDataProvider>
  );
}
