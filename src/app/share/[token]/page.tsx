import { ShareService } from "@/services/share-service";
import { notFound } from "next/navigation";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import ExecutiveSummaryPage from "@/app/app/dashboards/[dashboardId]/executive-summary/page";
import { SharedHeaderActions } from "./SharedHeaderActions";
import { AlertCircle } from "lucide-react";

export default async function SharedDashboardPage(
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const token = params.token;

  // Validate Token
  const validation = await ShareService.validateShareToken(token);

  if (!validation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link Indisponível</h1>
          <p className="text-slate-500">
            {validation.reason === 'expired' 
              ? 'Este link expirou.' 
              : validation.reason === 'revoked' 
                ? 'Este link foi revogado pelo administrador.'
                : 'Este link é inválido ou não existe mais.'}
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
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {link?.dashboards?.clients?.name || "Cliente"}
                </span>
                <span className="font-bold text-slate-900">
                  {link?.dashboards?.name || "Dashboard"}
                </span>
              </div>
            </div>
            
            <SharedHeaderActions />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <ExecutiveSummaryPage />
        </main>
      </div>
    </DashboardDataProvider>
  );
}
