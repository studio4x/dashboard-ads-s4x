"use client";

import { cn } from "@/lib/utils";
import { useDashboard } from "./DashboardDataContext";
import { AlertCircle, FileSpreadsheet, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DashboardSkeleton } from "./DashboardSkeleton";

interface DashboardPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export function DashboardPageShell({
  title,
  subtitle,
  children,
  className,
  hideHeader = false,
}: DashboardPageShellProps) {
  const { loading, error, needsImport, data, isShared } = useDashboard();

  // Loading State
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Needs Import State (Real Mode, but no data yet)
  if (needsImport) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto gap-6">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
          <FileSpreadsheet size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Nenhum dado importado</h2>
          <p className="text-slate-500 mt-2">
            Este dashboard ainda não possui dados importados para visualização.
          </p>
        </div>
        {!isShared && (
          <Link 
            href="/admin/google-sheets"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Ir para Área Admin
            <ExternalLink size={16} />
          </Link>
        )}
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto gap-4">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Erro ao carregar dados</h2>
          <p className="text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // Empty State for Period
  if (data && data.overview && data.overview.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto gap-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sem dados neste período</h2>
          <p className="text-slate-500 mt-2">
            Não encontramos registros para o intervalo selecionado. Tente escolher um período diferente ou verifique a última importação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6 flex flex-col gap-6 animate-fade-in", className)}>
      {!hideHeader && (
        <div className="flex justify-between items-start">
          <div>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{subtitle}</p>
            )}
          </div>
          
          {/* Indicador de fonte de dados */}
          {data && (
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                data.source === "mock" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
              )}>
                {data.source === "mock" ? "Ambiente de Teste (Mock)" : "Dados Reais (Google Sheets)"}
              </span>
              {data.lastUpdated && (
                <span className="text-[10px] text-slate-400">
                  Atualizado em: {data.lastUpdated}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
