"use client";

import React from "react";
import { FileSpreadsheet, Info, Hammer } from "lucide-react";
import { useDashboard } from "./DashboardDataContext";

interface TemplateEmptyStateProps {
  title?: string;
  description?: string;
}

export function TemplateEmptyState({ 
  title = "Aguardando dados reais", 
  description 
}: TemplateEmptyStateProps) {
  const { data } = useDashboard();
  
  const isMock = data?.source === "mock";
  const templateId = data?.templateId;

  const defaultDescription = isMock 
    ? "Você está visualizando dados de demonstração. Conecte uma planilha Google Ads S4X para ver dados reais nesta seção."
    : `Esta seção requer uma planilha no modelo ${templateId === 'google_ads_s4x' ? 'Google Ads S4X' : 'específico do template'}.`;

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[400px] text-center animate-fade-in shadow-sm">
      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
        {isMock ? <Hammer size={40} /> : <FileSpreadsheet size={40} />}
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-slate-500 mt-3 max-w-md leading-relaxed">
        {description || defaultDescription}
      </p>
      
      {!isMock && (
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3 text-left max-w-sm">
          <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            <strong>Dica do Admin:</strong> Se você já conectou a planilha, verifique se a aba correspondente existe e se a última importação não teve erros críticos.
          </p>
        </div>
      )}
    </div>
  );
}
