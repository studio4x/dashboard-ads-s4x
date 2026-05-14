import { ShareService } from "@/services/share-service";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import ExecutiveSummaryPage from "@/app/app/dashboards/[dashboardId]/executive-summary/page";
import GoogleAdsPage from "@/app/app/dashboards/[dashboardId]/google-ads/page";
import MetaAdsPage from "@/app/app/dashboards/[dashboardId]/meta-ads/page";
import ConversionsPage from "@/app/app/dashboards/[dashboardId]/conversions/page";
import AudiencePage from "@/app/app/dashboards/[dashboardId]/audience/page";
import SearchConsolePage from "@/app/app/dashboards/[dashboardId]/search-console/page";
import { SharedHeaderActions } from "./SharedHeaderActions";
import { SharedDashboardTabs } from "@/components/dashboard/SharedDashboardTabs";
import { AlertCircle } from "lucide-react";

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
      <div className="min-h-screen bg-slate-50">
        {/* Header Simples (Somente Leitura) */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                  S4X
                </div>
                <div className="hidden sm:block">
                  <span className="block text-sm font-bold text-slate-900 leading-tight">Studio 4x</span>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest">Dashboard</span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  {link?.dashboards?.clients?.name || "Cliente"}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {link?.dashboards?.name || "Dashboard"}
                </span>
              </div>
            </div>
            
            <SharedHeaderActions />
          </div>
        </header>

        {/* Abas de Navegação (Somente Leitura) */}
        <SharedDashboardTabs token={token} />

        {/* Content */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentPage === "executive-summary" && <ExecutiveSummaryPage />}
          {currentPage === "google-ads" && <GoogleAdsPage />}
          {currentPage === "meta-ads" && <MetaAdsPage />}
          {currentPage === "conversions" && <ConversionsPage />}
          {currentPage === "audience" && <AudiencePage />}
          {currentPage === "search-console" && <SearchConsolePage />}
        </main>
      </div>
    </DashboardDataProvider>
  );
}
