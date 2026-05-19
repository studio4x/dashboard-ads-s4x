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
  headerActions?: React.ReactNode;
}

export function DashboardPageShell({
  title,
  subtitle,
  children,
  className,
  hideHeader = false,
  headerActions,
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
  const hasNoPerformanceData = (!data?.overview || data.overview.length === 0) && 
                              (!data?.dailyPerformance || data.dailyPerformance.length === 0);

  if (data && hasNoPerformanceData) {
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
    <div 
      className={cn("animate-fade-in", className)}
      style={{
        padding: "24px 24px 40px",
        maxWidth: "1440px",
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}
    >
      {!hideHeader && (
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-1"
          style={{ width: "100%" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
                {title}
              </h1>
              {subtitle && (
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {headerActions}
              </div>
            )}
          </div>
          
          {/* Indicador de fonte de dados */}
          {data && (
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                data.source === "mock" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
              )}>
                {data.source === "mock" ? "Ambiente de Teste (Mock)" : "Dados Reais (Google Sheets)"}
              </span>
              {data.lastUpdated && (
                <span className="text-[10px] text-slate-400 font-medium">
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
