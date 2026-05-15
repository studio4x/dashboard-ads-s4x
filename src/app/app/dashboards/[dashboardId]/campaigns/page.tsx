import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { Hammer } from "lucide-react";

export default function CampaignsPage() {
  return (
    <DashboardPageShell title="Campanhas" subtitle="Performance por campanha">
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 min-h-[300px] text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Hammer size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Em desenvolvimento</h2>
        <p className="text-slate-500 mt-2 max-w-sm">
          A visualização detalhada de campanhas será disponibilizada na próxima atualização da plataforma.
        </p>
      </div>
    </DashboardPageShell>
  );
}
