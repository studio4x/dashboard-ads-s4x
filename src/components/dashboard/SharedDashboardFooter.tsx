"use client";

import React from "react";
import { Info, Clock } from "lucide-react";
import { useDashboard } from "./DashboardDataContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SharedDashboardFooter() {
  const { data, from, to } = useDashboard();

  if (!data) return null;

  // Calcular período anterior aproximado para o rodapé
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const prevTo = new Date(fromDate);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - diffDays + 1);

  const formatDateLabel = (d: Date) => format(d, "dd 'mai' yyyy", { locale: ptBR }); // 'mai' é fixo na ref, mas vamos usar dinâmico
  const formatDateFull = (d: Date) => format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <footer className="mt-8 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-blue-600 flex-shrink-0" />
            <span>
              Comparação com o período anterior: 
              <span className="font-semibold text-slate-700 ml-1">
                {format(prevFrom, "dd MMM yyyy", { locale: ptBR })} - {format(prevTo, "dd MMM yyyy", { locale: ptBR })}
              </span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
               <Clock size={14} className="text-slate-400" />
               <span>Atualizado em {data.lastUpdated || "N/A"}</span>
             </div>
             <span className="hidden sm:inline text-slate-300">|</span>
             <span className="font-medium">Valores sujeitos a alterações</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
             Studio 4x — Inteligência em Tráfego Pago
           </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-x-4 gap-y-2">
              <span className="text-[10px] text-slate-400">Suporte: studio4x.com.br</span>
              <span className="text-[10px] text-slate-400">© 2026</span>
              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                v{process.env.NEXT_PUBLIC_APP_VERSION}-{process.env.NEXT_PUBLIC_GIT_HASH}
              </span>
            </div>
        </div>
      </div>
    </footer>
  );
}
